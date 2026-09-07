import { useState } from 'react';
import { Fan } from 'lucide-react';

export default function FanControl({ sendCommand }) {
  const [fanSpeed, setFanSpeed] = useState(0);

  const handleSpeedChange = (speedPercent) => {
    setFanSpeed(speedPercent);
    if (speedPercent === 0) {
      sendCommand('M107'); // Fan off
    } else {
      const pwm = Math.round((speedPercent / 100) * 255);
      sendCommand(`M106 S${pwm}`);
    }
  };

  return (
    <div className="panel fan-panel" style={{marginTop: '1.5rem'}}>
      <h2><Fan size={20} color="#4cd137" /> Part Cooling Fan</h2>
      <div className="flex-row" style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'space-between'}}>
        <button className={`btn-step ${fanSpeed === 0 ? 'active' : ''}`} style={{flex: 1}} onClick={() => handleSpeedChange(0)}>Off</button>
        <button className={`btn-step ${fanSpeed === 25 ? 'active' : ''}`} style={{flex: 1}} onClick={() => handleSpeedChange(25)}>25%</button>
        <button className={`btn-step ${fanSpeed === 50 ? 'active' : ''}`} style={{flex: 1}} onClick={() => handleSpeedChange(50)}>50%</button>
        <button className={`btn-step ${fanSpeed === 75 ? 'active' : ''}`} style={{flex: 1}} onClick={() => handleSpeedChange(75)}>75%</button>
        <button className={`btn-step ${fanSpeed === 100 ? 'active' : ''}`} style={{flex: 1}} onClick={() => handleSpeedChange(100)}>100%</button>
      </div>
    </div>
  );
}
