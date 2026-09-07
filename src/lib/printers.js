export const PRINTER_PROFILES = [
  // Creality
  { id: 'ender3', name: 'Creality Ender 3 (V2/Pro)', vendor: 'Creality', volume: { x: 220, y: 220, z: 250 }, maxTemp: { hotend: 260, bed: 100 } },
  { id: 'ender3s1', name: 'Creality Ender 3 S1', vendor: 'Creality', volume: { x: 220, y: 220, z: 270 }, maxTemp: { hotend: 260, bed: 100 } },
  { id: 'ender3v3se', name: 'Creality Ender 3 V3 SE', vendor: 'Creality', volume: { x: 220, y: 220, z: 250 }, maxTemp: { hotend: 260, bed: 100 } },
  { id: 'ender3v3ke', name: 'Creality Ender 3 V3 KE', vendor: 'Creality', volume: { x: 220, y: 220, z: 240 }, maxTemp: { hotend: 300, bed: 100 } },
  { id: 'ender3v3', name: 'Creality Ender 3 V3', vendor: 'Creality', volume: { x: 220, y: 220, z: 250 }, maxTemp: { hotend: 300, bed: 110 } },
  { id: 'k1', name: 'Creality K1 / K1C', vendor: 'Creality', volume: { x: 220, y: 220, z: 250 }, maxTemp: { hotend: 300, bed: 100 } },
  { id: 'k1max', name: 'Creality K1 Max', vendor: 'Creality', volume: { x: 300, y: 300, z: 300 }, maxTemp: { hotend: 300, bed: 120 } },
  
  // Bambu Lab
  { id: 'x1c', name: 'Bambu Lab X1 Carbon', vendor: 'Bambu Lab', volume: { x: 256, y: 256, z: 256 }, maxTemp: { hotend: 300, bed: 110 } },
  { id: 'p1p', name: 'Bambu Lab P1P / P1S / A1', vendor: 'Bambu Lab', volume: { x: 256, y: 256, z: 256 }, maxTemp: { hotend: 300, bed: 100 } },
  { id: 'a1mini', name: 'Bambu Lab A1 Mini', vendor: 'Bambu Lab', volume: { x: 180, y: 180, z: 180 }, maxTemp: { hotend: 300, bed: 80 } },

  // Anycubic
  { id: 'kobra2', name: 'Anycubic Kobra 2 / Pro', vendor: 'Anycubic', volume: { x: 220, y: 220, z: 250 }, maxTemp: { hotend: 260, bed: 110 } },
  { id: 'kobra2max', name: 'Anycubic Kobra 2 Max', vendor: 'Anycubic', volume: { x: 420, y: 420, z: 500 }, maxTemp: { hotend: 260, bed: 90 } },

  // Elegoo
  { id: 'neptune3pro', name: 'Elegoo Neptune 3 Pro', vendor: 'Elegoo', volume: { x: 225, y: 225, z: 280 }, maxTemp: { hotend: 260, bed: 100 } },
  { id: 'neptune4pro', name: 'Elegoo Neptune 4 Pro', vendor: 'Elegoo', volume: { x: 225, y: 225, z: 265 }, maxTemp: { hotend: 300, bed: 110 } },
  { id: 'neptune4max', name: 'Elegoo Neptune 4 Max', vendor: 'Elegoo', volume: { x: 420, y: 420, z: 480 }, maxTemp: { hotend: 300, bed: 85 } },

  // Prusa Research
  { id: 'mk3s', name: 'Prusa i3 MK3S+', vendor: 'Prusa', volume: { x: 250, y: 210, z: 210 }, maxTemp: { hotend: 300, bed: 120 } },
  { id: 'mk4', name: 'Prusa MK4', vendor: 'Prusa', volume: { x: 250, y: 210, z: 220 }, maxTemp: { hotend: 290, bed: 120 } },
  { id: 'xl', name: 'Prusa XL', vendor: 'Prusa', volume: { x: 360, y: 360, z: 360 }, maxTemp: { hotend: 290, bed: 120 } },
  
  // Generic
  { id: 'custom', name: 'Custom Printer', vendor: 'Other', volume: { x: 300, y: 300, z: 300 }, maxTemp: { hotend: 300, bed: 120 } }
];

export const getProfileById = (id) => PRINTER_PROFILES.find(p => p.id === id) || PRINTER_PROFILES.find(p => p.id === 'custom');
