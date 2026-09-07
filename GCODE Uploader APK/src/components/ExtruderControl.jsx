import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Layers } from 'lucide-react';

export default function ExtruderControl({ sendCommand }) {
  const [step, setStep] = useState(10);

  const extrude = (direction) => {
    sendCommand('G91'); // Relative mode
    sendCommand(`G1 E${direction > 0 ? step : -step} F300`);
    sendCommand('G90'); // Absolute mode
  };

  return (
    <div className="panel extruder-panel" style={{marginTop: '1.5rem'}}>
      <h2><Layers size={20} color="#a5b4fc" /> Extruder</h2>
      
      <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
        Ensure the hotend is heated before extruding!
      </p>

      <div className="step-selector" style={{marginBottom: '1rem'}}>
        {[1, 5, 10, 50].map(val => (
          <button key={val} className={`btn-step ${step === val ? 'active' : ''}`} onClick={() => setStep(val)}>
            {val}mm
          </button>
        ))}
      </div>

      <div style={{display: 'flex', gap: '1rem'}}>
        <button className="btn-secondary" onClick={() => extrude(-1)} style={{flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'}}>
          <ArrowUpFromLine size={18}/> Retract
        </button>
        <button className="btn-secondary" onClick={() => extrude(1)} style={{flex: 1, display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'}}>
          <ArrowDownToLine size={18}/> Extrude
        </button>
      </div>
    </div>
  );
}
