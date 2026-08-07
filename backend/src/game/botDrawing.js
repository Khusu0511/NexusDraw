/**
 * Procedural stroke generation for the AI bot's drawing turn.
 *
 * Each function returns an array of stroke objects:
 *   { c: colorHex, s: strokeWidth, p: [{x, y}, …] }
 *
 * Coordinates are normalised to [0, 1] so they scale to any canvas size.
 */

/**
 * Generate a circle path of `steps` points.
 * @param {number} ox - Centre X (0–1)
 * @param {number} oy - Centre Y (0–1)
 * @param {number} rad - Radius (0–1)
 * @param {number} [steps=18] - Number of line segments
 * @returns {{x:number,y:number}[]}
 */
function circle(ox, oy, rad, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: ox + Math.cos(a) * rad, y: oy + Math.sin(a) * rad });
  }
  return pts;
}

/**
 * Generate an arc path between two angles (in degrees).
 * @param {number} ox - Centre X
 * @param {number} oy - Centre Y
 * @param {number} rad - Radius
 * @param {number} startDeg - Start angle in degrees
 * @param {number} endDeg - End angle in degrees
 * @param {number} [steps=12] - Number of segments
 * @returns {{x:number,y:number}[]}
 */
function arc(ox, oy, rad, startDeg, endDeg, steps = 12) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (startDeg + (endDeg - startDeg) * (i / steps)) * (Math.PI / 180);
    pts.push({ x: ox + Math.cos(a) * rad, y: oy + Math.sin(a) * rad });
  }
  return pts;
}

// ── Default drawing parameters ──────────────────────────────────────────
const CX = 0.5;        // canvas centre X
const CY = 0.5;        // canvas centre Y
const R  = 0.22;       // base radius
const K  = '#111111';   // default stroke colour (near-black)
const SW = 0.022;       // default stroke width (thick enough to survive 28×28 downsampling)

/**
 * Generate an array of strokes that visually represent `word`.
 * The server sends these to clients so the AI bot can "draw" during its turn.
 *
 * @param {string} word - One of the 25 CNN categories
 * @returns {{c:string, s:number, p:{x:number,y:number}[]}[]} Stroke array
 */
function genStrokes(word) {
  switch (word) {
    case 'circle':
      return [{ c: K, s: SW, p: circle(CX, CY, R) }];

    case 'square':
      return [{
        c: K, s: SW,
        p: [
          { x: CX - R, y: CY - R }, { x: CX + R, y: CY - R },
          { x: CX + R, y: CY + R }, { x: CX - R, y: CY + R },
          { x: CX - R, y: CY - R },
        ],
      }];

    case 'triangle':
      return [{
        c: K, s: SW,
        p: [
          { x: CX, y: CY - R },
          { x: CX + R * 0.866, y: CY + R * 0.5 },
          { x: CX - R * 0.866, y: CY + R * 0.5 },
          { x: CX, y: CY - R },
        ],
      }];

    case 'star': {
      const pts = [];
      for (let i = 0; i < 11; i++) {
        const a = (i / 5) * Math.PI - Math.PI / 2;
        const rd = i % 2 === 0 ? R : R * 0.42;
        pts.push({ x: CX + Math.cos(a) * rd, y: CY + Math.sin(a) * rd });
      }
      return [{ c: K, s: SW * 0.85, p: pts }];
    }

    case 'sun': {
      const rays = [];
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        rays.push({
          c: '#d97706', s: SW * 0.8,
          p: [
            { x: CX + Math.cos(a) * R * 0.6, y: CY + Math.sin(a) * R * 0.6 },
            { x: CX + Math.cos(a) * R,       y: CY + Math.sin(a) * R },
          ],
        });
      }
      return [{ c: '#d97706', s: SW, p: circle(CX, CY, R * 0.44) }, ...rays];
    }

    case 'moon': {
      const outer = arc(CX, CY, R, -60, 240, 18);
      const inner = arc(CX + R * 0.38, CY, R * 0.76, 240, 300, 14);
      return [{ c: '#d97706', s: SW, p: [...outer, ...inner, outer[0]] }];
    }

    case 'cloud':
      return [
        { c: K, s: SW, p: circle(CX - R * 0.38, CY + R * 0.05, R * 0.36) },
        { c: K, s: SW, p: circle(CX,             CY - R * 0.1,  R * 0.46) },
        { c: K, s: SW, p: circle(CX + R * 0.38, CY + R * 0.05, R * 0.36) },
      ];

    case 'tree':
      return [
        { c: '#166534', s: SW, p: [
          { x: CX, y: CY - R },
          { x: CX + R * 0.72, y: CY + R * 0.34 },
          { x: CX - R * 0.72, y: CY + R * 0.34 },
          { x: CX, y: CY - R },
        ]},
        { c: '#a16207', s: SW, p: [
          { x: CX - R * 0.14, y: CY + R * 0.34 },
          { x: CX - R * 0.14, y: CY + R },
          { x: CX + R * 0.14, y: CY + R },
          { x: CX + R * 0.14, y: CY + R * 0.34 },
        ]},
      ];

    case 'flower': {
      const petals = [];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        petals.push({
          c: '#ec4899', s: SW * 0.9,
          p: circle(CX + Math.cos(a) * R * 0.64, CY + Math.sin(a) * R * 0.64, R * 0.28),
        });
      }
      return [
        ...petals,
        { c: '#eab308', s: SW, p: circle(CX, CY, R * 0.24) },
        { c: '#166534', s: SW, p: [{ x: CX, y: CY + R * 0.24 }, { x: CX, y: CY + R * 1.05 }] },
      ];
    }

    case 'fish': {
      const body = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.28) {
        body.push({ x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R * 0.58 });
      }
      return [
        { c: '#2563eb', s: SW, p: body },
        { c: '#2563eb', s: SW, p: [
          { x: CX + R * 0.84, y: CY - R * 0.38 },
          { x: CX + R * 1.46, y: CY },
          { x: CX + R * 0.84, y: CY + R * 0.38 },
          { x: CX + R * 0.84, y: CY - R * 0.38 },
        ]},
      ];
    }

    case 'bird':
      return [{
        c: K, s: SW * 1.2,
        p: [
          { x: CX - R, y: CY },
          { x: CX - R * 0.5, y: CY - R * 0.45 },
          { x: CX, y: CY - R * 0.1 },
          { x: CX + R * 0.5, y: CY - R * 0.45 },
          { x: CX + R, y: CY },
        ],
      }];

    case 'butterfly':
      return [
        { c: '#7c3aed', s: SW, p: [{ x: CX, y: CY }, { x: CX - R * 0.3, y: CY - R * 0.8 }, { x: CX - R * 0.9, y: CY - R * 0.5 }, { x: CX - R * 0.8, y: CY + R * 0.1 }, { x: CX, y: CY }] },
        { c: '#7c3aed', s: SW, p: [{ x: CX, y: CY }, { x: CX - R * 0.6, y: CY + R * 0.4 }, { x: CX - R * 0.5, y: CY + R * 0.8 }, { x: CX - R * 0.1, y: CY + R * 0.4 }, { x: CX, y: CY }] },
        { c: '#7c3aed', s: SW, p: [{ x: CX, y: CY }, { x: CX + R * 0.3, y: CY - R * 0.8 }, { x: CX + R * 0.9, y: CY - R * 0.5 }, { x: CX + R * 0.8, y: CY + R * 0.1 }, { x: CX, y: CY }] },
        { c: '#7c3aed', s: SW, p: [{ x: CX, y: CY }, { x: CX + R * 0.6, y: CY + R * 0.4 }, { x: CX + R * 0.5, y: CY + R * 0.8 }, { x: CX + R * 0.1, y: CY + R * 0.4 }, { x: CX, y: CY }] },
        { c: K, s: SW * 0.8, p: [{ x: CX, y: CY - R * 0.4 }, { x: CX, y: CY + R * 0.55 }] },
      ];

    case 'cat':
      return [
        { c: K, s: SW, p: circle(CX, CY + R * 0.08, R * 0.72) },
        { c: K, s: SW, p: [{ x: CX - R * 0.52, y: CY - R * 0.52 }, { x: CX - R * 0.68, y: CY - R * 0.9 }, { x: CX - R * 0.22, y: CY - R * 0.62 }, { x: CX - R * 0.52, y: CY - R * 0.52 }] },
        { c: K, s: SW, p: [{ x: CX + R * 0.52, y: CY - R * 0.52 }, { x: CX + R * 0.68, y: CY - R * 0.9 }, { x: CX + R * 0.22, y: CY - R * 0.62 }, { x: CX + R * 0.52, y: CY - R * 0.52 }] },
        { c: K, s: SW * 0.55, p: [{ x: CX - R * 0.72, y: CY + R * 0.12 }, { x: CX - R * 0.12, y: CY + R * 0.08 }] },
        { c: K, s: SW * 0.55, p: [{ x: CX + R * 0.72, y: CY + R * 0.12 }, { x: CX + R * 0.12, y: CY + R * 0.08 }] },
      ];

    case 'dog':
      return [
        { c: K, s: SW, p: [{ x: CX - R * 0.75, y: CY + R * 0.1 }, { x: CX - R * 0.75, y: CY + R * 0.7 }, { x: CX + R * 0.75, y: CY + R * 0.7 }, { x: CX + R * 0.75, y: CY + R * 0.1 }] },
        { c: K, s: SW, p: circle(CX + R * 0.45, CY - R * 0.26, R * 0.5) },
        { c: K, s: SW, p: [{ x: CX + R * 0.1, y: CY - R * 0.5 }, { x: CX + R * 0.02, y: CY + R * 0.08 }, { x: CX + R * 0.3, y: CY + R * 0.04 }, { x: CX + R * 0.1, y: CY - R * 0.5 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.5,  y: CY + R * 0.7 }, { x: CX - R * 0.5,  y: CY + R * 1.05 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.18, y: CY + R * 0.7 }, { x: CX - R * 0.18, y: CY + R * 1.05 }] },
        { c: K, s: SW, p: [{ x: CX + R * 0.18, y: CY + R * 0.7 }, { x: CX + R * 0.18, y: CY + R * 1.05 }] },
        { c: K, s: SW, p: [{ x: CX + R * 0.5,  y: CY + R * 0.7 }, { x: CX + R * 0.5,  y: CY + R * 1.05 }] },
      ];

    case 'airplane':
      return [
        { c: K, s: SW * 1.2, p: [{ x: CX - R * 0.88, y: CY }, { x: CX + R, y: CY }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.1, y: CY - R * 0.68 }, { x: CX + R * 0.08, y: CY }, { x: CX - R * 0.1, y: CY + R * 0.68 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.72, y: CY - R * 0.32 }, { x: CX - R * 0.88, y: CY }, { x: CX - R * 0.72, y: CY + R * 0.32 }] },
      ];

    case 'bicycle':
      return [
        { c: K, s: SW, p: circle(CX - R * 0.72, CY + R * 0.3, R * 0.52) },
        { c: K, s: SW, p: circle(CX + R * 0.72, CY + R * 0.3, R * 0.52) },
        { c: K, s: SW, p: [{ x: CX - R * 0.18, y: CY - R * 0.22 }, { x: CX - R * 0.18, y: CY + R * 0.3 }, { x: CX + R * 0.72, y: CY + R * 0.3 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.72, y: CY + R * 0.3 }, { x: CX - R * 0.18, y: CY + R * 0.3 }, { x: CX + R * 0.12, y: CY - R * 0.32 }] },
        { c: K, s: SW, p: [{ x: CX + R * 0.06, y: CY - R * 0.38 }, { x: CX + R * 0.28, y: CY - R * 0.38 }, { x: CX + R * 0.22, y: CY - R * 0.22 }] },
      ];

    case 'car':
      return [
        { c: K, s: SW, p: [{ x: CX - R * 0.88, y: CY + R * 0.18 }, { x: CX - R * 0.88, y: CY + R * 0.5 }, { x: CX + R * 0.88, y: CY + R * 0.5 }, { x: CX + R * 0.88, y: CY + R * 0.18 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.52, y: CY + R * 0.18 }, { x: CX - R * 0.38, y: CY - R * 0.35 }, { x: CX + R * 0.38, y: CY - R * 0.35 }, { x: CX + R * 0.52, y: CY + R * 0.18 }] },
        { c: K, s: SW, p: circle(CX - R * 0.55, CY + R * 0.55, R * 0.28) },
        { c: K, s: SW, p: circle(CX + R * 0.55, CY + R * 0.55, R * 0.28) },
      ];

    case 'house':
      return [
        { c: K, s: SW, p: [{ x: CX - R * 1.1, y: CY + R * 0.08 }, { x: CX, y: CY - R * 0.9 }, { x: CX + R * 1.1, y: CY + R * 0.08 }] },
        { c: K, s: SW, p: [{ x: CX - R, y: CY + R * 0.08 }, { x: CX - R, y: CY + R }, { x: CX + R, y: CY + R }, { x: CX + R, y: CY + R * 0.08 }] },
      ];

    case 'book':
      return [
        { c: '#2563eb', s: SW, p: [{ x: CX - R * 0.8, y: CY - R }, { x: CX + R * 0.8, y: CY - R }, { x: CX + R * 0.8, y: CY + R }, { x: CX - R * 0.8, y: CY + R }, { x: CX - R * 0.8, y: CY - R }] },
        { c: K, s: SW,       p: [{ x: CX - R * 0.55, y: CY - R }, { x: CX - R * 0.55, y: CY + R }] },
        { c: K, s: SW * 0.6, p: [{ x: CX - R * 0.3, y: CY - R * 0.5 }, { x: CX + R * 0.6, y: CY - R * 0.5 }] },
        { c: K, s: SW * 0.6, p: [{ x: CX - R * 0.3, y: CY },           { x: CX + R * 0.6, y: CY }] },
        { c: K, s: SW * 0.6, p: [{ x: CX - R * 0.3, y: CY + R * 0.5 }, { x: CX + R * 0.6, y: CY + R * 0.5 }] },
      ];

    case 'clock':
      return [
        { c: K, s: SW,       p: circle(CX, CY, R) },
        { c: K, s: SW * 1.2, p: [{ x: CX, y: CY }, { x: CX - R * 0.5, y: CY }] },
        { c: K, s: SW * 1.2, p: [{ x: CX, y: CY }, { x: CX, y: CY - R * 0.65 }] },
      ];

    case 'guitar':
      return [
        { c: K, s: SW, p: circle(CX, CY - R * 0.32, R * 0.44) },
        { c: K, s: SW, p: circle(CX, CY + R * 0.42, R * 0.58) },
        { c: K, s: SW, p: [{ x: CX - R * 0.32, y: CY - R * 0.12 }, { x: CX - R * 0.38, y: CY + R * 0.1 }, { x: CX + R * 0.38, y: CY + R * 0.1 }, { x: CX + R * 0.32, y: CY - R * 0.12 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.12, y: CY - R * 0.72 }, { x: CX - R * 0.12, y: CY - R * 1.05 }, { x: CX + R * 0.12, y: CY - R * 1.05 }, { x: CX + R * 0.12, y: CY - R * 0.72 }] },
        { c: K, s: SW * 0.8, p: circle(CX, CY + R * 0.38, R * 0.2) },
      ];

    case 'shoe':
      return [
        { c: K, s: SW, p: arc(CX + R * 0.65, CY + R * 0.28, R * 0.3, -45, 90, 8) },
        { c: K, s: SW, p: [{ x: CX - R * 0.72, y: CY }, { x: CX - R * 0.55, y: CY - R * 0.38 }, { x: CX + R * 0.08, y: CY - R * 0.42 }, { x: CX + R * 0.38, y: CY - R * 0.1 }, { x: CX + R * 0.88, y: CY + R * 0.28 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.82, y: CY + R * 0.55 }, { x: CX + R * 0.88, y: CY + R * 0.55 }] },
        { c: K, s: SW, p: [{ x: CX - R * 0.82, y: CY + R * 0.55 }, { x: CX - R * 0.82, y: CY }] },
      ];

    case 'umbrella': {
      const ribs = [0, 36, 72, 108, 144, 180].map(deg => {
        const a = deg * Math.PI / 180;
        return {
          c: K, s: SW * 0.6,
          p: [
            { x: CX, y: CY + R * 0.05 },
            { x: CX + Math.cos(a) * R, y: CY + R * 0.05 - Math.sin(a) * R },
          ],
        };
      });
      return [
        { c: '#2563eb', s: SW, p: arc(CX, CY + R * 0.05, R, 180, 0, 16) },
        ...ribs,
        { c: K, s: SW, p: [{ x: CX, y: CY + R * 0.05 }, { x: CX, y: CY + R * 0.88 }] },
        { c: K, s: SW, p: [{ x: CX, y: CY + R * 0.88 }, { x: CX - R * 0.28, y: CY + R * 0.88 }, { x: CX - R * 0.3, y: CY + R * 0.62 }] },
      ];
    }

    case 'apple':
      return [
        { c: '#dc2626', s: SW,       p: circle(CX, CY + R * 0.08, R * 0.88) },
        { c: '#a16207', s: SW * 0.8, p: [{ x: CX + R * 0.08, y: CY - R * 0.82 }, { x: CX + R * 0.12, y: CY - R * 1.08 }] },
        { c: '#166534', s: SW * 0.7, p: [{ x: CX + R * 0.12, y: CY - R * 1.06 }, { x: CX + R * 0.42, y: CY - R * 1.16 }, { x: CX + R * 0.28, y: CY - R * 0.9 }] },
      ];

    case 'pizza':
      return [
        { c: K, s: SW,       p: [{ x: CX, y: CY - R * 0.88 }, { x: CX + R * 0.78, y: CY + R * 0.72 }, { x: CX - R * 0.78, y: CY + R * 0.72 }, { x: CX, y: CY - R * 0.88 }] },
        { c: '#a16207', s: SW * 1.5, p: arc(CX, CY + R * 0.5, R * 0.95, 220, 320, 10) },
        { c: '#dc2626', s: SW * 2.8, p: [{ x: CX, y: CY }, { x: CX + 0.001, y: CY }] },
      ];

    default:
      return [{ c: K, s: SW, p: circle(CX, CY, R) }];
  }
}

module.exports = { genStrokes };
