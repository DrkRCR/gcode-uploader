import React from 'react';
import './SettingsPanel.css';

export default function SettingsPanel({ isOpen, onClose, powerSaver, setPowerSaver }) {
  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`settings-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="setting-group">
            <h3>Display</h3>
            <div className="setting-item">
              <label>OLED Power Saver</label>
              <button 
                className={`toggle-btn ${powerSaver ? 'active' : ''}`}
                onClick={() => setPowerSaver(!powerSaver)}
              >
                {powerSaver ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="setting-help">Blacks out the screen to save battery on OLED displays while keeping the app running.</p>
          </div>

          <div className="setting-group">
            <h3>Printer Connection</h3>
            <div className="setting-item">
              <label>Baud Rate</label>
              <select defaultValue="115200">
                <option value="115200">115200 (Default)</option>
                <option value="250000">250000</option>
                <option value="57600">57600</option>
              </select>
            </div>
            <p className="setting-help">Standard is 115200 for Ender 3 V3 SE.</p>
          </div>

          <div className="setting-group">
            <h3>GCODE Library (Coming Soon)</h3>
            <p className="setting-help">Local file storage to permanently save `.gcode` files on the device using the Android Filesystem.</p>
          </div>
          
          <div className="setting-group">
            <h3>Camera Feed (Coming Soon)</h3>
            <p className="setting-help">Use the phone's native camera to monitor the print bed and take timelapses.</p>
          </div>
        </div>
      </div>
    </>
  );
}
