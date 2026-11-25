import { useState } from 'react';
import { Sliders, X, Check, Download, Plus, Trash2, Thermometer, Layers, Zap } from 'lucide-react';
import { analyzeGcode } from '../lib/gcodeAnalyzer';

export default function GcodeTweakerModal({ isOpen, onClose, gcodeContent, fileName, onApplyChanges }) {
  if (!isOpen || !gcodeContent) return null;

  const [activeTab, setActiveTab] = useState('pause'); // 'pause' | 'temp'
  const [targetLayer, setTargetLayer] = useState('');
  const [targetZ, setTargetZ] = useState('');
  const [pauseType, setPauseType] = useState('M600'); // 'M600' | 'M0'

  const [overrideHotend, setOverrideHotend] = useState('');
  const [overrideBed, setOverrideBed] = useState('');

  const [feedback, setFeedback] = useState('');

  // 1. Inject Pause at Layer or Height
  const handleInjectPause = () => {
    const lines = gcodeContent.split('\n');
    let injectedIndex = -1;
    let description = '';

    if (targetLayer) {
      const layerNum = parseInt(targetLayer);
      // Look for ;LAYER:<num> or ;LAYER_CHANGE
      let currentLayer = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const curaMatch = line.match(/^;LAYER:(\d+)/i);
        if (curaMatch) {
          currentLayer = parseInt(curaMatch[1]) + 1;
        } else if (line.match(/^;LAYER_CHANGE/i)) {
          currentLayer++;
        }
        if (currentLayer === layerNum) {
          injectedIndex = i + 1;
          description = `Injected ${pauseType} at Layer ${layerNum}`;
          break;
        }
      }
    } else if (targetZ) {
      const zHeight = parseFloat(targetZ);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split(';')[0].trim().toUpperCase();
        if (line.startsWith('G0') || line.startsWith('G1')) {
          const zMatch = line.match(/Z([\d.]+)/);
          if (zMatch && parseFloat(zMatch[1]) >= zHeight - 0.05) {
            injectedIndex = i;
            description = `Injected ${pauseType} at Z=${zHeight}mm`;
            break;
          }
        }
      }
    }

    if (injectedIndex === -1) {
      alert("Could not locate the requested layer or height in this G-Code file.");
      return;
    }

    const pauseCommand = pauseType === 'M600' 
      ? `\n; --- INJECTED BY INFINITY LAYERS QUICK TWEAKER ---\n;COLOR_CHANGE,START\nM600\n;COLOR_CHANGE,STOP\n`
      : `\n; --- INJECTED BY INFINITY LAYERS QUICK TWEAKER ---\nM0 Pause at Layer\n`;

    lines.splice(injectedIndex, 0, pauseCommand);
    const updatedContent = lines.join('\n');
    onApplyChanges(updatedContent);
    setFeedback(`Success! ${description}`);
    setTimeout(() => setFeedback(''), 4000);
    setTargetLayer('');
    setTargetZ('');
  };

  // 2. Override Temperatures in G-code
  const handleOverrideTemps = () => {
    if (!overrideHotend && !overrideBed) return;

    let lines = gcodeContent.split('\n');
    let hotendCount = 0;
    let bedCount = 0;

    lines = lines.map(line => {
      const upper = line.trim().toUpperCase();
      // Hotend: M104 S... or M109 S...
      if (overrideHotend && (upper.startsWith('M104') || upper.startsWith('M109'))) {
        const match = line.match(/(M10[49]\s+S)([\d.]+)/i);
        if (match && parseFloat(match[2]) > 0) {
          hotendCount++;
          return line.replace(/(M10[49]\s+S)([\d.]+)/i, `$1${overrideHotend}`);
        }
      }
      // Bed: M140 S... or M190 S...
      if (overrideBed && (upper.startsWith('M140') || upper.startsWith('M190'))) {
        const match = line.match(/(M1[49]0\s+S)([\d.]+)/i);
        if (match && parseFloat(match[2]) > 0) {
          bedCount++;
          return line.replace(/(M1[49]0\s+S)([\d.]+)/i, `$1${overrideBed}`);
        }
      }
      return line;
    });

    const updatedContent = lines.join('\n');
    onApplyChanges(updatedContent);
    setFeedback(`Updated ${hotendCount} hotend commands and ${bedCount} bed commands!`);
    setTimeout(() => setFeedback(''), 4000);
  };

  // 3. Download modified file
  const handleDownload = () => {
    const blob = new Blob([gcodeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ? `tweaked_${fileName}` : 'tweaked_model.gcode';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        padding: '1.5rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
            <div style={{background: 'rgba(245, 158, 11, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#f59e0b'}}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '1.1rem'}}>In-Browser G-Code Tweaker</h3>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Modify pauses & temperatures without re-slicing</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{background: 'transparent'}}>
            <X size={18} />
          </button>
        </div>

        {/* Tab selection */}
        <div style={{display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.3rem', borderRadius: '8px'}}>
          <button 
            type="button"
            className={activeTab === 'pause' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setActiveTab('pause')}
            style={{flex: 1, fontSize: '0.8rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}
          >
            <Layers size={14} /> Inject Pause / M600
          </button>
          <button 
            type="button"
            className={activeTab === 'temp' ? 'btn-primary' : 'btn-secondary'} 
            onClick={() => setActiveTab('temp')}
            style={{flex: 1, fontSize: '0.8rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'}}
          >
            <Thermometer size={14} /> Override Temps
          </button>
        </div>

        {/* Tab 1: Inject Pause */}
        {activeTab === 'pause' && (
          <div style={{background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600}}>
              Insert Filament Change or Pause
            </span>
            <p style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>
              Pick a layer number or exact Z-height where you want the printer to pause for a color swap or insert a hardware nut/magnet.
            </p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem'}}>
              <div>
                <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>At Layer #</label>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="e.g. 24" 
                  value={targetLayer} 
                  onChange={(e) => { setTargetLayer(e.target.value); setTargetZ(''); }}
                  style={{width: '100%', padding: '0.4rem', fontSize: '0.85rem'}}
                />
              </div>
              <div>
                <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>Or at Z-Height (mm)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="e.g. 4.8" 
                  value={targetZ} 
                  onChange={(e) => { setTargetZ(e.target.value); setTargetLayer(''); }}
                  style={{width: '100%', padding: '0.4rem', fontSize: '0.85rem'}}
                />
              </div>
            </div>

            <div style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
              <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Command:</span>
              <label style={{fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer'}}>
                <input type="radio" name="ptype" value="M600" checked={pauseType === 'M600'} onChange={() => setPauseType('M600')} />
                <span>M600 (Filament Change)</span>
              </label>
              <label style={{fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer'}}>
                <input type="radio" name="ptype" value="M0" checked={pauseType === 'M0'} onChange={() => setPauseType('M0')} />
                <span>M0 (Unconditional Pause)</span>
              </label>
            </div>

            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleInjectPause} 
              disabled={!targetLayer && !targetZ}
              style={{marginTop: '0.4rem', fontSize: '0.85rem'}}
            >
              <Plus size={15} /> Inject Pause Command
            </button>
          </div>
        )}

        {/* Tab 2: Override Temps */}
        {activeTab === 'temp' && (
          <div style={{background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600}}>
              Adjust Sliced Temperatures
            </span>
            <p style={{fontSize: '0.78rem', color: 'var(--text-muted)'}}>
              Quickly override hotend and bed temperatures across the G-code without waiting for your slicer to re-render.
            </p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem'}}>
              <div>
                <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>New Hotend Temp (°C)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="320" 
                  placeholder="e.g. 215" 
                  value={overrideHotend} 
                  onChange={(e) => setOverrideHotend(e.target.value)}
                  style={{width: '100%', padding: '0.4rem', fontSize: '0.85rem'}}
                />
              </div>
              <div>
                <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>New Bed Temp (°C)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="130" 
                  placeholder="e.g. 65" 
                  value={overrideBed} 
                  onChange={(e) => setOverrideBed(e.target.value)}
                  style={{width: '100%', padding: '0.4rem', fontSize: '0.85rem'}}
                />
              </div>
            </div>

            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleOverrideTemps} 
              disabled={!overrideHotend && !overrideBed}
              style={{marginTop: '0.4rem', fontSize: '0.85rem'}}
            >
              <Check size={15} /> Apply New Temperatures
            </button>
          </div>
        )}

        {feedback && (
          <div style={{fontSize: '0.82rem', color: '#10b981', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem', borderRadius: '6px'}}>
            {feedback}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem'}}>
          <button type="button" className="btn-secondary" onClick={handleDownload} style={{fontSize: '0.8rem'}}>
            <Download size={14} /> Export Tweaked File
          </button>
          <button type="button" className="btn-primary" onClick={onClose} style={{fontSize: '0.8rem'}}>
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
