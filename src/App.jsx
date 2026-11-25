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
import BedMeshVisualizer from './components/BedMeshVisualizer';
import GcodeVisualizer from './components/GcodeVisualizer';
import NotificationModal from './components/NotificationModal';
import { getProfileById } from './lib/printers';
import { Bell, Eye, Terminal as TerminalIcon } from 'lucide-react';
import './App.css';

function App() {
  const printer = usePrinter();
  const wakeLock = useWakeLock();
  const [powerSaver, setPowerSaver] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [rightColTab, setRightColTab] = useState('visualizer');

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
      <header className="app-header">
        <div className="logo-section" style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <img src="/logo.png" alt="Infinity Layers" className="app-logo" />
            <h1>Infinity Layers <span className="subtitle">| G-Code Streamer</span></h1>
          </div>
          <div className={`status-badge ${printer.isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {printer.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
          {/* Notification & Webhooks Config Button */}
          <button 
            type="button"
            className="btn-secondary" 
            onClick={() => setShowNotificationsModal(true)} 
            style={{padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}
            title="Mobile Push & Webhook Notification Settings"
          >
            <Bell size={16} color="#a5b4fc" /> Alerts
          </button>

          {printer.isConnected ? (
            <>
              <button 
                className="btn-secondary"
                onClick={() => printer.beepPrinter(1000, 200)}
                style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}
                title="Test printer buzzer (M300)"
              >
                <Bell size={16} color="#fbc531" /> Beep
              </button>
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
            </>
          ) : (
            <>
              <button 
                className="btn-secondary"
                onClick={() => setPowerSaver(true)}
                style={{padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: 0.8, border: '1px solid #94a3b8'}}
              >
                OLED Power Saver
              </button>
              <button 
                className="btn-secondary"
                onClick={async () => {
                  try {
                    const device = await navigator.usb.requestDevice({ filters: [] });
                    alert(`USB DETECTED: Vendor 0x${device.vendorId.toString(16)} | Product 0x${device.productId.toString(16)} | Class ${device.deviceClass}`);
                  } catch (e) {
                    alert("USB Debug failed or canceled: " + e.message);
                  }
                }}
                style={{padding: '0.5rem 1rem', fontSize: '0.8rem', opacity: 0.7}}
              >
                Debug USB
              </button>
            </>
          )}
        </div>
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

      {/* Mobile & Webhook Notifications Modal */}
      <NotificationModal 
        isOpen={showNotificationsModal} 
        onClose={() => setShowNotificationsModal(false)} 
      />

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
              elapsedTime={printer.elapsedTime}
              totalCopies={printer.totalCopies}
              completedCopies={printer.completedCopies}
              isWaitingForClear={printer.isWaitingForClear}
              continueNextCopy={printer.continueNextCopy}
              isFilamentChangePause={printer.isFilamentChangePause}
              currentFilamentChange={printer.currentFilamentChange}
              resumeFilamentChange={printer.resumeFilamentChange}
              unloadFilament={printer.unloadFilament}
              purgeFilament={printer.purgeFilament}
              beepPrinter={printer.beepPrinter}
              alertBeeper={printer.alertBeeper}
              autoPauseFilament={printer.autoPauseFilament}
              setAutoPauseFilament={printer.setAutoPauseFilament}
              beepOnFilament={printer.beepOnFilament}
              setBeepOnFilament={printer.setBeepOnFilament}
              soundAlertFilament={printer.soundAlertFilament}
              setSoundAlertFilament={printer.setSoundAlertFilament}
              selectedMelody={printer.selectedMelody}
              setSelectedMelody={printer.setSelectedMelody}
              playMelody={printer.playMelody}
              previewBrowserMelody={printer.previewBrowserMelody}
              melodies={printer.melodies}
              setPreviewGcode={printer.setPreviewGcode}
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
              <Macros 
                sendCommand={printer.sendCommand} 
                selectedMelody={printer.selectedMelody}
                setSelectedMelody={printer.setSelectedMelody}
                playMelody={printer.playMelody}
                melodies={printer.melodies}
              />
              <BedMeshVisualizer 
                terminalLogs={printer.terminalLogs} 
                sendCommand={printer.sendCommand} 
              />
            </>
          ) : (
            <div className="placeholder-panel panel">
              Please connect to your 3D printer.
            </div>
          )}
        </div>

        <div className="column right-col">
          {/* Tab Bar for Visualizer vs Terminal */}
          <div style={{display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: '10px'}}>
            <button 
              type="button"
              className={rightColTab === 'visualizer' ? 'btn-primary' : 'btn-secondary'} 
              onClick={() => setRightColTab('visualizer')}
              style={{flex: 1, fontSize: '0.85rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}
            >
              <Eye size={15} /> 2D Layer Visualizer
            </button>
            <button 
              type="button"
              className={rightColTab === 'terminal' ? 'btn-primary' : 'btn-secondary'} 
              onClick={() => setRightColTab('terminal')}
              style={{flex: 1, fontSize: '0.85rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}
            >
              <TerminalIcon size={15} /> Terminal Console
            </button>
          </div>

          {rightColTab === 'visualizer' ? (
            <GcodeVisualizer 
              gcodeLines={printer.activeGcodeLines}
              printIndex={printer.currentPrintIndex}
              isPrinting={printer.isPrinting}
              bedSize={getProfileById(printer.activeProfileId).volume}
            />
          ) : (
            <Terminal logs={printer.terminalLogs} sendCommand={printer.sendCommand} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
