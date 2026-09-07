import { useState, useEffect } from 'react';
import { Thermometer, Flame, Snowflake } from 'lucide-react';

export default function TemperatureControl({ hotendTemp, hotendTarget, bedTemp, bedTarget, sendCommand }) {
  const [hTargetInput, setHTargetInput] = useState(0);
  const [bTargetInput, setBTargetInput] = useState(0);

  useEffect(() => {
    if (hotendTarget !== undefined) setHTargetInput(hotendTarget);
  }, [hotendTarget]);

  useEffect(() => {
    if (bedTarget !== undefined) setBTargetInput(bedTarget);
  }, [bedTarget]);

  const setHotend = () => {
    sendCommand(`M104 S${hTargetInput}`);
  };

  const setBed = () => {
    sendCommand(`M140 S${bTargetInput}`);
  };

  const cooldownAll = () => {
    setHTargetInput(0);
    setBTargetInput(0);
    sendCommand('M104 S0');
    sendCommand('M140 S0');
  };

  return (
    <div className="panel temperature-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>Temperatures</h2>
        <button className="btn-primary" onClick={cooldownAll} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>
          <Snowflake size={14}/> Cooldown
        </button>
      </div>
      
      <div className="temp-card hotend">
        <div className="temp-header">
          <Flame size={20} color="#ff4b4b" />
          <span>Hotend</span>
        </div>
        <div className="temp-display">
          <span className="current">{hotendTemp?.toFixed(1) || '0.0'}°C</span>
          <span className="target">/ {hotendTarget?.toFixed(1) || '0.0'}°C</span>
        </div>
        <div className="temp-controls">
          <input type="number" value={hTargetInput} onChange={e => setHTargetInput(e.target.value)} />
          <button className="btn-secondary" onClick={setHotend}>Set</button>
          <button className="btn-danger" onClick={() => { setHTargetInput(0); sendCommand('M104 S0'); }}>Off</button>
        </div>
      </div>

      <div className="temp-card bed">
        <div className="temp-header">
          <Thermometer size={20} color="#4b8cff" />
          <span>Bed</span>
        </div>
        <div className="temp-display">
          <span className="current">{bedTemp?.toFixed(1) || '0.0'}°C</span>
          <span className="target">/ {bedTarget?.toFixed(1) || '0.0'}°C</span>
        </div>
        <div className="temp-controls">
          <input type="number" value={bTargetInput} onChange={e => setBTargetInput(e.target.value)} />
          <button className="btn-secondary" onClick={setBed}>Set</button>
          <button className="btn-danger" onClick={() => { setBTargetInput(0); sendCommand('M140 S0'); }}>Off</button>
        </div>
      </div>
    </div>
  );
}
