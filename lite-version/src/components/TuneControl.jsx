import { useState } from 'react';
import { Activity } from 'lucide-react';

export default function TuneControl({ sendCommand }) {
  const [feedrate, setFeedrate] = useState(100);
  const [flowrate, setFlowrate] = useState(100);

  const updateFeedrate = (val) => {
    setFeedrate(val);
    sendCommand(`M220 S${val}`);
  };

  const updateFlowrate = (val) => {
    setFlowrate(val);
    sendCommand(`M221 S${val}`);
  };

  return (
    <div className="panel tune-panel" style={{marginTop: '1.5rem'}}>
      <h2><Activity size={20} color="#00d2d3" /> Live Tuning</h2>
      
      <div style={{marginTop: '1rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--text-muted)'}}>
          <span>Print Speed (Feedrate)</span>
          <strong style={{color: 'var(--text)'}}>{feedrate}%</strong>
        </div>
        <div style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
          <input type="range" min="50" max="150" step="5" value={feedrate} onChange={(e) => updateFeedrate(e.target.value)} style={{flex: 1}} />
          <button className="btn-secondary" onClick={() => updateFeedrate(100)} style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}>Reset</button>
        </div>
      </div>

      <div style={{marginTop: '1rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem', color: 'var(--text-muted)'}}>
          <span>Extrusion (Flowrate)</span>
          <strong style={{color: 'var(--text)'}}>{flowrate}%</strong>
        </div>
        <div style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
          <input type="range" min="80" max="120" step="1" value={flowrate} onChange={(e) => updateFlowrate(e.target.value)} style={{flex: 1}} />
          <button className="btn-secondary" onClick={() => updateFlowrate(100)} style={{padding: '0.2rem 0.5rem', fontSize: '0.8rem'}}>Reset</button>
        </div>
      </div>
    </div>
  );
}
