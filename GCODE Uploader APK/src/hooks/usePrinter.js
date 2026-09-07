import { useState, useRef, useCallback, useEffect } from 'react';
import { PrinterConnection } from '../lib/serial';
import { getProfileById } from '../lib/printers';

export function usePrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [hotendTemp, setHotendTemp] = useState(0);
  const [hotendTarget, setHotendTarget] = useState(0);
  const [bedTemp, setBedTemp] = useState(0);
  const [bedTarget, setBedTarget] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);
  
  const [activeProfileId, setActiveProfileId] = useState('custom');
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [liveEta, setLiveEta] = useState(null);
  const printStartTimeRef = useRef(null);
  
  const [isPrintingState, setIsPrintingState] = useState(false);
  const isPrintingRef = useRef(false);
  
  const totalCopiesRef = useRef(1);
  const completedCopiesRef = useRef(0);
  const [totalCopies, setTotalCopies] = useState(1);
  const [completedCopies, setCompletedCopies] = useState(0);
  const [isWaitingForClear, setIsWaitingForClear] = useState(false);
  
  const setIsPrinting = useCallback((val) => {
    isPrintingRef.current = val;
    setIsPrintingState(val);
  }, []);

  const [printProgress, setPrintProgress] = useState(0);
  
  const connectionRef = useRef(null);
  const commandQueueRef = useRef([]);
  const isWaitingForOkRef = useRef(false);
  const pollIntervalRef = useRef(null);
  
  // For file printing
  const gcodeLinesRef = useRef([]);
  const printIndexRef = useRef(0);

  const addLog = useCallback((log) => {
    setTerminalLogs(prev => [...prev.slice(-99), log]);
  }, []);

  const processQueue = useCallback(async () => {
    if (!connectionRef.current || isWaitingForOkRef.current) return;
    
    if (commandQueueRef.current.length > 0) {
      const cmd = commandQueueRef.current.shift();
      isWaitingForOkRef.current = true;
      addLog(`> ${cmd}`);
      await connectionRef.current.write(cmd);
    } else if (isPrintingRef.current) {
      if (printIndexRef.current >= gcodeLinesRef.current.length) {
        addLog(`--- Copy ${completedCopiesRef.current + 1} Complete ---`);
        
        completedCopiesRef.current++;
        setCompletedCopies(completedCopiesRef.current);

        if (completedCopiesRef.current < totalCopiesRef.current) {
          setIsPrinting(false);
          setIsWaitingForClear(true);
          setPrintProgress(100);
          return;
        }

        setIsPrinting(false);
        gcodeLinesRef.current = [];
        printIndexRef.current = 0;
        setPrintProgress(0);
        setLiveEta(null);
        printStartTimeRef.current = null;
        totalCopiesRef.current = 1;
        completedCopiesRef.current = 0;
        setTotalCopies(1);
        setCompletedCopies(0);
        setIsWaitingForClear(false);
        return;
      }

      let cmd = gcodeLinesRef.current[printIndexRef.current].trim();
      printIndexRef.current++;
      
      // Update progress periodically or on completion
      setPrintProgress((printIndexRef.current / gcodeLinesRef.current.length) * 100);
      
      if (printIndexRef.current % 10 === 0 && printStartTimeRef.current) {
        const elapsed = Date.now() - printStartTimeRef.current;
        const msPerLine = elapsed / printIndexRef.current;
        const linesRemaining = gcodeLinesRef.current.length - printIndexRef.current;
        const msRemaining = msPerLine * linesRemaining;
        if (msRemaining > 0 && msRemaining < 86400000) { // sanity check < 24h
          const h = Math.floor(msRemaining / 3600000);
          const m = Math.floor((msRemaining % 3600000) / 60000);
          const s = Math.floor((msRemaining % 60000) / 1000);
          setLiveEta(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
        }
      }
      
      // Skip empty lines or pure comments, but we still need to process next
      if (!cmd || cmd.startsWith(';')) {
        setTimeout(processQueue, 0);
        return;
      }
      
      // Strip inline comments
      if (cmd.includes(';')) {
        cmd = cmd.split(';')[0].trim();
      }
      
      isWaitingForOkRef.current = true;
      addLog(`> ${cmd}`);
      await connectionRef.current.write(cmd);
    }
  }, [addLog, setIsPrinting]);

  const handleData = useCallback((line) => {
    addLog(`< ${line}`);
    
    // Parse temperatures: ok T:200.0 /200.0 B:60.0 /60.0 @:127 B@:127
    if (line.includes('T:')) {
      const tMatch = line.match(/T:([\d.]+) \/([\d.]+)/);
      if (tMatch) {
        setHotendTemp(parseFloat(tMatch[1]));
        setHotendTarget(parseFloat(tMatch[2]));
      }
      const bMatch = line.match(/B:([\d.]+) \/([\d.]+)/);
      if (bMatch) {
        setBedTemp(parseFloat(bMatch[1]));
        setBedTarget(parseFloat(bMatch[2]));
      }
    }

    if (line.startsWith('ok')) {
      isWaitingForOkRef.current = false;
      processQueue();
    }
  }, [addLog, processQueue]);

  const sendCommand = useCallback((cmd) => {
    commandQueueRef.current.push(cmd);
    processQueue();
  }, [processQueue]);

  const connect = async (baudRate) => {
    const conn = new PrinterConnection(handleData, () => {
      setIsConnected(false);
      clearInterval(pollIntervalRef.current);
    });
    
    const success = await conn.connect(baudRate);
    if (success) {
      connectionRef.current = conn;
      setIsConnected(true);
      addLog("--- Connected ---");
      
      // Start temperature polling
      sendCommand("M105");
      pollIntervalRef.current = setInterval(() => {
        // Only push M105 if we aren't printing rapidly to avoid clogging
        // Actually, queueing M105 is fine.
        sendCommand("M105");
      }, 5000); 
    }
  };

  const disconnect = async () => {
    if (connectionRef.current) {
      clearInterval(pollIntervalRef.current);
      await connectionRef.current.disconnect();
      connectionRef.current = null;
      setIsConnected(false);
      addLog("--- Disconnected ---");
    }
  };

  const startPrint = (gcodeString, copies = 1) => {
    const lines = gcodeString.split('\n');
    gcodeLinesRef.current = lines;
    printIndexRef.current = 0;
    printStartTimeRef.current = Date.now();
    totalCopiesRef.current = copies;
    completedCopiesRef.current = 0;
    setTotalCopies(copies);
    setCompletedCopies(0);
    setIsWaitingForClear(false);
    setLiveEta("Calculating...");
    setIsPrinting(true);
    setPrintProgress(0);
    // Kickoff process queue
    setTimeout(() => {
        isWaitingForOkRef.current = false;
        processQueue();
    }, 100);
  };
  
  const continueNextCopy = () => {
    printIndexRef.current = 0;
    printStartTimeRef.current = Date.now();
    setIsWaitingForClear(false);
    setLiveEta("Calculating...");
    setIsPrinting(true);
    setPrintProgress(0);
    setTimeout(() => {
        isWaitingForOkRef.current = false;
        processQueue();
    }, 100);
  };

  const pausePrint = () => {
    setIsPrinting(false);
  };

  const resumePrint = () => {
    setIsPrinting(true);
    // ensure queue restarts
    setTimeout(() => {
        processQueue();
    }, 100);
  };

  const stopPrint = () => {
    setIsPrinting(false);
    gcodeLinesRef.current = [];
    printIndexRef.current = 0;
    setPrintProgress(0);
    setLiveEta(null);
    printStartTimeRef.current = null;
    totalCopiesRef.current = 1;
    completedCopiesRef.current = 0;
    setTotalCopies(1);
    setCompletedCopies(0);
    setIsWaitingForClear(false);
  };

  return {
    isConnected,
    hotendTemp,
    hotendTarget,
    bedTemp,
    bedTarget,
    terminalLogs,
    activeProfileId,
    setActiveProfileId,
    estimatedTime,
    setEstimatedTime,
    liveEta,
    connect,
    disconnect,
    sendCommand,
    isPrinting: isPrintingState,
    printProgress,
    startPrint,
    pausePrint,
    resumePrint,
    stopPrint,
    continueNextCopy,
    totalCopies,
    completedCopies,
    isWaitingForClear
  };
}
