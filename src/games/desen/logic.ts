import type { LineId } from '../../voice/lines';

export const SKILLS = ['create.draw'] as const;

export type Pot = { id: string; color: string; voice: LineId };

export const POTS: Pot[] = [
  { id: 'red', color: '#ff5f6d', voice: 'color.red' },
  { id: 'orange', color: '#ffa24c', voice: 'color.orange' },
  { id: 'yellow', color: '#ffd84c', voice: 'color.yellow' },
  { id: 'green', color: '#5cc85c', voice: 'color.green' },
  { id: 'blue', color: '#4c8df0', voice: 'color.blue' },
  { id: 'purple', color: '#9b6cff', voice: 'color.purple' },
  { id: 'pink', color: '#ff8fc7', voice: 'color.pink' },
  { id: 'brown', color: '#a9744a', voice: 'color.brown' },
  { id: 'black', color: '#3b2a4a', voice: 'color.black' },
];

export const SIZES = [8, 16, 30] as const;

/** Keep a stamp of `size` fully inside a w × h canvas; returns its centre. */
export function stampAt(x: number, y: number, size: number, w: number, h: number) {
  const half = size / 2;
  return {
    x: Math.min(Math.max(x, half), Math.max(half, w - half)),
    y: Math.min(Math.max(y, half), Math.max(half, h - half)),
  };
}
