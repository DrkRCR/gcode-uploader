// Storage and Recovery Manager for "Save My Print" (Crash & Disconnect Recovery)

const DB_NAME = 'InfinityLayersRecoveryDB';
const DB_VERSION = 1;
const STORE_NAME = 'recovery_jobs';
const META_STORAGE_KEY = 'infinity_print_recovery_meta';

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save recovery snapshot to IndexedDB and localStorage
 */
export async function saveRecoverySnapshot(meta, gcodeContent) {
  if (typeof window === 'undefined') return;

  // 1. Save metadata to localStorage for instant check on boot
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('Failed to save recovery metadata to localStorage:', err);
  }

  // 2. Save full G-code payload to IndexedDB (asynchronously)
  if (gcodeContent) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(gcodeContent, 'current_gcode');
    } catch (err) {
      console.warn('Failed to save G-code to IndexedDB:', err);
    }
  }
}

/**
 * Check if an uncompleted print recovery job exists
 */
export function getRecoveryMeta() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read recovery meta:', err);
    return null;
  }
}

/**
 * Retrieve saved G-code content from IndexedDB
 */
export async function getRecoveryGcode() {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_gcode');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve G-code from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear the recovery job when print finishes or is discarded
 */
export async function clearRecoverySnapshot() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(META_STORAGE_KEY);
  } catch {}

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('current_gcode');
  } catch {}
}

/**
 * Generate safe restart G-code sequence that resumes mid-air without crashing into the printed part
 * @param {Object} meta - { lastZ, lastLayer, lastX, lastY, hotendTarget, bedTarget, printIndex }
 * @param {Array<string>} remainingLines - Remaining lines from the point of failure
 * @returns {Array<string>} Safe G-code lines to execute
 */
export function buildRecoveryGcode(meta, remainingLines) {
  const {
    lastZ = 0.2,
    lastX = 100,
    lastY = 100,
    hotendTarget = 200,
    bedTarget = 60
  } = meta;

  const safeZ = Number((parseFloat(lastZ) + 3.0).toFixed(2));
  const zVal = Number(parseFloat(lastZ).toFixed(2));
  const xVal = Number(parseFloat(lastX).toFixed(2));
  const yVal = Number(parseFloat(lastY).toFixed(2));

  const recoveryHeader = [
    `; ==========================================`,
    `; INFINITY LAYERS - "SAVE MY PRINT" RECOVERY`,
    `; Resuming at Z=${zVal}mm | Target: X${xVal} Y${yVal}`,
    `; ==========================================`,
    `G21 ; Millimeter units`,
    `G90 ; Absolute positioning`,
    `M83 ; Extruder relative mode`,
    `; 1. Restore Temperatures`,
    `M140 S${Math.round(bedTarget || 60)} ; Heat bed`,
    `M104 S${Math.round(hotendTarget || 200)} ; Heat hotend`,
    `M190 S${Math.round(bedTarget || 60)} ; Wait bed temp`,
    `M109 S${Math.round(hotendTarget || 200)} ; Wait hotend temp`,
    `; 2. Safe Homing - HOME ONLY X AND Y (NEVER Z!)`,
    `G28 X Y ; Home X & Y only away from part`,
    `; 3. Calibrate Z-Height virtual position`,
    `G92 Z${zVal} ; Inform firmware nozzle is at previous layer Z`,
    `G1 Z${safeZ} F1200 ; Lift 3mm above part for clearance`,
    `; 4. Travel above the exact interrupted point`,
    `G1 X${xVal} Y${yVal} F3000 ; Move above last position`,
    `G1 Z${zVal} F1000 ; Lower to layer height`,
    `; 5. Prime nozzle to restart clean extrusion`,
    `G1 E2.0 F1500 ; Micro-prime`,
    `G92 E0 ; Reset extrusion reference`,
    `; ==========================================`,
    `; RESUMING REMAINING G-CODE`,
    `; ==========================================`
  ];

  return [...recoveryHeader, ...remainingLines];
}
