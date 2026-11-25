import { useState } from 'react';
import { 
  Upload, Play, Pause, Square, AlertTriangle, CheckCircle, Clock, X, 
  Palette, Bell, Volume2, ArrowUpFromLine, ArrowDownToLine, Layers, Music
} from 'lucide-react';
import { analyzeGcode } from '../lib/gcodeAnalyzer';
import { getProfileById } from '../lib/printers';

export default function PrintManager({ 
  isPrinting, printProgress, startPrint, pausePrint, resumePrint, stopPrint, 
  activeProfileId, setActiveProfileId, liveEta, elapsedTime,
  totalCopies, completedCopies, isWaitingForClear, continueNextCopy,
  // Multi-Filament & Beeper props
  isFilamentChangePause, currentFilamentChange, resumeFilamentChange,
  unloadFilament, purgeFilament, beepPrinter, alertBeeper,
  autoPauseFilament, setAutoPauseFilament,
  beepOnFilament, setBeepOnFilament,
  soundAlertFilament, setSoundAlertFilament,
  selectedMelody, setSelectedMelody, playMelody, melodies,
  setPreviewGcode
}) {
  const [file, setFile] = useState(null);
  const [gcodeContent, setGcodeContent] = useState('');
  
  const [analysis, setAnalysis] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [showPreflight, setShowPreflight] = useState(false);
  const [copies, setCopies] = useState(1);
  const [showChangesList, setShowChangesList] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setGcodeContent(content);
        setPreviewGcode?.(content);
        const result = analyzeGcode(content);
        
        let profileToUseId = activeProfileId;
        if (result.suggestedProfile && result.suggestedProfile !== activeProfileId) {
          profileToUseId = result.suggestedProfile;
          setActiveProfileId(profileToUseId); // Auto-detect
        }
        
        setAnalysis(result);
        validateGcode(result, profileToUseId);
        setShowPreflight(true);
      };
      reader.readAsText(selected);
    }
  };

  const loadDemoFile = async () => {
    try {
      const res = await fetch('/multi_color_test_sample.gcode');
      if (!res.ok) throw new Error('Sample file could not be fetched');
      const content = await res.text();
      setFile({ name: 'multi_color_test_sample.gcode' });
      setGcodeContent(content);
      setPreviewGcode?.(content);
      const result = analyzeGcode(content);
      
      let profileToUseId = activeProfileId;
      if (result.suggestedProfile && result.suggestedProfile !== activeProfileId) {
        profileToUseId = result.suggestedProfile;
        setActiveProfileId(profileToUseId);
      }
      
      setAnalysis(result);
      validateGcode(result, profileToUseId);
      setShowPreflight(true);
    } catch (err) {
      console.error(err);
      alert('Could not load demo G-Code file: ' + err.message);
    }
  };

  const validateGcode = (result, profileId) => {
    const profile = getProfileById(profileId);
    let newWarnings = [];
    
    if (result.bounds.x > profile.volume.x) newWarnings.push(`X-axis (${result.bounds.x}mm) exceeds printer max (${profile.volume.x}mm)`);
    if (result.bounds.y > profile.volume.y) newWarnings.push(`Y-axis (${result.bounds.y}mm) exceeds printer max (${profile.volume.y}mm)`);
    if (result.bounds.z > profile.volume.z) newWarnings.push(`Z-axis (${result.bounds.z}mm) exceeds printer max (${profile.volume.z}mm)`);
    
    if (result.temps.hotend > profile.maxTemp.hotend) newWarnings.push(`Hotend temp (${result.temps.hotend}°C) exceeds max (${profile.maxTemp.hotend}°C)`);
    if (result.temps.bed > profile.maxTemp.bed) newWarnings.push(`Bed temp (${result.temps.bed}°C) exceeds max (${profile.maxTemp.bed}°C)`);
    
    setWarnings(newWarnings);
  };

  const handleStart = () => {
    setShowPreflight(false);
    if (gcodeContent) {
      startPrint(gcodeContent, copies, analysis?.estimatedTimeSeconds, analysis?.filamentChanges || []);
    }
  };
  
  const cancelPreflight = () => {
    setShowPreflight(false);
    setFile(null);
    setGcodeContent('');
    setPreviewGcode?.(null);
    setAnalysis(null);
    setWarnings([]);
    setCopies(1);
    setShowChangesList(false);
  };

  return (
    <div className="panel print-panel">
      <h2>Print Manager {totalCopies > 1 && !showPreflight && `(Copy ${completedCopies + 1} of ${totalCopies})`}</h2>
      
      {showPreflight && analysis ? (
        <div className="preflight-modal">
          <div className="preflight-header">
            <h3>Pre-flight Check</h3>
            <button className="btn-icon" onClick={cancelPreflight}><X size={18}/></button>
          </div>
          
          <div className="preflight-details">
            <p><strong>File:</strong> {file?.name}</p>
            <p><strong>Profile:</strong> {getProfileById(activeProfileId).name} {analysis.suggestedProfile ? '(Auto-detected)' : ''}</p>
            <p><strong>Est. Time:</strong> {analysis.estimatedTime || 'Unknown'}</p>
            <p><strong>Dimensions:</strong> {analysis.bounds.x}x{analysis.bounds.y}x{analysis.bounds.z}mm</p>
            <p><strong>Peak Temps:</strong> H:{analysis.temps.hotend}°C / B:{analysis.temps.bed}°C</p>
            
            <div style={{marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <strong>Sequence Copies:</strong>
              <input 
                type="number" 
                min="1" 
                max="99" 
                value={copies} 
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)} 
                style={{width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}} 
              />
            </div>

            {/* Multi-Filament & Color Change Detection Banner */}
            {analysis.hasMultiFilament ? (
              <div className="filament-detection-card" style={{marginTop: '1rem', padding: '0.8rem', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', fontWeight: 'bold'}}>
                    <Palette size={18} />
                    <span>Multi-Filament Print Detected</span>
                  </div>
                  <span className="badge" style={{background: '#4f46e5', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                    {analysis.filamentChanges.length} Pause{analysis.filamentChanges.length > 1 ? 's' : ''} ({analysis.totalColors} Colors)
                  </span>
                </div>
                
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0'}}>
                  The slicer included pause or filament change commands (e.g. M600 / M0 / Color changes).
                </p>

                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={() => setShowChangesList(!showChangesList)}
                  style={{fontSize: '0.8rem', padding: '0.3rem 0.7rem', marginTop: '0.3rem', width: 'auto'}}
                >
                  {showChangesList ? 'Hide Pause Schedule' : `View ${analysis.filamentChanges.length} Pause Point(s)`}
                </button>

                {showChangesList && (
                  <div style={{marginTop: '0.6rem', maxHeight: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem'}}>
                    {analysis.filamentChanges.map((fc) => (
                      <div key={fc.id} style={{display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                        <span><strong>#{fc.id}:</strong> Z={fc.z}mm {fc.layer ? `(Layer ${fc.layer})` : ''}</span>
                        <code style={{color: '#93c5fd', fontSize: '0.75rem'}}>{fc.command}</code>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-Filament Options */}
                <div style={{marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={autoPauseFilament} 
                      onChange={(e) => setAutoPauseFilament(e.target.checked)} 
                    />
                    <span>Auto-pause streamer at filament change points</span>
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={beepOnFilament} 
                      onChange={(e) => setBeepOnFilament(e.target.checked)} 
                    />
                    <span style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                      <Bell size={14} color="#f59e0b" /> Sound printer buzzer (M300) on pause
                    </span>
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <input 
                      type="checkbox" 
                      checked={soundAlertFilament} 
                      onChange={(e) => setSoundAlertFilament(e.target.checked)} 
                    />
                    <span style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}>
                      <Volume2 size={14} color="#10b981" /> Play browser audio chime
                    </span>
                  </label>

                  {/* Song Melody Picker */}
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', gap: '0.5rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1}}>
                      <Music size={15} color="#fbc531" />
                      <span style={{fontSize: '0.82rem', color: '#fbc531', fontWeight: 'bold', whiteSpace: 'nowrap'}}>Alert Song:</span>
                      <select 
                        value={selectedMelody || 'cheques'} 
                        onChange={(e) => setSelectedMelody?.(e.target.value)}
                        style={{flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.4)', borderRadius: '6px'}}
                      >
                        {melodies && Object.entries(melodies).map(([key, m]) => (
                          <option key={key} value={key}>
                            {m.emoji} {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      className="btn-secondary"
                      onClick={() => playMelody?.(selectedMelody)}
                      style={{fontSize: '0.75rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap'}}
                      title="Preview this song melody on printer buzzer and dashboard"
                    >
                      <Play size={12} /> Test Song
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {warnings.length > 0 ? (
            <div className="preflight-warnings">
              <div className="warning-title"><AlertTriangle size={18}/> Safety Warnings</div>
              <ul>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              <p className="warning-override">Are you absolutely sure you want to proceed?</p>
            </div>
          ) : (
            <div className="preflight-success">
              <CheckCircle size={18}/> All safety checks passed!
            </div>
          )}

          <div className="preflight-actions">
            <button className="btn-secondary" onClick={cancelPreflight}>Cancel</button>
            <button className={warnings.length > 0 ? "btn-danger" : "btn-primary"} onClick={handleStart}>
              {warnings.length > 0 ? "Print Anyway" : "Start Print"}
            </button>
          </div>
        </div>
      ) : isWaitingForClear ? (
        <div className="clear-bed-modal" style={{padding: '2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--accent-red)', borderRadius: '8px', marginTop: '1rem'}}>
          <h3 style={{color: 'var(--accent-red)', fontSize: '1.5rem', marginBottom: '1rem'}}>Print Complete!</h3>
          <p style={{marginBottom: '2rem'}}>Please remove the printed part from the build plate before continuing.</p>
          <button className="btn-primary" onClick={continueNextCopy} style={{padding: '1rem 2rem', fontSize: '1.2rem', width: '100%'}}>
            Confirm Bed is Clear & Print Next
          </button>
          <button className="btn-secondary" onClick={stopPrint} style={{marginTop: '1rem', width: '100%'}}>
            Cancel Remaining Sequence
          </button>
        </div>
      ) : isFilamentChangePause ? (
        /* Filament Change Required Interactive Modal */
        <div className="filament-change-modal" style={{
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(79, 70, 229, 0.15))', 
          border: '2px solid #f59e0b', 
          borderRadius: '12px', 
          marginTop: '1rem',
          boxShadow: '0 0 25px rgba(245, 158, 11, 0.25)'
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
              <div style={{background: '#f59e0b', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Bell size={24} color="#0f172a" />
              </div>
              <div>
                <h3 style={{color: '#f59e0b', fontSize: '1.2rem', margin: 0}}>Filament Change Required!</h3>
                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                  Print is paused waiting for your material swap
                </span>
              </div>
            </div>
            {currentFilamentChange?.id && (
              <span style={{background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                Pause #{currentFilamentChange.id}
              </span>
            )}
          </div>

          <div style={{background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem'}}>
            <p style={{margin: '0.2rem 0'}}><strong>Status:</strong> {currentFilamentChange?.description || 'Filament change triggered'}</p>
            {currentFilamentChange?.z !== undefined && currentFilamentChange.z !== 'N/A' && (
              <p style={{margin: '0.2rem 0'}}><strong>Position:</strong> Z = {currentFilamentChange.z}mm {currentFilamentChange.layer ? `| Layer ${currentFilamentChange.layer}` : ''}</p>
            )}
            <p style={{margin: '0.2rem 0', color: '#a5b4fc', fontSize: '0.8rem'}}>
              Hotend temperature is preserved. Swap filament now, purge old color if needed, then resume.
            </p>
          </div>

          {/* Quick Helper Actions */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1rem'}}>
            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => playMelody?.(selectedMelody)}
              style={{fontSize: '0.8rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#fbc531'}}
              title="Replay the chosen song melody on printer buzzer and dashboard"
            >
              <Music size={16} /> Replay Song
            </button>
            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => unloadFilament?.(50)}
              style={{fontSize: '0.8rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'}}
              title="Retract old filament 50mm"
            >
              <ArrowUpFromLine size={16} /> Unload (-50mm)
            </button>
            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => purgeFilament?.(30)}
              style={{fontSize: '0.8rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'}}
              title="Extrude new filament 30mm to flush old color"
            >
              <ArrowDownToLine size={16} /> Purge (+30mm)
            </button>
          </div>

          <div style={{display: 'flex', gap: '0.8rem'}}>
            <button 
              type="button"
              className="btn-primary" 
              onClick={resumeFilamentChange} 
              style={{
                flex: 2, 
                padding: '0.8rem', 
                fontSize: '1rem', 
                fontWeight: 'bold', 
                background: 'linear-gradient(90deg, #10b981, #059669)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Play size={18} /> Confirm & Resume Print
            </button>
            <button 
              type="button"
              className="btn-danger" 
              onClick={stopPrint} 
              style={{flex: 1, padding: '0.8rem'}}
            >
              <Square size={16} /> Abort Print
            </button>
          </div>
        </div>
      ) : !isPrinting && printProgress === 0 ? (
        <div className="upload-area">
          <input type="file" accept=".gcode" onChange={handleFileChange} id="file-upload" className="hidden-input" />
          <label htmlFor="file-upload" className="upload-label">
            <Upload size={32} />
            <span>{file ? file.name : 'Select or drop G-Code file'}</span>
          </label>
          <div style={{marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'center'}}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadDemoFile(); }}
              style={{fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem'}}
            >
              <Palette size={14} color="#a5b4fc" /> Load Multi-Filament Demo File
            </button>
          </div>
        </div>
      ) : (
        <div className="print-progress-area">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${printProgress}%` }}></div>
          </div>
          <div className="progress-stats">
            <span>{printProgress.toFixed(1)}%</span>
            <span className="file-name">{file?.name}</span>
          </div>
          
          <div className="eta-display" style={{display:'flex', alignItems:'center', justifyContent: 'space-between', margin:'0.5rem 0', color:'var(--accent-blue)'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
              <Clock size={16}/> <span>ETA: {liveEta || '...'}</span>
            </div>
            {elapsedTime && (
              <div style={{display:'flex', alignItems:'center', gap:'0.5rem', opacity: 0.8}}>
                <span>Elapsed: {elapsedTime}</span>
              </div>
            )}
          </div>

          {/* Indicator if print has multi-filament changes scheduled */}
          {analysis?.hasMultiFilament && (
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0.4rem 0.8rem', 
              background: 'rgba(99, 102, 241, 0.1)', 
              borderRadius: '6px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.8rem',
              color: '#a5b4fc'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                <Palette size={14} />
                <span>Multi-Filament: {analysis.filamentChanges.length} Pause(s) configured</span>
              </div>
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => beepPrinter?.(1000, 150)}
                style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: 'auto'}}
                title="Test printer beeper"
              >
                <Bell size={12} /> Test Buzzer
              </button>
            </div>
          )}
          
          <div className="print-controls">
            {isPrinting ? (
              <button className="btn-warning" onClick={pausePrint}><Pause size={20}/> Pause</button>
            ) : (
              <button className="btn-primary" onClick={resumePrint}><Play size={20}/> Resume</button>
            )}
            <button className="btn-danger" onClick={stopPrint}><Square size={20}/> Stop</button>
          </div>
        </div>
      )}
    </div>
  );
}
