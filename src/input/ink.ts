import { getStroke } from 'perfect-freehand';

export type InkPoint = [x: number, y: number, pressure: number];

/** perfect-freehand outline. Pen: real pressure. Finger: simulated pressure from speed. */
export function strokeOutline(points: readonly InkPoint[], size: number, isPen: boolean): number[][] {
  return getStroke(points as InkPoint[], {
    size,
    thinning: isPen ? 0.65 : 0.5,
    smoothing: 0.5,
    streamline: 0.45,
    simulatePressure: !isPen,
    last: true,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  });
}

export function outlineToSvgPath(outline: readonly number[][]): string {
  if (!outline.length) return '';
  const d = outline.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', outline[0][0], outline[0][1], 'Q'],
  );
  return `${d.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(' ')} Z`;
}
