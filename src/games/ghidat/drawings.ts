import type { LineId } from '../../voice/lines';
import { arc, join, line, type Pt } from '../nisip/geometry';
import { outsideRun, pointInPolygon, type Region } from './logic';

/** One step: the parts to trace (any order, any direction, several strokes) and what becomes colourable. */
export type Step = { voice: LineId; paths: Pt[][]; regions: Region[] };
export type Drawing = { id: string; label: string; steps: Step[] };

// Unit box 0..1, y down. Closed shapes start at the top and repeat their first point.

/** Ellipse sampled every 6°, rotated by `rot` degrees (clockwise on screen), starting at its top. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Pt[] {
  const t = (rot * Math.PI) / 180;
  return arc(0, 0, rx, ry, -90, 270).map(({ x, y }) => ({
    x: cx + x * Math.cos(t) - y * Math.sin(t),
    y: cy + x * Math.sin(t) + y * Math.cos(t),
  }));
}
export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);
export const poly = (...pts: [number, number][]) => line(...pts, pts[0]);
/** The part of `shape` that shows outside `cover` (an ear behind the head): what she traces. */
export const outside = (shape: Pt[], cover: Pt[]) => outsideRun(shape, (p) => pointInPolygon(p, cover));

const INK = '#3b2a4a';
const WHITE = '#ffffff';
const eyeRegion = (x: number, y: number, z: number): Region => ({
  pts: circle(x, y, 0.032),
  z,
  suggest: WHITE,
  pad: 0,
});
const dots = (...pts: [number, number][]) => pts.map(([x, y]) => [{ x, y }]);
const smile = (cx: number, cy: number, rx: number, ry: number) => arc(cx, cy, rx, ry, 20, 160);

function sun(): Drawing {
  const face = circle(0.5, 0.5, 0.24);
  const rays = [-90, -30, 30, 90, 150, 210].map((a) => {
    const c = Math.cos((a * Math.PI) / 180);
    const s = Math.sin((a * Math.PI) / 180);
    return line([0.5 + 0.31 * c, 0.5 + 0.31 * s], [0.5 + 0.44 * c, 0.5 + 0.44 * s]);
  });
  return {
    id: 'soare',
    label: 'Soarele',
    steps: [
      { voice: 'ghidat.sun.circle', paths: [face], regions: [{ pts: face, z: 1, suggest: '#ffd84c' }] },
      { voice: 'ghidat.sun.rays', paths: rays, regions: [] },
      {
        voice: 'ghidat.eyes',
        paths: dots([0.42, 0.45], [0.58, 0.45]),
        regions: [eyeRegion(0.42, 0.45, 2), eyeRegion(0.58, 0.45, 2)],
      },
      { voice: 'ghidat.smile', paths: [smile(0.5, 0.53, 0.11, 0.09)], regions: [] },
    ],
  };
}

function fish(): Drawing {
  const body = ellipse(0.55, 0.52, 0.27, 0.17);
  const tail = poly([0.3, 0.52], [0.09, 0.34], [0.09, 0.7]);
  const fin = line([0.45, 0.362], [0.58, 0.2], [0.65, 0.362]);
  const bubbles = [circle(0.9, 0.3, 0.035), circle(0.86, 0.17, 0.045), circle(0.92, 0.06, 0.03)];
  return {
    id: 'peste',
    label: 'Peștișorul',
    steps: [
      { voice: 'ghidat.fish.body', paths: [body], regions: [{ pts: body, z: 1, suggest: '#ffa24c' }] },
      { voice: 'ghidat.fish.tail', paths: [tail], regions: [{ pts: tail, z: 0, suggest: '#ff5f6d' }] },
      {
        voice: 'ghidat.fish.fin',
        paths: [fin],
        regions: [{ pts: poly([0.45, 0.362], [0.58, 0.2], [0.65, 0.362]), z: 0, suggest: '#ff5f6d' }],
      },
      { voice: 'ghidat.eye', paths: dots([0.7, 0.47]), regions: [eyeRegion(0.7, 0.47, 2)] },
      {
        voice: 'ghidat.fish.bubbles',
        paths: bubbles,
        regions: bubbles.map((pts) => ({ pts, z: 1, suggest: '#9be7ff' })),
      },
    ],
  };
}

function flower(): Drawing {
  const centre = circle(0.5, 0.33, 0.09);
  const petals = [-90, -18, 54, 126, 198].map((a) =>
    circle(0.5 + 0.16 * Math.cos((a * Math.PI) / 180), 0.33 + 0.16 * Math.sin((a * Math.PI) / 180), 0.085),
  );
  const leaf = ellipse(0.62, 0.75, 0.115, 0.05, -30);
  return {
    id: 'floare',
    label: 'Floarea',
    steps: [
      {
        voice: 'ghidat.flower.center',
        paths: [centre],
        regions: [{ pts: centre, z: 2, suggest: '#ffd84c' }],
      },
      {
        voice: 'ghidat.flower.petals',
        paths: petals.map((p) => outside(p, centre)),
        regions: petals.map((pts) => ({ pts, z: 1, suggest: '#ff8fc7' })),
      },
      { voice: 'ghidat.flower.stem', paths: [line([0.5, 0.42], [0.5, 0.95])], regions: [] },
      { voice: 'ghidat.flower.leaf', paths: [leaf], regions: [{ pts: leaf, z: 1, suggest: '#5cc85c' }] },
    ],
  };
}

/** Pufi and the bear share the face: head, ears, eyes, nose, smile. */
function face(kind: 'panda' | 'urs'): Drawing {
  const panda = kind === 'panda';
  const head = circle(0.5, 0.56, 0.3);
  const ears = [circle(0.26, 0.3, 0.11), circle(0.74, 0.3, 0.11)];
  const eyes = panda ? ([0.39, 0.51] as const) : ([0.4, 0.49] as const);
  const eyeR = panda ? ([0.61, 0.51] as const) : ([0.6, 0.49] as const);
  const nose = panda ? ellipse(0.5, 0.66, 0.05, 0.035) : ellipse(0.5, 0.62, 0.045, 0.03);
  const dark = panda ? INK : '#6b4226';
  const steps: Step[] = [
    {
      voice: panda ? 'ghidat.panda.head' : 'ghidat.bear.head',
      paths: [head],
      regions: [{ pts: head, z: 1, suggest: panda ? WHITE : '#a9744a' }],
    },
    {
      voice: 'ghidat.ears',
      paths: ears.map((e) => outside(e, head)),
      regions: ears.map((pts) => ({ pts, z: 0, suggest: panda ? INK : '#a9744a' })),
    },
  ];
  if (panda) {
    const patches = [ellipse(0.39, 0.52, 0.075, 0.1, 30), ellipse(0.61, 0.52, 0.075, 0.1, -30)];
    steps.push({
      voice: 'ghidat.panda.patches',
      paths: patches,
      regions: patches.map((pts) => ({ pts, z: 2, suggest: INK })),
    });
  } else {
    const snout = ellipse(0.5, 0.67, 0.13, 0.1);
    steps.push({
      voice: 'ghidat.bear.snout',
      paths: [snout],
      regions: [{ pts: snout, z: 2, suggest: '#ffe3a8' }],
    });
  }
  steps.push(
    {
      voice: 'ghidat.eyes',
      paths: dots([eyes[0], eyes[1]], [eyeR[0], eyeR[1]]),
      regions: [eyeRegion(eyes[0], eyes[1], 3), eyeRegion(eyeR[0], eyeR[1], 3)],
    },
    { voice: 'ghidat.nose', paths: [nose], regions: [{ pts: nose, z: 3, suggest: dark }] },
    {
      voice: 'ghidat.smile',
      paths: [panda ? smile(0.5, 0.71, 0.07, 0.06) : smile(0.5, 0.67, 0.065, 0.055)],
      regions: [],
    },
  );
  return { id: kind, label: panda ? 'Pufi' : 'Ursulețul', steps };
}

function turtle(): Drawing {
  const shell = join(arc(0.46, 0.62, 0.3, 0.26, 180, 360), line([0.76, 0.62], [0.16, 0.62]));
  const head = circle(0.83, 0.55, 0.09);
  const legs = [ellipse(0.28, 0.67, 0.06, 0.07), ellipse(0.62, 0.67, 0.06, 0.07)];
  return {
    id: 'testoasa',
    label: 'Țestoasa',
    steps: [
      { voice: 'ghidat.turtle.shell', paths: [shell], regions: [{ pts: shell, z: 1, suggest: '#5cc85c' }] },
      {
        voice: 'ghidat.turtle.head',
        paths: [outside(head, shell)],
        regions: [{ pts: head, z: 0, suggest: '#c6f0a8' }],
      },
      {
        voice: 'ghidat.turtle.legs',
        paths: legs.map((l) => outside(l, shell)),
        regions: legs.map((pts) => ({ pts, z: 0, suggest: '#c6f0a8' })),
      },
      { voice: 'ghidat.eye', paths: dots([0.86, 0.52]), regions: [eyeRegion(0.86, 0.52, 2)] },
    ],
  };
}

function castle(): Drawing {
  const body = poly([0.3, 0.45], [0.7, 0.45], [0.7, 0.88], [0.3, 0.88]);
  const towers = [
    line([0.3, 0.45], [0.3, 0.32], [0.14, 0.32], [0.14, 0.88], [0.3, 0.88]),
    line([0.7, 0.45], [0.7, 0.32], [0.86, 0.32], [0.86, 0.88], [0.7, 0.88]),
  ];
  const roofs = [
    [
      [0.12, 0.32],
      [0.22, 0.12],
      [0.32, 0.32],
    ],
    [
      [0.68, 0.32],
      [0.78, 0.12],
      [0.88, 0.32],
    ],
  ] as [number, number][][];
  const door = join(
    line([0.43, 0.88], [0.43, 0.74]),
    arc(0.5, 0.74, 0.07, 0.07, 180, 360),
    line([0.57, 0.74], [0.57, 0.88]),
  );
  return {
    id: 'castel',
    label: 'Castelul',
    steps: [
      { voice: 'ghidat.castle.body', paths: [body], regions: [{ pts: body, z: 1, suggest: '#f8bbd0' }] },
      {
        voice: 'ghidat.castle.towers',
        paths: towers,
        regions: [
          { pts: poly([0.14, 0.32], [0.3, 0.32], [0.3, 0.88], [0.14, 0.88]), z: 0, suggest: '#b39ddb' },
          { pts: poly([0.7, 0.32], [0.86, 0.32], [0.86, 0.88], [0.7, 0.88]), z: 0, suggest: '#b39ddb' },
        ],
      },
      {
        voice: 'ghidat.castle.roofs',
        paths: roofs.map((r) => line(...r)),
        regions: roofs.map((r) => ({ pts: poly(...r), z: 1, suggest: '#4c8df0' })),
      },
      {
        voice: 'ghidat.castle.door',
        paths: [door],
        regions: [{ pts: [...door, door[0]], z: 2, suggest: '#a9744a' }],
      },
    ],
  };
}

/** Simplest first. */
export const DRAWINGS: Drawing[] = [sun(), fish(), flower(), face('panda'), face('urs'), turtle(), castle()];

/** Every region of a drawing, back to front. */
export const regionsOf = (d: Drawing) => d.steps.flatMap((s) => s.regions).sort((a, b) => a.z - b.z);
