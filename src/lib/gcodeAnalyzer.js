export function analyzeGcode(gcodeString) {
  let maxX = 0, maxY = 0, maxZ = 0;
  let maxHotend = 0, maxBed = 0;
  let estimatedTimeStr = null;
  let estimatedTimeSeconds = null;
  let autoDetectedProfileId = null;

  const lines = gcodeString.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check comments for metadata
    if (line.startsWith(';')) {
      const lowerLine = line.toLowerCase();
      // ETA detection
      if (lowerLine.includes('estimated printing time')) {
        const timeMatch = line.match(/estimated printing time(?:\s*\(.*?\))?\s*=\s*(.*)/i);
        if (timeMatch) {
          estimatedTimeStr = timeMatch[1].trim();
          // Parse "1h 2m 3s" or "30m 10s" into seconds
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
    const cmd = line.split(';')[0].trim().toUpperCase();

    // Check movements
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
          if (!isNaN(val) && val > maxZ) maxZ = val;
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
  }

  return {
    bounds: { x: maxX, y: maxY, z: maxZ },
    temps: { hotend: maxHotend, bed: maxBed },
    estimatedTime: estimatedTimeStr,
    estimatedTimeSeconds: estimatedTimeSeconds,
    suggestedProfile: autoDetectedProfileId
  };
}
