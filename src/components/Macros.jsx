import { useState, useEffect } from 'react';
import { Settings, Zap, ArrowDownToLine, Plus, Trash2, Edit, Bell, Volume2, Music, Play } from 'lucide-react';
import { playBrowserTone, playBrowserChime } from '../lib/beeper';

const DEFAULT_PROFILES = [
  { id: 'pla', name: 'Preheat PLA', hotend: 200, bed: 60 },
  { id: 'petg', name: 'Preheat PETG', hotend: 240, bed: 80 }
];

export default function Macros({ sendCommand, selectedMelody, setSelectedMelody, playMelody, melodies }) {
  const [profiles, setProfiles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showBeeperSettings, setShowBeeperSettings] = useState(false);
  const [beepFreq, setBeepFreq] = useState(1000);
  const [beepDuration, setBeepDuration] = useState(200);
  
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

  // Beeper controls (M300)
  const triggerSingleBeep = () => {
    sendCommand(`M300 S${beepFreq} P${beepDuration}`);
    playBrowserTone(beepFreq, beepDuration / 1000);
  };

  const triggerDoubleBeep = () => {
    // Send first beep
    sendCommand(`M300 S${beepFreq} P120`);
    playBrowserTone(beepFreq, 0.12);
    // Send second beep after a distinct physical delay so buffer doesn't merge them
    setTimeout(() => {
      sendCommand(`M300 S${beepFreq} P120`);
      playBrowserTone(beepFreq, 0.12);
    }, 240);
  };

  const triggerChime = () => {
    sendCommand('M300 S880 P110');
    playBrowserTone(880, 0.11);
    setTimeout(() => {
      sendCommand('M300 S1175 P110');
      playBrowserTone(1175, 0.11);
      setTimeout(() => {
        sendCommand('M300 S1397 P200');
        playBrowserTone(1397, 0.20);
      }, 160);
    }, 160);
  };

  return (
    <div className="panel macros-panel" style={{marginTop: '1.5rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2><Zap size={20} color="#fbc531" /> Quick Macros & Beeper</h2>
        <div style={{display: 'flex', gap: '0.4rem'}}>
          <button 
            type="button"
            className="btn-icon" 
            onClick={() => setShowBeeperSettings(!showBeeperSettings)} 
            title="Configure Beeper (M300)"
            style={{background: showBeeperSettings ? 'rgba(251, 197, 49, 0.2)' : 'transparent'}}
          >
            <Bell size={16} color={showBeeperSettings ? "#fbc531" : "var(--text-muted)"} />
          </button>
          <button 
            type="button"
            className="btn-icon" 
            onClick={() => setIsEditing(!isEditing)} 
            title="Edit Preheat Profiles"
            style={{background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}}
          >
            <Edit size={16} color="var(--text-muted)" />
          </button>
        </div>
      </div>

      {/* Printer Beeper Dashboard Controls */}
      <div style={{
        marginTop: '0.8rem', 
        padding: '0.8rem', 
        background: 'rgba(245, 158, 11, 0.08)', 
        border: '1px solid rgba(245, 158, 11, 0.2)', 
        borderRadius: '8px'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem'}}>
          <span style={{fontSize: '0.85rem', fontWeight: 600, color: '#fbc531', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <Volume2 size={16} /> Printer Beeper (M300)
          </span>
          <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Dashboard & Hardware Alert</span>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem'}}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={triggerSingleBeep}
            style={{fontSize: '0.8rem', padding: '0.4rem', justifyContent: 'center'}}
            title="Send M300 S1000 P200"
          >
            <Bell size={14} /> Beep 1x
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={triggerDoubleBeep}
            style={{fontSize: '0.8rem', padding: '0.4rem', justifyContent: 'center'}}
            title="Send double alert beep"
          >
            <Bell size={14} /> Double Beep
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={triggerChime}
            style={{fontSize: '0.8rem', padding: '0.4rem', justifyContent: 'center', color: '#fbc531'}}
            title="Send multi-tone notification chime"
          >
            <Zap size={14} /> Chime
          </button>
        </div>

        {/* 8-bit Song Melody Player */}
        <div style={{marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1}}>
            <Music size={15} color="#fbc531" />
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
            className="btn-primary" 
            onClick={() => playMelody?.(selectedMelody)}
            style={{fontSize: '0.8rem', padding: '0.35rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap'}}
            title="Play chosen song melody on printer buzzer and dashboard"
          >
            <Play size={13} /> Play Song
          </button>
        </div>

        {showBeeperSettings && (
          <div style={{marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '120px'}}>
              <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>Frequency (Hz)</label>
              <input 
                type="number" 
                min="100" 
                max="5000" 
                step="50" 
                value={beepFreq} 
                onChange={(e) => setBeepFreq(parseInt(e.target.value) || 1000)}
                style={{width: '100%', padding: '0.3rem', fontSize: '0.8rem'}}
              />
            </div>
            <div style={{flex: 1, minWidth: '120px'}}>
              <label style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem'}}>Duration (ms)</label>
              <input 
                type="number" 
                min="50" 
                max="2000" 
                step="50" 
                value={beepDuration} 
                onChange={(e) => setBeepDuration(parseInt(e.target.value) || 200)}
                style={{width: '100%', padding: '0.3rem', fontSize: '0.8rem'}}
              />
            </div>
          </div>
        )}
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
