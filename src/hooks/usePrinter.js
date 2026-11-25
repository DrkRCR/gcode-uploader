import { useState, useRef, useCallback, useEffect } from 'react';
import { PrinterConnection } from '../lib/serial';
import { getProfileById } from '../lib/printers';
import { sendPrinterBeep, triggerFilamentChangeAlert, playBrowserTone, playPrinterMelody, playBrowserMelody, MELODIES } from '../lib/beeper';
import { dispatchPrintNotification } from '../lib/notifications';
import { 
  saveRecoverySnapshot, 
  getRecoveryMeta, 
  getRecoveryGcode, 
  clearRecoverySnapshot, 
  buildRecoveryGcode 
} from '../lib/recoveryStorage';

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

  // Multi-Filament & Beeper Control State
  const [isFilamentChangePause, setIsFilamentChangePause] = useState(false);
  const isFilamentChangePauseRef = useRef(false);
  const [currentFilamentChange, setCurrentFilamentChange] = useState(null);
  const [filamentChangesList, setFilamentChangesList] = useState([]);
  const filamentChangesListRef = useRef([]);
  const currentChangeIndexRef = useRef(0);

  const [autoPauseFilament, setAutoPauseFilament] = useState(true);
  const autoPauseFilamentRef = useRef(true);
  const [beepOnFilament, setBeepOnFilament] = useState(true);
  const beepOnFilamentRef = useRef(true);
  const [soundAlertFilament, setSoundAlertFilament] = useState(true);
  const soundAlertFilamentRef = useRef(true);

  // Smart Park & Anti-Ooze Wipe State
  const [smartPark, setSmartPark] = useState(true);
  const smartParkRef = useRef(true);
  const isParkedRef = useRef(false);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const currentZRef = useRef(0);
  const activeFileNameRef = useRef('model.gcode');

  // Interrupted Print Detection ("Save My Print")
  const [interruptedJob, setInterruptedJob] = useState(() => getRecoveryMeta());

  useEffect(() => { smartParkRef.current = smartPark; }, [smartPark]);

  // Selected Song Melody for Filament Changes
  const [selectedMelody, setSelectedMelodyState] = useState(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('filamentMelody')) || 'cheques';
  });
  const selectedMelodyRef = useRef(selectedMelody);

  const setSelectedMelody = useCallback((key) => {
    setSelectedMelodyState(key);
    selectedMelodyRef.current = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('filamentMelody', key);
    }
  }, []);

  // Sync refs with state
  useEffect(() => { autoPauseFilamentRef.current = autoPauseFilament; }, [autoPauseFilament]);
  useEffect(() => { beepOnFilamentRef.current = beepOnFilament; }, [beepOnFilament]);
  useEffect(() => { soundAlertFilamentRef.current = soundAlertFilament; }, [soundAlertFilament]);

  const setIsPrinting = useCallback((val) => {
    isPrintingRef.current = val;
    setIsPrintingState(val);
  }, []);

  const [printProgress, setPrintProgress] = useState(0);
  
  const connectionRef = useRef(null);
  const commandQueueRef = useRef([]);
  const isWaitingForOkRef = useRef(false);
  const pollIntervalRef = useRef(null);
  
  // For file printing & 2D Layer Visualizer
  const gcodeLinesRef = useRef([]);
  const printIndexRef = useRef(0);
  const [activeGcodeLines, setActiveGcodeLines] = useState([]);
  const [currentPrintIndex, setCurrentPrintIndex] = useState(0);

  const setPreviewGcode = useCallback((gcodeString) => {
    if (!gcodeString) {
      setActiveGcodeLines([]);
      return;
    }
    const lines = typeof gcodeString === 'string' ? gcodeString.split('\n') : gcodeString;
    setActiveGcodeLines(lines);
  }, []);

  const addLog = useCallback((log) => {
    setTerminalLogs(prev => [...prev.slice(-99), log]);
  }, []);

  const processQueue = useCallback(async () => {
    if (!connectionRef.current || isWaitingForOkRef.current) return;
    
    if (commandQueueRef.current.length > 0) {
      const cmd = commandQueueRef.current.shift();
      isWaitingForOkRef.current = true;
      if (!cmd.startsWith('M105')) addLog(`> ${cmd}`);
      await connectionRef.current.write(cmd);
      return;
    } 
    
    if (isPrintingRef.current) {
      while (printIndexRef.current < gcodeLinesRef.current.length) {
        let cmd = gcodeLinesRef.current[printIndexRef.current].trim();
        const currentLineIndex = printIndexRef.current;
        printIndexRef.current++;
        
        // Strip inline comments
        if (cmd.includes(';')) {
          cmd = cmd.split(';')[0].trim();
        }
        
        // Skip empty lines or pure comments synchronously
        if (!cmd) {
          continue;
        }

        // Check for Filament Change / Pause triggers
        const upperCmd = cmd.toUpperCase();
        if (upperCmd.startsWith('G0') || upperCmd.startsWith('G1')) {
          const xMatch = cmd.match(/X([\d.]+)/i);
          const yMatch = cmd.match(/Y([\d.]+)/i);
          const zMatch = cmd.match(/Z([\d.]+)/i);
          if (xMatch) currentXRef.current = parseFloat(xMatch[1]);
          if (yMatch) currentYRef.current = parseFloat(yMatch[1]);
          if (zMatch) currentZRef.current = parseFloat(zMatch[1]);
        }

        const isPauseCmd = upperCmd === 'M600' || upperCmd.startsWith('M600 ') ||
                           upperCmd === 'M0' || upperCmd.startsWith('M0 ') ||
                           upperCmd === 'M1' || upperCmd.startsWith('M1 ') ||
                           upperCmd === 'M25' || upperCmd === 'PAUSE';

        const registeredChange = filamentChangesListRef.current?.find(
          c => Math.abs(c.lineIndex - currentLineIndex) <= 1
        );

        if ((isPauseCmd || registeredChange) && autoPauseFilamentRef.current) {
          const changeInfo = registeredChange || {
            id: currentChangeIndexRef.current + 1,
            description: `Filament change at line ${currentLineIndex + 1}`,
            command: cmd,
            layer: 'N/A',
            z: currentZRef.current > 0 ? currentZRef.current.toFixed(2) : 'N/A'
          };

          currentChangeIndexRef.current++;
          isFilamentChangePauseRef.current = true;
          setIsFilamentChangePause(true);
          setCurrentFilamentChange(changeInfo);
          setIsPrinting(false);

          addLog(`[FILAMENT CHANGE] Paused: ${changeInfo.description || cmd}. Swap filament & click Resume.`);

          // Trigger Smart Park (lifts Z 3mm and parks in safe corner)
          executeSmartPark();

          // Trigger Beeper & Audio notification with selected song melody
          if (beepOnFilamentRef.current || soundAlertFilamentRef.current) {
            triggerFilamentChangeAlert(
              beepOnFilamentRef.current ? (c) => connectionRef.current?.write(c) : null,
              { 
                melodyKey: selectedMelodyRef.current,
                printerBeeper: beepOnFilamentRef.current,
                browserSound: soundAlertFilamentRef.current 
              }
            );
          }

          // Trigger Mobile Push & Webhook (Discord / Telegram) notification
          dispatchPrintNotification('filament_change', {
            z: changeInfo.z,
            layer: changeInfo.layer
          });

          return;
        }

        // Throttle React state updates (UI) & Save Crash Recovery Checkpoint
        if (printIndexRef.current % 100 === 0) {
          setPrintProgress((printIndexRef.current / gcodeLinesRef.current.length) * 100);
          setCurrentPrintIndex(printIndexRef.current);

          // Update Crash Recovery metadata checkpoint
          saveRecoverySnapshot({
            fileName: activeFileNameRef.current,
            printIndex: printIndexRef.current,
            totalLines: gcodeLinesRef.current.length,
            lastX: currentXRef.current,
            lastY: currentYRef.current,
            lastZ: currentZRef.current,
            hotendTarget,
            bedTarget,
            timestamp: Date.now()
          }, null);
          
          if (printStartTimeRef.current) {
            let msRemaining = 0;
            if (totalPrintSecondsRef.current) {
              const progressRatio = printIndexRef.current / gcodeLinesRef.current.length;
              msRemaining = (totalPrintSecondsRef.current * 1000) * (1 - progressRatio);
            } else {
              const elapsed = Date.now() - printStartTimeRef.current;
              const msPerLine = elapsed / printIndexRef.current;
              const linesRemaining = gcodeLinesRef.current.length - printIndexRef.current;
              msRemaining = msPerLine * linesRemaining;
            }

            if (msRemaining > 0 && msRemaining < 86400000) { 
              const h = Math.floor(msRemaining / 3600000);
              const m = Math.floor((msRemaining % 3600000) / 60000);
              const s = Math.floor((msRemaining % 60000) / 1000);
              setLiveEta(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
            }
          }
        }
        
        isWaitingForOkRef.current = true;
        await connectionRef.current.write(cmd);
        return;
      }

      // If loop finishes, print is complete
      if (printIndexRef.current >= gcodeLinesRef.current.length) {
        addLog(`--- Copy ${completedCopiesRef.current + 1} Complete ---`);
        
        // Dispatch mobile push / webhook notification
        dispatchPrintNotification('print_complete', {
          fileName: `Print Copy ${completedCopiesRef.current + 1}`
        });

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
        setIsFilamentChangePause(false);
        setCurrentFilamentChange(null);
        setFilamentChangesList([]);
      }
    }
  }, [addLog, setIsPrinting]);

  const handleData = useCallback((line) => {
    // Only log if not just an 'ok' or temperature report, to prevent React from thrashing
    if (!line.startsWith('ok') && !line.startsWith('T:')) {
      addLog(`< ${line}`);
    }
    
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

  // Smart Park & Anti-Ooze Wipe actions
  const executeSmartPark = useCallback(() => {
    if (!smartParkRef.current || isParkedRef.current) return;
    isParkedRef.current = true;
    addLog(`> Smart Park: Lifting Z 3mm, anti-ooze retract 2mm, parking at X10 Y10`);
    commandQueueRef.current.push('G91');
    commandQueueRef.current.push('G1 E-2 F1800'); // Anti-ooze retract
    commandQueueRef.current.push('G1 Z3 F1000');  // Safe vertical lift
    commandQueueRef.current.push('G90');
    commandQueueRef.current.push('G1 X10 Y10 F4000'); // Safe corner away from model
    processQueue();
  }, [addLog, processQueue]);

  const executeSmartResume = useCallback(() => {
    if (!smartParkRef.current || !isParkedRef.current) return;
    addLog(`> Smart Resume: Priming and returning to model position`);
    commandQueueRef.current.push('G91');
    commandQueueRef.current.push('G1 E2 F1800'); // Micro-prime
    commandQueueRef.current.push('G90');
    const targetX = currentXRef.current > 0 ? currentXRef.current : 100;
    const targetY = currentYRef.current > 0 ? currentYRef.current : 100;
    const targetZ = currentZRef.current > 0 ? currentZRef.current : 0.2;
    commandQueueRef.current.push(`G1 X${targetX} Y${targetY} F4000`);
    commandQueueRef.current.push(`G1 Z${targetZ} F1000`);
    isParkedRef.current = false;
    processQueue();
  }, [addLog, processQueue]);

  // Beeper triggers
  const beepPrinter = useCallback((freq = 1000, duration = 200) => {
    sendPrinterBeep(sendCommand, freq, duration);
    playBrowserTone(freq, duration / 1000);
  }, [sendCommand]);

  const alertBeeper = useCallback((browserSound = true) => {
    triggerFilamentChangeAlert(sendCommand, { 
      melodyKey: selectedMelodyRef.current,
      printerBeeper: true,
      browserSound 
    });
  }, [sendCommand]);

  const playMelody = useCallback((melodyKey = selectedMelodyRef.current) => {
    playPrinterMelody(sendCommand, melodyKey, true);
  }, [sendCommand]);

  const previewBrowserMelody = useCallback((melodyKey = selectedMelodyRef.current) => {
    playBrowserMelody(melodyKey);
  }, []);

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

  // For ETA
  const totalPrintSecondsRef = useRef(null);

  const startPrint = (gcodeString, copies = 1, estimatedTimeSeconds = null, detectedChanges = [], fileName = 'model.gcode') => {
    const lines = typeof gcodeString === 'string' ? gcodeString.split('\n') : gcodeString;
    gcodeLinesRef.current = lines;
    setActiveGcodeLines(lines);
    printIndexRef.current = 0;
    setCurrentPrintIndex(0);
    printStartTimeRef.current = Date.now();
    totalCopiesRef.current = copies;
    completedCopiesRef.current = 0;
    totalPrintSecondsRef.current = estimatedTimeSeconds;
    
    // Filament changes initialization
    filamentChangesListRef.current = detectedChanges || [];
    setFilamentChangesList(detectedChanges || []);
    currentChangeIndexRef.current = 0;
    setIsFilamentChangePause(false);
    setCurrentFilamentChange(null);
    isParkedRef.current = false;

    // Save initial full G-code payload to IndexedDB for "Save My Print"
    activeFileNameRef.current = fileName || 'model.gcode';
    saveRecoverySnapshot({
      fileName: activeFileNameRef.current,
      printIndex: 0,
      totalLines: lines.length,
      lastX: 0,
      lastY: 0,
      lastZ: 0.2,
      hotendTarget,
      bedTarget,
      timestamp: Date.now()
    }, typeof gcodeString === 'string' ? gcodeString : lines.join('\n'));

    setTotalCopies(copies);
    setCompletedCopies(0);
    setIsWaitingForClear(false);
    setLiveEta(estimatedTimeSeconds ? "Calculating..." : "Calculating (Naive)...");
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
    executeSmartPark();
  };

  const resumePrint = () => {
    executeSmartResume();
    setIsPrinting(true);
    setTimeout(() => {
      processQueue();
    }, 100);
  };

  const resumeFilamentChange = () => {
    setIsFilamentChangePause(false);
    isFilamentChangePauseRef.current = false;
    setCurrentFilamentChange(null);
    addLog("--- Resuming Print after Filament Change ---");
    executeSmartResume();
    setIsPrinting(true);
    setTimeout(() => {
      isWaitingForOkRef.current = false;
      processQueue();
    }, 100);
  };

  const unloadFilament = (length = 50) => {
    sendCommand('G91');
    sendCommand(`G1 E-${length} F600`);
    sendCommand('G90');
    addLog(`> Retracted ${length}mm filament`);
  };

  const purgeFilament = (length = 30) => {
    sendCommand('G91');
    sendCommand(`G1 E${length} F200`);
    sendCommand('G90');
    addLog(`> Purged ${length}mm new filament`);
  };

  const stopPrint = () => {
    setIsPrinting(false);
    gcodeLinesRef.current = [];
    setActiveGcodeLines([]);
    printIndexRef.current = 0;
    setCurrentPrintIndex(0);
    setPrintProgress(0);
    setLiveEta(null);
    printStartTimeRef.current = null;
    totalCopiesRef.current = 1;
    completedCopiesRef.current = 0;
    setTotalCopies(1);
    setCompletedCopies(0);
    setIsWaitingForClear(false);
    setIsFilamentChangePause(false);
    setCurrentFilamentChange(null);
    setFilamentChangesList([]);
    isParkedRef.current = false;
    clearRecoverySnapshot();
    setInterruptedJob(null);
  };

  // "Save My Print" (Crash & Disconnect Recovery) Handlers
  const resumeInterruptedPrint = async () => {
    const meta = getRecoveryMeta();
    if (!meta) return;

    addLog(`--- "Save My Print": Resuming ${meta.fileName} from line ${meta.printIndex} (Z=${meta.lastZ}mm) ---`);
    const fullGcode = await getRecoveryGcode();
    if (!fullGcode) {
      alert("Could not load original G-code from local database. Please load the file manually.");
      return;
    }

    const lines = fullGcode.split('\n');
    const remainingLines = lines.slice(meta.printIndex);
    const recoveryLines = buildRecoveryGcode(meta, remainingLines);

    clearRecoverySnapshot();
    setInterruptedJob(null);

    startPrint(recoveryLines.join('\n'), 1, null, [], `Resumed_${meta.fileName}`);
  };

  const discardInterruptedPrint = () => {
    clearRecoverySnapshot();
    setInterruptedJob(null);
  };

  const [elapsedTimeStr, setElapsedTimeStr] = useState(null);

  useEffect(() => {
    let interval;
    if (isPrintingState && printStartTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Date.now() - printStartTimeRef.current;
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        setElapsedTimeStr(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
      }, 1000);
    } else if (!isPrintingState && printProgress === 0) {
      setElapsedTimeStr(null);
    }
    return () => clearInterval(interval);
  }, [isPrintingState, printProgress]);

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
    elapsedTime: elapsedTimeStr,
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
    isWaitingForClear,
    // Filament & Beeper controls
    isFilamentChangePause,
    currentFilamentChange,
    filamentChangesList,
    autoPauseFilament,
    setAutoPauseFilament,
    beepOnFilament,
    setBeepOnFilament,
    soundAlertFilament,
    setSoundAlertFilament,
    resumeFilamentChange,
    unloadFilament,
    purgeFilament,
    beepPrinter,
    alertBeeper,
    selectedMelody,
    setSelectedMelody,
    playMelody,
    previewBrowserMelody,
    melodies: MELODIES,
    // 2D Layer Visualizer
    activeGcodeLines,
    currentPrintIndex,
    setPreviewGcode,
    // "Save My Print" (Crash Recovery)
    interruptedJob,
    resumeInterruptedPrint,
    discardInterruptedPrint,
    // Smart Park & Anti-Ooze
    smartPark,
    setSmartPark
  };
}
