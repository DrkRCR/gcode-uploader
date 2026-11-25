import { useState, useEffect } from 'react';
import { Bell, X, Send, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { 
  getNotificationConfig, 
  saveNotificationConfig, 
  requestBrowserNotificationPermission, 
  dispatchPrintNotification 
} from '../lib/notifications';

export default function NotificationModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(getNotificationConfig());
  const [browserPermission, setBrowserPermission] = useState('default');
  const [testStatus, setTestStatus] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    const updated = { ...config, [field]: val };
    setConfig(updated);
    saveNotificationConfig(updated);
  };

  const handleRequestBrowser = async () => {
    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      handleChange('browserEnabled', true);
    }
  };

  const handleTest = async () => {
    setTestStatus('Sending test alert...');
    await dispatchPrintNotification('test');
    setTestStatus('Test sent! Check your device / webhooks.');
    setTimeout(() => setTestStatus(''), 4000);
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
        maxWidth: '540px',
        padding: '1.5rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: '1.2rem',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
            <div style={{background: 'rgba(79, 70, 229, 0.2)', padding: '0.5rem', borderRadius: '8px', color: '#a5b4fc'}}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{margin: 0, fontSize: '1.1rem'}}>Notification Settings</h3>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Mobile Push, Discord & Telegram Alerts</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{background: 'transparent'}}>
            <X size={18} />
          </button>
        </div>

        {/* 1. Browser & Mobile Push */}
        <div style={{background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem'}}>
            <span style={{fontWeight: 600, fontSize: '0.9rem'}}>Browser & Mobile Push Notifications</span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px',
              background: browserPermission === 'granted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: browserPermission === 'granted' ? '#10b981' : '#f87171'
            }}>
              {browserPermission === 'granted' ? 'Permission Granted' : 'Permission Required'}
            </span>
          </div>

          <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem'}}>
            Pops a native system notification on your phone, tablet, or desktop even when the browser tab is minimized or in the background.
          </p>

          {browserPermission !== 'granted' ? (
            <button className="btn-primary" onClick={handleRequestBrowser} style={{width: '100%', fontSize: '0.85rem'}}>
              <ShieldCheck size={16} /> Enable Browser Notifications
            </button>
          ) : (
            <label style={{display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={config.browserEnabled} 
                onChange={(e) => handleChange('browserEnabled', e.target.checked)} 
              />
              <span>Send notification when filament change or print finishes</span>
            </label>
          )}
        </div>

        {/* 2. Discord Webhook */}
        <div style={{background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'}}>
          <span style={{fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem'}}>
            Discord Webhook Integration
          </span>
          <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem'}}>
            Paste a Discord channel Webhook URL to receive embedded alert cards directly in your Discord server.
          </p>
          <input 
            type="url" 
            placeholder="https://discord.com/api/webhooks/..." 
            value={config.discordUrl || ''} 
            onChange={(e) => handleChange('discordUrl', e.target.value.trim())}
            style={{width: '100%', padding: '0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}}
          />
        </div>

        {/* 3. Telegram Bot */}
        <div style={{background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)'}}>
          <span style={{fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.4rem'}}>
            Telegram Bot Integration
          </span>
          <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem'}}>
            Receive instant messages directly from your Telegram Bot.
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <input 
              type="text" 
              placeholder="Telegram Bot Token (e.g. 123456:ABC-DEF1234...)" 
              value={config.telegramBotToken || ''} 
              onChange={(e) => handleChange('telegramBotToken', e.target.value.trim())}
              style={{width: '100%', padding: '0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}}
            />
            <input 
              type="text" 
              placeholder="Telegram Chat ID (e.g. 987654321)" 
              value={config.telegramChatId || ''} 
              onChange={(e) => handleChange('telegramChatId', e.target.value.trim())}
              style={{width: '100%', padding: '0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}}
            />
          </div>
        </div>

        {/* 4. Trigger Preferences */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
            <input 
              type="checkbox" 
              checked={config.notifyOnFilamentChange} 
              onChange={(e) => handleChange('notifyOnFilamentChange', e.target.checked)} 
            />
            <span>Notify immediately on <strong>Filament Change Pause</strong></span>
          </label>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
            <input 
              type="checkbox" 
              checked={config.notifyOnPrintComplete} 
              onChange={(e) => handleChange('notifyOnPrintComplete', e.target.checked)} 
            />
            <span>Notify immediately when <strong>Print Completes</strong></span>
          </label>
        </div>

        {testStatus && (
          <div style={{fontSize: '0.8rem', color: '#a5b4fc', textAlign: 'center'}}>
            {testStatus}
          </div>
        )}

        <div style={{display: 'flex', gap: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.8rem'}}>
          <button type="button" className="btn-secondary" onClick={handleTest} style={{flex: 1, fontSize: '0.85rem'}}>
            <Send size={15} /> Send Test Alert
          </button>
          <button type="button" className="btn-primary" onClick={onClose} style={{flex: 1, fontSize: '0.85rem'}}>
            <Check size={15} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
