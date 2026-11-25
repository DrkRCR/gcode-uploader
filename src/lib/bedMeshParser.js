// Parser and Helper for Marlin Bed Mesh Leveling (M420 V / G29)

/**
 * Parses terminal lines for bed mesh leveling matrix
 * Supports Bilinear Leveling Grid, Mesh Bed Leveling, UBL, and standard Marlin G29 reports
 * @param {Array<string>} terminalLogs - Array of recent terminal log lines
 * @returns {Object|null} { grid, rows, cols, min, max, range, corners, raw }
 */
export function parseBedMeshFromLogs(terminalLogs) {
  if (!Array.isArray(terminalLogs) || terminalLogs.length === 0) return null;

  // Search backwards for mesh header markers
  let headerIndex = -1;
  let type = '';

  for (let i = terminalLogs.length - 1; i >= 0; i--) {
    const raw = terminalLogs[i].replace(/^[<>]\s*/, '').trim();
    if (raw.includes('Bilinear Leveling Grid') || raw.includes('Mesh Bed Leveling') || raw.includes('Bed Topography Report') || raw.includes('Bed Leveling Grid')) {
      headerIndex = i;
      type = raw;
      break;
    }
  }

  // If no explicit header, search for grid row patterns (e.g. " 0 +0.025  -0.015")
  let gridLines = [];
  if (headerIndex !== -1) {
    for (let i = headerIndex + 1; i < Math.min(headerIndex + 25, terminalLogs.length); i++) {
      const line = terminalLogs[i].replace(/^[<>]\s*/, '').trim();
      // Stop if new command or 'ok' or empty
      if (line.startsWith('>') || line.startsWith('Recv:') && line.includes('ok') || line.includes('echo:')) {
        if (gridLines.length > 0) break;
      }
      // Check if line contains numbers like: "0 +0.02 -0.05" or "[+0.02, -0.05]"
      const matchNumbers = line.match(/[-+]?\d+\.\d+/g);
      if (matchNumbers && matchNumbers.length >= 2) {
        gridLines.push(matchNumbers.map(n => parseFloat(n)));
      }
    }
  } else {
    // Fallback: look for recent contiguous lines with floating point grid data
    for (let i = terminalLogs.length - 1; i >= Math.max(0, terminalLogs.length - 15); i--) {
      const line = terminalLogs[i].replace(/^[<>]\s*/, '').trim();
      const matchNumbers = line.match(/[-+]?\d+\.\d+/g);
      if (matchNumbers && matchNumbers.length >= 2) {
        gridLines.unshift(matchNumbers.map(n => parseFloat(n)));
      } else if (gridLines.length > 0) {
        break;
      }
    }
  }

  if (gridLines.length < 2) return null;

  // In Marlin, Row 0 is Y_MAX or Y_MIN depending on configuration, usually front row is 0 or rows-1
  const rows = gridLines.length;
  const cols = gridLines[0].length;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = gridLines[r][c];
      if (!isNaN(val)) {
        if (val < min) min = val;
        if (val > max) max = val;
        sum += val;
        count++;
      }
    }
  }

  const range = count > 0 ? Number((max - min).toFixed(3)) : 0;
  const avg = count > 0 ? Number((sum / count).toFixed(3)) : 0;

  // Extract the 4 bed corners (assuming standard grid orientation)
  // [0][0] = Back-Left or Front-Left
  const cFL = gridLines[rows - 1]?.[0] ?? 0;
  const cFR = gridLines[rows - 1]?.[cols - 1] ?? 0;
  const cBL = gridLines[0]?.[0] ?? 0;
  const cBR = gridLines[0]?.[cols - 1] ?? 0;

  return {
    grid: gridLines,
    rows,
    cols,
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    range,
    avg,
    corners: {
      frontLeft: cFL,
      frontRight: cFR,
      backLeft: cBL,
      backRight: cBR
    },
    timestamp: Date.now()
  };
}

/**
 * Generate a demo mesh for testing and visualization
 */
export function getDemoBedMesh() {
  return {
    grid: [
      [ 0.045,  0.020, -0.015, -0.040 ],
      [ 0.030,  0.005, -0.010, -0.025 ],
      [ 0.015, -0.005, -0.020, -0.035 ],
      [-0.010, -0.025, -0.045, -0.060 ]
    ],
    rows: 4,
    cols: 4,
    min: -0.060,
    max: 0.045,
    range: 0.105,
    avg: -0.012,
    corners: {
      frontLeft: -0.010,
      frontRight: -0.060,
      backLeft: 0.045,
      backRight: -0.040
    },
    timestamp: Date.now()
  };
}
