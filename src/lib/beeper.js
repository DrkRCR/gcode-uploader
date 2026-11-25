// Beeper, Melody, and Audio notification helper for 3D Printer and Dashboard

// Browser Web Audio API context (lazy-initialized upon user gesture)
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 8-bit Song Melodies: { f: frequency_hz, d: duration_ms } (f: 0 is rest)
export const MELODIES = {
  cheques: {
    name: "Cheques - Shubh",
    emoji: "💵",
    notes: [
      // "Haan..."
      { f: 392, d: 240 }, // G4
      { f: 0,   d: 90 },  // rest
      // "aivein taan ni balliye trend chalde"
      { f: 392, d: 130 }, // G4
      { f: 392, d: 130 }, // G4
      { f: 349, d: 130 }, // F4
      { f: 311, d: 130 }, // Eb4
      { f: 262, d: 150 }, // C4
      { f: 311, d: 160 }, // Eb4
      { f: 349, d: 200 }, // F4
      { f: 349, d: 260 }, // F4
      { f: 0,   d: 110 }, // rest
      // "jehde aunde saade raah vich bend karte"
      { f: 392, d: 130 }, // G4
      { f: 392, d: 130 }, // G4
      { f: 349, d: 130 }, // F4
      { f: 311, d: 130 }, // Eb4
      { f: 262, d: 150 }, // C4
      { f: 311, d: 160 }, // Eb4
      { f: 294, d: 200 }, // D4
      { f: 262, d: 330 }, // C4
      { f: 0,   d: 130 }, // rest
      // "Sign kardi aa kudi cheques..."
      { f: 392, d: 150 }, // G4 "Sign"
      { f: 466, d: 180 }, // Bb4 "kar-"
      { f: 392, d: 160 }, // G4 "-di"
      { f: 349, d: 160 }, // F4 "aa"
      { f: 311, d: 180 }, // Eb4 "ku-"
      { f: 262, d: 450 }  // C4 "-di cheques!"
    ]
  },
  rickroll: {
    name: "Rickroll (Never Gonna Give You Up)",
    emoji: "🕺",
    notes: [
      { f: 294, d: 150 }, // D4 "Ne-"
      { f: 330, d: 150 }, // E4 "-ver"
      { f: 392, d: 150 }, // G4 "gon-"
      { f: 330, d: 150 }, // E4 "-na"
      { f: 494, d: 350 }, // B4 "give"
      { f: 494, d: 300 }, // B4 "you"
      { f: 440, d: 400 }, // A4 "up"
      { f: 0,   d: 120 }, // rest
      { f: 294, d: 150 }, // D4 "Ne-"
      { f: 330, d: 150 }, // E4 "-ver"
      { f: 392, d: 150 }, // G4 "gon-"
      { f: 330, d: 150 }, // E4 "-na"
      { f: 440, d: 350 }, // A4 "let"
      { f: 440, d: 300 }, // A4 "you"
      { f: 392, d: 450 }  // G4 "down"
    ]
  },
  mario: {
    name: "Super Mario Bros (Power Up)",
    emoji: "🍄",
    notes: [
      { f: 659, d: 110 }, // E5
      { f: 0,   d: 30 },
      { f: 659, d: 110 }, // E5
      { f: 0,   d: 90 },
      { f: 659, d: 110 }, // E5
      { f: 0,   d: 90 },
      { f: 523, d: 110 }, // C5
      { f: 659, d: 140 }, // E5
      { f: 0,   d: 60 },
      { f: 784, d: 260 }, // G5
      { f: 0,   d: 140 },
      { f: 392, d: 260 }  // G4
    ]
  },
  coffin: {
    name: "Coffin Dance (Astronomia)",
    emoji: "⚰️",
    notes: [
      { f: 370, d: 150 }, // F#4
      { f: 370, d: 150 }, // F#4
      { f: 370, d: 150 }, // F#4
      { f: 370, d: 150 }, // F#4
      { f: 440, d: 200 }, // A4
      { f: 415, d: 200 }, // G#4
      { f: 370, d: 200 }, // F#4
      { f: 277, d: 200 }, // C#4
      { f: 554, d: 250 }, // C#5
      { f: 494, d: 200 }, // B4
      { f: 440, d: 200 }, // A4
      { f: 415, d: 250 }, // G#4
      { f: 370, d: 350 }  // F#4
    ]
  },
  imperial: {
    name: "Star Wars Imperial March",
    emoji: "⚔️",
    notes: [
      { f: 440, d: 280 }, // A4
      { f: 440, d: 280 }, // A4
      { f: 440, d: 280 }, // A4
      { f: 349, d: 200 }, // F4
      { f: 523, d: 100 }, // C5
      { f: 440, d: 280 }, // A4
      { f: 349, d: 200 }, // F4
      { f: 523, d: 100 }, // C5
      { f: 440, d: 450 }  // A4
    ]
  },
  victory: {
    name: "Final Fantasy Victory Fanfare",
    emoji: "🏆",
    notes: [
      { f: 523, d: 110 }, // C5
      { f: 523, d: 110 }, // C5
      { f: 523, d: 110 }, // C5
      { f: 523, d: 280 }, // C5
      { f: 415, d: 280 }, // G#4
      { f: 466, d: 280 }, // A#4
      { f: 523, d: 200 }, // C5
      { f: 0,   d: 60 },
      { f: 466, d: 140 }, // A#4
      { f: 523, d: 500 }  // C5
    ]
  },
  nokia: {
    name: "Nokia Ringtone",
    emoji: "📱",
    notes: [
      { f: 659, d: 120 }, // E5
      { f: 587, d: 120 }, // D5
      { f: 370, d: 220 }, // F#4
      { f: 415, d: 220 }, // G#4
      { f: 554, d: 120 }, // C#5
      { f: 494, d: 120 }, // B4
      { f: 294, d: 220 }, // D4
      { f: 330, d: 220 }, // E4
      { f: 494, d: 120 }, // B4
      { f: 440, d: 120 }, // A4
      { f: 277, d: 220 }, // C#4
      { f: 330, d: 220 }, // E4
      { f: 440, d: 400 }  // A4
    ]
  },
  chime: {
    name: "Simple Triad Chime",
    emoji: "🔔",
    notes: [
      { f: 659, d: 150 }, // E5
      { f: 880, d: 150 }, // A5
      { f: 1318, d: 350 } // E6
    ]
  }
};

/**
 * Play a synthesized tone through browser speakers
 */
export function playBrowserTone(frequency = 880, duration = 0.2, type = 'square') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Browser audio tone error:', err);
  }
}

/**
 * Play full melody sequence in the browser via Web Audio API
 */
export function playBrowserMelody(melodyKey = 'cheques') {
  try {
    const melody = MELODIES[melodyKey] || MELODIES.cheques;
    const ctx = getAudioContext();
    if (!ctx) return;

    let currentTimeOffset = 0.05;

    melody.notes.forEach(note => {
      const durSec = note.d / 1000;
      if (note.f > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Use square wave for that authentic 8-bit retro sound chip timbre
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, ctx.currentTime + currentTimeOffset);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + currentTimeOffset);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + currentTimeOffset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + currentTimeOffset + durSec - 0.01);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + currentTimeOffset);
        osc.stop(ctx.currentTime + currentTimeOffset + durSec);
      }
      currentTimeOffset += durSec + 0.025; // Small staccato gap
    });
  } catch (err) {
    console.warn('Browser melody playback error:', err);
  }
}

/**
 * Play classic attention chime in browser
 */
export function playBrowserChime() {
  playBrowserMelody('chime');
}

/**
 * Send M300 command to physical printer buzzer
 */
export function sendPrinterBeep(sendCommand, freq = 1000, duration = 200) {
  if (typeof sendCommand === 'function') {
    sendCommand(`M300 S${Math.round(freq)} P${Math.round(duration)}`);
  }
}

/**
 * Send full song melody to printer buzzer (M300) and optionally browser audio
 */
export function playPrinterMelody(sendCommand, melodyKey = 'cheques', browserAudio = true) {
  const melody = MELODIES[melodyKey] || MELODIES.cheques;

  // 1. Play rich 8-bit multi-tonal melody in browser speakers
  if (browserAudio) {
    playBrowserMelody(melodyKey);
  }

  // 2. Pace commands to printer buzzer with real-time delays
  // This prevents Marlin's serial ring buffer from swallowing all notes into 1 drone
  if (typeof sendCommand === 'function') {
    let delay = 0;
    melody.notes.forEach((note) => {
      const dur = note.d;
      if (note.f > 0) {
        const pulseDur = Math.max(40, Math.min(dur - 20, 200));
        setTimeout(() => {
          sendCommand(`M300 S${Math.round(note.f)} P${pulseDur}`);
        }, delay);
      }
      delay += dur + 60; // note duration + 60ms gap so notes never merge
    });
  }
}

/**
 * Trigger filament change alert with chosen song melody
 */
export function triggerFilamentChangeAlert(sendCommand, options = {}) {
  const {
    melodyKey = 'cheques',
    printerBeeper = true,
    browserSound = true
  } = options;

  if (printerBeeper && typeof sendCommand === 'function') {
    playPrinterMelody(sendCommand, melodyKey, browserSound);
  } else if (browserSound) {
    playBrowserMelody(melodyKey);
  }
}
