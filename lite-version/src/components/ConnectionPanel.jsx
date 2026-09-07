import { useState } from 'react';
import { Plug, Unplug, Printer } from 'lucide-react';
import { PRINTER_PROFILES } from '../lib/printers';

export default function ConnectionPanel({ isConnected, onConnect, onDisconnect, activeProfileId, setActiveProfileId }) {
  const [baudRate, setBaudRate] = useState(115200);

  return (
    <div className="panel connection-panel">
      <h2><Printer size={20} /> Connection & Profile</h2>
      <div className="connection-controls" style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
        <select value={activeProfileId} onChange={(e) => setActiveProfileId(e.target.value)} disabled={isConnected} title="Printer Profile" className="profile-select">
          {PRINTER_PROFILES.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <select value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))} disabled={isConnected} title="Baud Rate" style={{flex: 1}}>
            <option value={9600}>9600</option>
            <option value={57600}>57600</option>
            <option value={115200}>115200</option>
            <option value={250000}>250000</option>
          </select>
          {isConnected ? (
            <button onClick={onDisconnect} className="btn-danger" style={{whiteSpace:'nowrap', flex: 1}}>
              <Unplug size={16} /> Disconnect
            </button>
          ) : (
            <button onClick={() => onConnect(baudRate)} className="btn-primary" style={{whiteSpace:'nowrap', flex: 1}}>
              <Plug size={16} /> Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
