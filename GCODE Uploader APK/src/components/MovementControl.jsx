import { useState } from 'react';
import { Home, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronsUp, ChevronsDown } from 'lucide-react';

export default function MovementControl({ sendCommand }) {
  const [step, setStep] = useState(10);

  const move = (axis, direction) => {
    sendCommand('G91'); // Relative movement
    sendCommand(`G1 ${axis}${direction > 0 ? '' : '-'}${step} F3000`);
    sendCommand('G90'); // Back to absolute
  };

  const home = (axis = '') => {
    sendCommand(`G28 ${axis}`);
  };

  return (
    <div className="panel movement-panel">
      <h2>Movement</h2>
      
      <div className="step-selector">
        {[0.1, 1, 10, 50].map(val => (
          <button key={val} className={`btn-step ${step === val ? 'active' : ''}`} onClick={() => setStep(val)}>
            {val}mm
          </button>
        ))}
      </div>

      <div className="d-pad-container">
        <div className="d-pad xy-pad">
          <div className="pad-row">
            <button className="pad-btn empty"></button>
            <button className="pad-btn up" onClick={() => move('Y', 1)}><ArrowUp size={24}/></button>
            <button className="pad-btn empty"></button>
          </div>
          <div className="pad-row">
            <button className="pad-btn left" onClick={() => move('X', -1)}><ArrowLeft size={24}/></button>
            <button className="pad-btn home" onClick={() => home('X Y')}><Home size={20}/></button>
            <button className="pad-btn right" onClick={() => move('X', 1)}><ArrowRight size={24}/></button>
          </div>
          <div className="pad-row">
            <button className="pad-btn empty"></button>
            <button className="pad-btn down" onClick={() => move('Y', -1)}><ArrowDown size={24}/></button>
            <button className="pad-btn empty"></button>
          </div>
        </div>

        <div className="z-pad">
          <button className="pad-btn" onClick={() => move('Z', 1)}><ChevronsUp size={20}/>Z+</button>
          <button className="pad-btn home-z" onClick={() => home('Z')}><Home size={18}/>Z</button>
          <button className="pad-btn" onClick={() => move('Z', -1)}><ChevronsDown size={20}/>Z-</button>
        </div>
      </div>
      
      <button className="btn-secondary btn-full" onClick={() => home('')} style={{marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'}}>
        <Home size={18}/> Home All Axes
      </button>
    </div>
  );
}
