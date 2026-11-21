export const SKILLS = ['create.color'] as const;

const INK = new Set(['#3b2a4a', '#3d3549']);
const KEEP = new Set(['none', 'transparent']);

/**
 * Should an SVG shape become a colourable region? Filled shapes (white ones too) do; outlines, ink details
 * (pupils, nose) and tiny dots such as eye highlights stay as they are.
 */
export function isRegion(tag: string, fill: string | null, area: number): boolean {
  if (!['path', 'circle', 'ellipse', 'rect', 'polygon'].includes(tag)) return false;
  if (!fill || fill.startsWith('url(')) return false;
  const f = fill.toLowerCase();
  if (KEEP.has(f) || INK.has(f)) return false;
  return area >= 40;
}

export type Fill = { id: string; color: string };

/** Fill history for undo: apply returns the new map and the step to undo. */
export function applyFill(fills: Record<string, string>, id: string, color: string) {
  const prev = fills[id] ?? '#ffffff';
  return { fills: { ...fills, [id]: color }, undo: { id, color: prev } as Fill };
}
