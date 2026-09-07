import { useState, useEffect } from 'react';
import { Settings, Zap, ArrowDownToLine, Plus, Trash2, Edit } from 'lucide-react';

const DEFAULT_PROFILES = [
  { id: 'pla', name: 'Preheat PLA', hotend: 200, bed: 60 },
  { id: 'petg', name: 'Preheat PETG', hotend: 240, bed: 80 }
];

export default function Macros({ sendCommand }) {
  const [profiles, setProfiles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editor state
  const [newName, setNewName] = useState('');
  const [newHotend, setNewHotend] = useState(200);
  const [newBed, setNewBed] = useState(60);

  useEffect(() => {
    const saved = localStorage.getItem('preheatProfiles');
    if (saved) {
      setProfiles(JSON.parse(saved));
    } else {
      setProfiles(DEFAULT_PROFILES);
    }
  }, []);

  const saveProfiles = (newProfiles) => {
    setProfiles(newProfiles);
    localStorage.setItem('preheatProfiles', JSON.stringify(newProfiles));
  };

  const handleMacro = (type) => {
    if (type === 'motors_off') {
      sendCommand('M84');
    } else if (type === 'level') {
      sendCommand('G28');
      sendCommand('G29');
    }
  };

  const applyPreheat = (p) => {
    sendCommand(`M104 S${p.hotend}`);
    sendCommand(`M140 S${p.bed}`);
  };

  const addProfile = () => {
    if (!newName) return;
    const newProfile = {
      id: Date.now().toString(),
      name: newName,
      hotend: newHotend || 0,
      bed: newBed || 0
    };
    saveProfiles([...profiles, newProfile]);
    setNewName('');
  };

  const deleteProfile = (id) => {
    saveProfiles(profiles.filter(p => p.id !== id));
  };

  return (
    <div className="panel macros-panel" style={{marginTop: '1.5rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2><Zap size={20} color="#fbc531" /> Quick Macros</h2>
        <button className="btn-icon" onClick={() => setIsEditing(!isEditing)} title="Edit Preheat Profiles">
          <Edit size={16} color="var(--text-muted)" />
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '1rem'}}>
        <button className="btn-secondary" onClick={() => handleMacro('motors_off')} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'}}>
          <Settings size={18} /> Disable Steppers
        </button>
        <button className="btn-secondary" onClick={() => handleMacro('level')} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'}}>
          <ArrowDownToLine size={18} /> Auto Bed Level
        </button>
        
        {!isEditing && profiles.map(p => (
          <button key={p.id} className="btn-secondary" onClick={() => applyPreheat(p)} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'}}>
            <Zap size={18} /> {p.name}
          </button>
        ))}
      </div>

      {isEditing && (
        <div style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
          <h3 style={{fontSize: '1rem', marginBottom: '1rem'}}>Edit Preheat Profiles</h3>
          {profiles.map(p => (
            <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px'}}>
              <span style={{fontSize: '0.9rem'}}>{p.name} ({p.hotend}°C / {p.bed}°C)</span>
              <button className="btn-icon" onClick={() => deleteProfile(p.id)}>
                <Trash2 size={16} color="var(--accent-red)" />
              </button>
            </div>
          ))}
          
          <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap'}}>
            <input type="text" placeholder="Name (e.g. TPU)" value={newName} onChange={e => setNewName(e.target.value)} style={{flex: '1 1 100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}} />
            <input type="number" placeholder="Hotend" value={newHotend} onChange={e => setNewHotend(parseInt(e.target.value))} style={{flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}} />
            <input type="number" placeholder="Bed" value={newBed} onChange={e => setNewBed(parseInt(e.target.value))} style={{flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}} />
            <button className="btn-primary" onClick={addProfile} style={{padding: '0 1rem'}}>
              <Plus size={18} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
