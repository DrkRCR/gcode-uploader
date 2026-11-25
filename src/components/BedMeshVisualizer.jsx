import { useState, useEffect } from 'react';
import { Grid, RefreshCw, Layers, CheckCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { parseBedMeshFromLogs, getDemoBedMesh } from '../lib/bedMeshParser';

export default function BedMeshVisualizer({ terminalLogs, sendCommand }) {
  const [meshData, setMeshData] = useState(() => {
    // Try to load cached mesh from localStorage
    try {
      const saved = localStorage.getItem('last_bed_mesh');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [isQuerying, setIsQuerying] = useState(false);

  // Watch terminal logs whenever they update
  useEffect(() => {
    if (!terminalLogs || terminalLogs.length === 0) return;
    const parsed = parseBedMeshFromLogs(terminalLogs);
    if (parsed) {
      setMeshData(parsed);
      try {
        localStorage.setItem('last_bed_mesh', JSON.stringify(parsed));
      } catch {}
      setIsQuerying(false);
    }
  }, [terminalLogs]);

  const queryMesh = () => {
    setIsQuerying(true);
    sendCommand('M420 V'); // Marlin report bed leveling mesh
  };

  const runAutoLevel = () => {
    if (window.confirm("Start G29 Auto Bed Leveling probing sequence? (Ensure nozzle and bed are clear of objects)")) {
      setIsQuerying(true);
      sendCommand('G28'); // Home all axes first
      sendCommand('G29'); // Auto bed level
      sendCommand('M420 V'); // Print report
    }
  };

  const loadDemo = () => {
    const demo = getDemoBedMesh();
    setMeshData(demo);
  };

  // Helper to get color for height value (deviation in mm)
  const getColorForHeight = (val, min, max) => {
    if (val === undefined || isNaN(val)) return 'rgba(255,255,255,0.05)';
    // Green zone: within ±0.03mm of 0
    if (Math.abs(val) <= 0.03) {
      return 'rgba(16, 185, 129, 0.75)'; // vibrant green
    }
    if (val > 0) {
      // High (orange -> red)
      const intensity = Math.min(1, val / Math.max(0.2, max));
      return `rgba(239, 68, 68, ${0.4 + intensity * 0.55})`;
    } else {
      // Low (cyan -> blue)
      const intensity = Math.min(1, Math.abs(val) / Math.max(0.2, Math.abs(min)));
      return `rgba(59, 130, 246, ${0.4 + intensity * 0.55})`;
    }
  };

  return (
    <div className="panel bed-mesh-panel" style={{marginTop: '1.5rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>
          <Grid size={20} color="#38bdf8" /> Bed Mesh Leveling
        </h2>
        <div style={{display: 'flex', gap: '0.4rem'}}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={queryMesh}
            style={{fontSize: '0.75rem', padding: '0.3rem 0.6rem'}}
            title="Send M420 V to read stored bed leveling mesh"
          >
            <RefreshCw size={13} className={isQuerying ? "spin-icon" : ""} /> Read Mesh (M420 V)
          </button>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={runAutoLevel}
            style={{fontSize: '0.75rem', padding: '0.3rem 0.6rem'}}
            title="Home and run G29 Auto Bed Level probe"
          >
            <Play size={12} /> Probe (G29)
          </button>
        </div>
      </div>

      {meshData ? (
        <div>
          {/* Summary Stats */}
          <div style={{
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '0.5rem', 
            marginTop: '0.8rem', 
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <div style={{background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px'}}>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block'}}>Deviation Range</span>
              <strong style={{
                fontSize: '1rem', 
                color: meshData.range <= 0.15 ? '#10b981' : meshData.range <= 0.3 ? '#f59e0b' : '#ef4444'
              }}>
                {meshData.range} mm
              </strong>
            </div>
            <div style={{background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px'}}>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block'}}>Max Height</span>
              <strong style={{fontSize: '1rem', color: '#f87171'}}>+{meshData.max} mm</strong>
            </div>
            <div style={{background: 'rgba(0,0,0,0.25)', padding: '0.5rem', borderRadius: '8px'}}>
              <span style={{fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block'}}>Min Height</span>
              <strong style={{fontSize: '1rem', color: '#60a5fa'}}>{meshData.min} mm</strong>
            </div>
          </div>

          {/* Color Heatmap Grid */}
          <div style={{
            background: 'rgba(0,0,0,0.3)', 
            padding: '1rem', 
            borderRadius: '10px', 
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{
              display: 'grid', 
              gridTemplateColumns: `repeat(${meshData.cols}, 1fr)`, 
              gap: '6px'
            }}>
              {meshData.grid.map((row, r) => 
                row.map((val, c) => (
                  <div 
                    key={`${r}-${c}`}
                    style={{
                      background: getColorForHeight(val, meshData.min, meshData.max),
                      borderRadius: '6px',
                      padding: '0.6rem 0.2rem',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      transition: 'all 0.2s'
                    }}
                    title={`Point [${c}, ${r}]: ${val > 0 ? `+${val}` : val}mm`}
                  >
                    {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                  </div>
                ))
              )}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
              <span>← Front (Y Min)</span>
              <span>Grid: {meshData.cols}x{meshData.rows} Probe Points</span>
              <span>Back (Y Max) →</span>
            </div>
          </div>

          {/* Corner Screw Adjustment Advice */}
          {meshData.corners && (
            <div style={{marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.8rem'}}>
              <strong style={{color: '#38bdf8', display: 'block', marginBottom: '0.4rem'}}>
                Corner Leveling Recommendations:
              </strong>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', color: 'var(--text-main)'}}>
                <div>• Front-Left: <strong>{meshData.corners.frontLeft > 0 ? `+${meshData.corners.frontLeft}` : meshData.corners.frontLeft}mm</strong></div>
                <div>• Front-Right: <strong>{meshData.corners.frontRight > 0 ? `+${meshData.corners.frontRight}` : meshData.corners.frontRight}mm</strong></div>
                <div>• Back-Left: <strong>{meshData.corners.backLeft > 0 ? `+${meshData.corners.backLeft}` : meshData.corners.backLeft}mm</strong></div>
                <div>• Back-Right: <strong>{meshData.corners.backRight > 0 ? `+${meshData.corners.backRight}` : meshData.corners.backRight}mm</strong></div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '1.5rem', 
          textAlign: 'center', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px', 
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem'}}>
            No bed mesh data received yet. Click <strong>Read Mesh</strong> to query stored points, or <strong>Probe</strong> to run a fresh leveling sequence.
          </p>
          <button type="button" className="btn-secondary" onClick={loadDemo} style={{fontSize: '0.8rem', margin: '0 auto'}}>
            Load Sample Bed Mesh Preview
          </button>
        </div>
      )}
    </div>
  );
}
