import { useState, useEffect } from 'react';
import { usePrinter } from './hooks/usePrinter';
import { useWakeLock } from './hooks/useWakeLock';
import ConnectionPanel from './components/ConnectionPanel';
import MovementControl from './components/MovementControl';
import TemperatureControl from './components/TemperatureControl';
import TuneControl from './components/TuneControl';
import PrintManager from './components/PrintManager';
import Terminal from './components/Terminal';
import FanControl from './components/FanControl';
import ExtruderControl from './components/ExtruderControl';
import Macros from './components/Macros';
import SettingsPanel from './components/SettingsPanel';
import './App.css'; 

function App() {
  const printer = usePrinter();
  const wakeLock = useWakeLock();
  const [powerSaver, setPowerSaver] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-acquire wake lock when printing starts
  useEffect(() => {
    if (printer.isPrinting && !wakeLock.isActive) {
      wakeLock.request();
    } else if (!printer.isPrinting && wakeLock.isActive) {
      wakeLock.release();
    }
  }, [printer.isPrinting, wakeLock]);

  return (
    <div className="app-container">
      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        powerSaver={powerSaver}
        setPowerSaver={setPowerSaver}
      />
      
      <header className="app-header">
        <div className="logo-section" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <button 
            onClick={() => setSettingsOpen(true)}
            style={{
              background: 'none', border: 'none', color: '#f8fafc', 
              fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem'
            }}
          >
            ☰
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <img src="/logo.png" alt="Infinity Layers" className="app-logo" />
            <h1>Infinity Layers <span className="subtitle">| G-Code Streamer</span></h1>
          </div>
          <div className={`status-badge ${printer.isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {printer.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        {printer.isConnected ? (
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <button 
              className="btn-primary" 
              onClick={() => { printer.sendCommand('M104 S0'); printer.sendCommand('M140 S0'); printer.sendCommand('M106 S0'); }} 
              style={{padding: '0.5rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase'}}
            >
              Cooldown
            </button>
            <button 
              className="btn-danger e-stop" 
              onClick={() => {
                if (window.confirm("Are you sure you want to trigger an EMERGENCY STOP? This will immediately halt the printer and kill all commands.")) {
                  printer.sendCommand('M112');
                }
              }} 
              style={{padding: '0.5rem 1.5rem', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', boxShadow: '0 0 15px rgba(255,0,0,0.5)', border: '2px solid #ff4b4b', textTransform: 'uppercase'}}
            >
              Emergency Stop
            </button>
          </div>
        ) : (
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <button 
              className="btn-secondary"
              onClick={() => setPowerSaver(true)}
              style={{padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: 0.8, border: '1px solid #94a3b8'}}
            >
              OLED Power Saver
            </button>
          </div>
        )}
      </header>
      
      {powerSaver && (
        <div 
          onClick={() => setPowerSaver(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: '#000000', zIndex: 9999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <div style={{
            color: '#333', textAlign: 'center', 
            fontFamily: 'monospace', opacity: 0.5,
            animation: 'pulse 2s infinite'
          }}>
            <p>OLED POWER SAVER ACTIVE</p>
            <p>Printing: {printer.printProgress.toFixed(1)}%</p>
            <p style={{marginTop: '2rem', fontSize: '0.8rem'}}>Tap anywhere to wake display</p>
          </div>
        </div>
      )}

      <main className="dashboard">
        <div className="column left-col">
          <ConnectionPanel 
            isConnected={printer.isConnected} 
            onConnect={printer.connect} 
            onDisconnect={printer.disconnect} 
            activeProfileId={printer.activeProfileId}
            setActiveProfileId={printer.setActiveProfileId}
          />
          {printer.isConnected && (
            <PrintManager 
              isPrinting={printer.isPrinting}
              printProgress={printer.printProgress}
              startPrint={printer.startPrint}
              pausePrint={printer.pausePrint}
              resumePrint={printer.resumePrint}
              stopPrint={printer.stopPrint}
              activeProfileId={printer.activeProfileId}
              setActiveProfileId={printer.setActiveProfileId}
              liveEta={printer.liveEta}
              totalCopies={printer.totalCopies}
              completedCopies={printer.completedCopies}
              isWaitingForClear={printer.isWaitingForClear}
              continueNextCopy={printer.continueNextCopy}
            />
          )}
          {printer.isConnected && (
            <TemperatureControl 
              hotendTemp={printer.hotendTemp}
              hotendTarget={printer.hotendTarget}
              bedTemp={printer.bedTemp}
              bedTarget={printer.bedTarget}
              sendCommand={printer.sendCommand}
            />
          )}
          {printer.isConnected && (
            <TuneControl sendCommand={printer.sendCommand} />
          )}
        </div>
        
        <div className="column middle-col">
          {printer.isConnected ? (
            <>
              <MovementControl sendCommand={printer.sendCommand} />
              <ExtruderControl sendCommand={printer.sendCommand} />
              <FanControl sendCommand={printer.sendCommand} />
              <Macros sendCommand={printer.sendCommand} />
            </>
          ) : (
            <div className="placeholder-panel panel">
              Please connect to your 3D printer.
            </div>
          )}
        </div>

        <div className="column right-col">
          <Terminal logs={printer.terminalLogs} sendCommand={printer.sendCommand} />
        </div>
      </main>
    </div>
  );
}

export default App;
