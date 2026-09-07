import { useState, useEffect } from 'react';
import { Upload, Play, Pause, Square, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { analyzeGcode } from '../lib/gcodeAnalyzer';
import { getProfileById } from '../lib/printers';

export default function PrintManager({ 
  isPrinting, printProgress, startPrint, pausePrint, resumePrint, stopPrint, 
  activeProfileId, setActiveProfileId, liveEta, 
  totalCopies, completedCopies, isWaitingForClear, continueNextCopy 
}) {
  const [file, setFile] = useState(null);
  const [gcodeContent, setGcodeContent] = useState('');
  
  const [analysis, setAnalysis] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [showPreflight, setShowPreflight] = useState(false);
  const [copies, setCopies] = useState(1);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setGcodeContent(content);
        const result = analyzeGcode(content);
        
        let profileToUseId = activeProfileId;
        if (result.suggestedProfile && result.suggestedProfile !== activeProfileId) {
          profileToUseId = result.suggestedProfile;
          setActiveProfileId(profileToUseId); // Auto-detect!
        }
        
        setAnalysis(result);
        validateGcode(result, profileToUseId);
        setShowPreflight(true);
      };
      reader.readAsText(selected);
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
      startPrint(gcodeContent, copies);
    }
  };
  
  const cancelPreflight = () => {
    setShowPreflight(false);
    setFile(null);
    setGcodeContent('');
    setAnalysis(null);
    setWarnings([]);
    setCopies(1);
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
            <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <strong>Sequence Copies:</strong>
              <input type="number" min="1" max="99" value={copies} onChange={(e) => setCopies(parseInt(e.target.value) || 1)} style={{width: '60px', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}} />
            </div>
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
      ) : !isPrinting && printProgress === 0 ? (
        <div className="upload-area">
          <input type="file" accept=".gcode" onChange={handleFileChange} id="file-upload" className="hidden-input" />
          <label htmlFor="file-upload" className="upload-label">
            <Upload size={32} />
            <span>{file ? file.name : 'Select or drop G-Code file'}</span>
          </label>
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
          
          <div className="eta-display" style={{display:'flex', alignItems:'center', gap:'0.5rem', margin:'0.5rem 0', color:'var(--accent-blue)'}}>
            <Clock size={16}/> <span>ETA: {liveEta || '...'}</span>
          </div>
          
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
