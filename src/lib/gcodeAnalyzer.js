export function analyzeGcode(gcodeString) {
  let maxX = 0, maxY = 0, maxZ = 0;
  let maxHotend = 0, maxBed = 0;
  let estimatedTimeStr = null;
  let estimatedTimeSeconds = null;
  let autoDetectedProfileId = null;

  let currentZ = 0;
  let currentLayer = 0;
  let totalLayers = 0;
  let currentTool = 0;

  const filamentChanges = [];
  let lastPauseLine = -999;
  let lastPauseZ = -999;

  const lines = gcodeString.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines
    if (!line) continue;

    // Check comments for metadata and layer info
    if (line.startsWith(';')) {
      const lowerLine = line.toLowerCase();

      // ETA detection
      if (lowerLine.includes('estimated printing time')) {
        const timeMatch = line.match(/estimated printing time(?:\s*\(.*?\))?\s*=\s*(.*)/i);
        if (timeMatch) {
          estimatedTimeStr = timeMatch[1].trim();
          let totalSecs = 0;
          const hMatch = estimatedTimeStr.match(/(\d+)h/i);
          if (hMatch) totalSecs += parseInt(hMatch[1]) * 3600;
          const mMatch = estimatedTimeStr.match(/(\d+)m/i);
          if (mMatch) totalSecs += parseInt(mMatch[1]) * 60;
          const sMatch = estimatedTimeStr.match(/(\d+)s/i);
          if (sMatch) totalSecs += parseInt(sMatch[1]);
          if (totalSecs > 0) estimatedTimeSeconds = totalSecs;
        }
      } else if (line.startsWith(';TIME:')) {
        // Cura time in seconds
        const seconds = parseInt(line.substring(6));
        if (!isNaN(seconds)) {
          estimatedTimeSeconds = seconds;
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          estimatedTimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
      }

      // Layer detection (Cura, PrusaSlicer, OrcaSlicer, Bambu)
      const curaLayerMatch = line.match(/^;LAYER:(\d+)/i);
      if (curaLayerMatch) {
        currentLayer = parseInt(curaLayerMatch[1]) + 1; // 1-indexed for display
        if (currentLayer > totalLayers) totalLayers = currentLayer;
      }

      const prusaLayerMatch = line.match(/^;LAYER_CHANGE/i) || line.match(/^;AFTER_LAYER_CHANGE/i);
      if (prusaLayerMatch) {
        currentLayer++;
        if (currentLayer > totalLayers) totalLayers = currentLayer;
      }

      const layerCountMatch = line.match(/;LAYER_COUNT:(\d+)/i) || line.match(/;total layers count\s*=\s*(\d+)/i);
      if (layerCountMatch) {
        const count = parseInt(layerCountMatch[1]);
        if (!isNaN(count) && count > totalLayers) totalLayers = count;
      }

      // Filament / Color change comments (ignore ,STOP or ,END tags)
      const isStopTag = lowerLine.includes(',stop') || lowerLine.includes(',end');
      const isColorChangeComment = !isStopTag && (
        lowerLine.includes('color_change') || 
        lowerLine.includes('filament change') || 
        lowerLine.includes('pause_at_height') ||
        lowerLine.includes('pause at height')
      );

      if (isColorChangeComment) {
        // Only register if not already registered for this height within 10 lines
        const isDuplicate = (i - lastPauseLine <= 10) && (Math.abs(currentZ - lastPauseZ) <= 0.05);
        if (!isDuplicate) {
          lastPauseLine = i;
          lastPauseZ = currentZ;
          filamentChanges.push({
            id: filamentChanges.length + 1,
            lineIndex: i,
            z: Number(currentZ.toFixed(2)),
            layer: currentLayer || 1,
            command: 'PAUSE (Slicer Marker)',
            type: 'comment',
            description: `Color change at Z=${currentZ.toFixed(2)}mm${currentLayer ? ` (Layer ${currentLayer})` : ''}`
          });
        }
      }

      // Auto-detection of printer profile
      if (lowerLine.includes('printer_model = mk3s')) autoDetectedProfileId = 'mk3s';
      if (lowerLine.includes('printer_model = mk4')) autoDetectedProfileId = 'mk4';
      if (lowerLine.includes('printer_model = xl')) autoDetectedProfileId = 'xl';
      if (lowerLine.includes('x1c')) autoDetectedProfileId = 'x1c';
      if (lowerLine.includes('p1p') || lowerLine.includes('p1s')) autoDetectedProfileId = 'p1p';
      if (lowerLine.includes('ender_3_v3_se') || lowerLine.includes('ender 3 v3 se')) autoDetectedProfileId = 'ender3v3se';
      else if (lowerLine.includes('ender_3_v3_ke') || lowerLine.includes('ender 3 v3 ke')) autoDetectedProfileId = 'ender3v3ke';
      else if (lowerLine.includes('ender_3_v3') || lowerLine.includes('ender 3 v3')) autoDetectedProfileId = 'ender3v3';
      else if (lowerLine.includes('ender_3') || lowerLine.includes('ender3')) autoDetectedProfileId = 'ender3';

      continue; // No commands in pure comment lines
    }

    // Strip inline comments for parsing commands
    const commentPart = line.includes(';') ? line.substring(line.indexOf(';')) : '';
    const cmd = line.split(';')[0].trim().toUpperCase();
    if (!cmd) continue;

    // Check movements and update currentZ
    if (cmd.startsWith('G0') || cmd.startsWith('G1')) {
      const parts = cmd.split(/\s+/);
      for (const part of parts) {
        if (part.startsWith('X')) {
          const val = parseFloat(part.substring(1));
          if (!isNaN(val) && val > maxX) maxX = val;
        } else if (part.startsWith('Y')) {
          const val = parseFloat(part.substring(1));
          if (!isNaN(val) && val > maxY) maxY = val;
        } else if (part.startsWith('Z')) {
          const val = parseFloat(part.substring(1));
          if (!isNaN(val)) {
            currentZ = val;
            if (val > maxZ) maxZ = val;
          }
        }
      }
    }

    // Check temperatures
    if (cmd.startsWith('M104') || cmd.startsWith('M109')) {
      const match = cmd.match(/S([\d.]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > maxHotend) maxHotend = val;
      }
    }
    if (cmd.startsWith('M140') || cmd.startsWith('M190')) {
      const match = cmd.match(/S([\d.]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > maxBed) maxBed = val;
      }
    }

    // Check for Tool change commands (T0, T1, T2...)
    const toolMatch = cmd.match(/^T(\d+)/);
    if (toolMatch) {
      const newTool = parseInt(toolMatch[1]);
      if (newTool !== currentTool) {
        // Tool change
        if (i - lastPauseLine > 10 && Math.abs(currentZ - lastPauseZ) > 0.05) {
          lastPauseLine = i;
          lastPauseZ = currentZ;
          filamentChanges.push({
            id: filamentChanges.length + 1,
            lineIndex: i,
            z: Number(currentZ.toFixed(2)),
            layer: currentLayer || 1,
            command: `T${newTool}`,
            type: 'tool_change',
            targetTool: newTool,
            description: `Tool / Filament swap to Tool ${newTool} at Z=${currentZ.toFixed(2)}mm${currentLayer ? ` (Layer ${currentLayer})` : ''}`
          });
        }
        currentTool = newTool;
      }
    }

    // Check for M600 (Filament Change)
    if (cmd === 'M600' || cmd.startsWith('M600 ')) {
      // If we previously captured a comment within 10 lines at this same height, upgrade it to M600
      const recent = filamentChanges[filamentChanges.length - 1];
      if (recent && (i - recent.lineIndex <= 10 && Math.abs(recent.z - currentZ) <= 0.05)) {
        recent.command = cmd;
        recent.type = 'm600';
        recent.lineIndex = i;
        recent.description = `Filament change (M600) at Z=${currentZ.toFixed(2)}mm${currentLayer ? ` (Layer ${currentLayer})` : ''}`;
      } else {
        lastPauseLine = i;
        lastPauseZ = currentZ;
        filamentChanges.push({
          id: filamentChanges.length + 1,
          lineIndex: i,
          z: Number(currentZ.toFixed(2)),
          layer: currentLayer || 1,
          command: cmd,
          type: 'm600',
          description: `Filament change (M600) at Z=${currentZ.toFixed(2)}mm${currentLayer ? ` (Layer ${currentLayer})` : ''}`
        });
      }
    }

    // Check for M0 / M1 (Unconditional stop / pause)
    if (cmd === 'M0' || cmd.startsWith('M0 ') || cmd === 'M1' || cmd.startsWith('M1 ') || cmd === 'M25' || cmd === 'PAUSE') {
      const recent = filamentChanges[filamentChanges.length - 1];
      if (recent && (i - recent.lineIndex <= 10 && Math.abs(recent.z - currentZ) <= 0.05)) {
        recent.command = cmd;
        recent.type = 'pause';
        recent.lineIndex = i;
      } else {
        lastPauseLine = i;
        lastPauseZ = currentZ;
        const msg = commentPart ? commentPart.replace(';', '').trim() : '';
        filamentChanges.push({
          id: filamentChanges.length + 1,
          lineIndex: i,
          z: Number(currentZ.toFixed(2)),
          layer: currentLayer || 1,
          command: cmd,
          type: 'pause',
          description: msg ? `Pause (${msg}) at Z=${currentZ.toFixed(2)}mm` : `Pause (${cmd}) at Z=${currentZ.toFixed(2)}mm${currentLayer ? ` (Layer ${currentLayer})` : ''}`
        });
      }
    }
  }

  return {
    bounds: { x: maxX, y: maxY, z: maxZ },
    temps: { hotend: maxHotend, bed: maxBed },
    estimatedTime: estimatedTimeStr,
    estimatedTimeSeconds: estimatedTimeSeconds,
    suggestedProfile: autoDetectedProfileId,
    filamentChanges,
    hasMultiFilament: filamentChanges.length > 0,
    totalColors: filamentChanges.length + 1,
    totalLayers: totalLayers || Math.max(1, Math.round(maxZ / 0.2))
  };
}
