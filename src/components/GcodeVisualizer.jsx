import { useState, useEffect, useRef, useMemo } from 'react';
import { Eye, Layers, ZoomIn, ZoomOut, RotateCcw, Navigation } from 'lucide-react';

export default function GcodeVisualizer({ gcodeLines, printIndex, isPrinting, bedSize = { x: 220, y: 220 } }) {
  const canvasRef = useRef(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Parse G-code lines into layers of movement segments
  const layers = useMemo(() => {
    if (!gcodeLines || gcodeLines.length === 0) return [];

    const parsedLayers = [];
    let currentLayer = { z: 0, segments: [] };
    let lastX = 0, lastY = 0, lastZ = 0;
    let isExtruding = false;

    // Scan lines
    for (let i = 0; i < gcodeLines.length; i++) {
      let line = gcodeLines[i].trim();
      if (!line || line.startsWith(';')) {
        // Check for layer marker
        if (line.match(/^;LAYER_CHANGE/i) || line.match(/^;LAYER:\d+/i)) {
          if (currentLayer.segments.length > 0) {
            parsedLayers.push(currentLayer);
            currentLayer = { z: lastZ, segments: [] };
          }
        }
        continue;
      }

      if (line.includes(';')) line = line.split(';')[0].trim();
      const cmd = line.toUpperCase();

      if (cmd.startsWith('G0') || cmd.startsWith('G1')) {
        let x = lastX, y = lastY, z = lastZ;
        let hasX = false, hasY = false, hasZ = false;
        let eMove = false;

        const parts = cmd.split(/\s+/);
        for (const p of parts) {
          if (p.startsWith('X')) { x = parseFloat(p.substring(1)); hasX = true; }
          else if (p.startsWith('Y')) { y = parseFloat(p.substring(1)); hasY = true; }
          else if (p.startsWith('Z')) { z = parseFloat(p.substring(1)); hasZ = true; }
          else if (p.startsWith('E')) {
            const eVal = parseFloat(p.substring(1));
            if (!isNaN(eVal) && eVal !== 0) eMove = true;
          }
        }

        // New Z height often indicates new layer if no comment was present
        if (hasZ && z !== lastZ && Math.abs(z - lastZ) >= 0.08) {
          if (currentLayer.segments.length > 0) {
            parsedLayers.push(currentLayer);
            currentLayer = { z, segments: [] };
          }
        }

        if (hasX || hasY) {
          currentLayer.segments.push({
            x1: lastX,
            y1: lastY,
            x2: x,
            y2: y,
            extrude: eMove,
            lineIndex: i
          });
          lastX = x;
          lastY = y;
        }
        if (hasZ) lastZ = z;
      }
    }

    if (currentLayer.segments.length > 0) {
      parsedLayers.push(currentLayer);
    }

    return parsedLayers;
  }, [gcodeLines]);

  // Track active layer based on printIndex when printing
  const activeLayerIndex = useMemo(() => {
    if (!layers || layers.length === 0 || !printIndex) return 0;
    for (let i = 0; i < layers.length; i++) {
      const segs = layers[i].segments;
      if (segs.length > 0) {
        const first = segs[0].lineIndex;
        const last = segs[segs.length - 1].lineIndex;
        if (printIndex >= first && printIndex <= last) {
          return i;
        }
      }
    }
    return 0;
  }, [layers, printIndex]);

  // Current nozzle coordinates
  const currentNozzle = useMemo(() => {
    if (!gcodeLines || gcodeLines.length === 0 || printIndex === 0) return { x: 0, y: 0 };
    // Scan backwards from printIndex
    for (let i = Math.min(printIndex, gcodeLines.length - 1); i >= 0; i--) {
      const line = gcodeLines[i].split(';')[0].trim().toUpperCase();
      if (line.startsWith('G0') || line.startsWith('G1')) {
        const xMatch = line.match(/X([\d.]+)/);
        const yMatch = line.match(/Y([\d.]+)/);
        if (xMatch && yMatch) {
          return { x: parseFloat(xMatch[1]), y: parseFloat(yMatch[1]) };
        }
      }
    }
    return { x: 0, y: 0 };
  }, [gcodeLines, printIndex]);

  // Sync selected layer when autoFollow is active
  useEffect(() => {
    if (autoFollow && isPrinting) {
      setSelectedLayerIndex(activeLayerIndex);
    }
  }, [autoFollow, activeLayerIndex, isPrinting]);

  // Render layer on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping: 3D printer origin is bottom-left (0,0)
    // Canvas origin is top-left (0,0)
    const margin = 20;
    const availWidth = width - margin * 2;
    const availHeight = height - margin * 2;
    const scale = Math.min(availWidth / bedSize.x, availHeight / bedSize.y) * zoom;

    const toCanvasX = (x) => margin + x * scale;
    const toCanvasY = (y) => height - margin - y * scale;

    // 1. Draw Build Plate Grid & Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(toCanvasX(0), toCanvasY(bedSize.y), bedSize.x * scale, bedSize.y * scale);

    // Grid lines every 20mm
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    for (let x = 20; x < bedSize.x; x += 20) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), toCanvasY(0));
      ctx.lineTo(toCanvasX(x), toCanvasY(bedSize.y));
      ctx.stroke();
    }
    for (let y = 20; y < bedSize.y; y += 20) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(0), toCanvasY(y));
      ctx.lineTo(toCanvasX(bedSize.x), toCanvasY(y));
      ctx.stroke();
    }

    // 2. Draw Layer Toolpaths
    const layer = layers[selectedLayerIndex];
    if (layer && layer.segments) {
      // First pass: Travel moves (faint cyan/blue dashed)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (const seg of layer.segments) {
        if (!seg.extrude) {
          ctx.moveTo(toCanvasX(seg.x1), toCanvasY(seg.y1));
          ctx.lineTo(toCanvasX(seg.x2), toCanvasY(seg.y2));
        }
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Second pass: Extrusion moves (vivid green/emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.max(1.5, 2 * zoom);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const seg of layer.segments) {
        if (seg.extrude) {
          ctx.moveTo(toCanvasX(seg.x1), toCanvasY(seg.y1));
          ctx.lineTo(toCanvasX(seg.x2), toCanvasY(seg.y2));
        }
      }
      ctx.stroke();
    }

    // 3. Draw Active Nozzle Tip
    if (currentNozzle.x > 0 || currentNozzle.y > 0) {
      const nx = toCanvasX(currentNozzle.x);
      const ny = toCanvasY(currentNozzle.y);

      // Outer glow pulse
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();

      // Inner dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Crosshair
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx - 10, ny); ctx.lineTo(nx + 10, ny);
      ctx.moveTo(nx, ny - 10); ctx.lineTo(nx, ny + 10);
      ctx.stroke();
    }
  }, [layers, selectedLayerIndex, currentNozzle, bedSize, zoom]);

  const maxLayer = Math.max(0, layers.length - 1);

  return (
    <div className="panel visualizer-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>
          <Eye size={20} color="#10b981" /> 2D Layer Visualizer
        </h2>
        <div style={{display: 'flex', gap: '0.4rem', alignItems: 'center'}}>
          <button 
            type="button" 
            className={`btn-secondary ${autoFollow ? 'active' : ''}`}
            onClick={() => setAutoFollow(!autoFollow)}
            style={{fontSize: '0.75rem', padding: '0.3rem 0.6rem', background: autoFollow ? 'rgba(16, 185, 129, 0.2)' : undefined, color: autoFollow ? '#10b981' : undefined}}
            title="Auto-switch to active printing layer"
          >
            <Navigation size={13} /> {autoFollow ? 'Tracking Live' : 'Track Off'}
          </button>
          <button type="button" className="btn-icon" onClick={() => setZoom(prev => Math.min(prev + 0.2, 2.5))} title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <button type="button" className="btn-icon" onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.8))} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button type="button" className="btn-icon" onClick={() => setZoom(1)} title="Reset Zoom">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {layers.length > 0 ? (
        <div>
          {/* Canvas Viewport */}
          <div style={{
            position: 'relative',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '280px'
          }}>
            <canvas 
              ref={canvasRef} 
              width={340} 
              height={280} 
              style={{display: 'block', maxWidth: '100%', height: 'auto'}} 
            />

            {/* Floating Position Badge */}
            <div style={{
              position: 'absolute', bottom: '8px', left: '8px', 
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              padding: '0.2rem 0.5rem', borderRadius: '4px',
              fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace'
            }}>
              X:{currentNozzle.x.toFixed(1)} Y:{currentNozzle.y.toFixed(1)} {layers[selectedLayerIndex]?.z ? `Z:${layers[selectedLayerIndex].z.toFixed(2)}` : ''}
            </div>

            <div style={{
              position: 'absolute', top: '8px', right: '8px', 
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              padding: '0.2rem 0.5rem', borderRadius: '4px',
              fontSize: '0.75rem', color: '#10b981', fontWeight: 600
            }}>
              Layer {selectedLayerIndex + 1} / {layers.length}
            </div>
          </div>

          {/* Layer Slider & Stepper */}
          <div style={{marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => { setAutoFollow(false); setSelectedLayerIndex(prev => Math.max(0, prev - 1)); }}
              style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}}
            >
              ◀
            </button>
            
            <input 
              type="range" 
              min="0" 
              max={maxLayer} 
              value={selectedLayerIndex} 
              onChange={(e) => {
                setAutoFollow(false);
                setSelectedLayerIndex(parseInt(e.target.value));
              }}
              style={{flex: 1}}
            />

            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => { setAutoFollow(false); setSelectedLayerIndex(prev => Math.min(maxLayer, prev + 1)); }}
              style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}}
            >
              ▶
            </button>
          </div>

          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
            <span>Green = Extrusion</span>
            <span>Blue = Travel</span>
            <span>Red = Nozzle</span>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '2rem 1rem', 
          textAlign: 'center', 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '8px', 
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <Layers size={32} color="var(--text-muted)" style={{margin: '0 auto 0.5rem auto', opacity: 0.5}} />
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
            Load a G-Code file in the Print Manager to preview layers and live toolpaths.
          </p>
        </div>
      )}
    </div>
  );
}
