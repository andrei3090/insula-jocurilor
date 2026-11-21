import type { LineId } from '../../voice/lines';
import { arc, join, line, type Pt } from './geometry';

export type Glyph = {
  id: string;
  label: string;
  voice: LineId;
  kind: 'stroke' | 'upper' | 'digit';
  strokes: Pt[][];
};

// Unit box: capitals from T (top) to B (bottom); diacritics above T or below B.
const T = 0.22;
const B = 0.9;
const M = (T + B) / 2;

const breve = line([0.38, 0.03], [0.44, 0.11], [0.5, 0.13], [0.56, 0.11], [0.62, 0.03]);
const hat = line([0.38, 0.15], [0.5, 0.04], [0.62, 0.15]);
const comma = line([0.53, 0.93], [0.47, 1.0]);

const A = [line([0.5, T], [0.18, B]), line([0.5, T], [0.82, B]), line([0.31, 0.64], [0.69, 0.64])];
const I = [line([0.5, T], [0.5, B])];
const S = [join(arc(0.5, 0.39, 0.25, 0.17, -15, -270), arc(0.5, 0.73, 0.25, 0.17, -90, 165))];
const Tt = [line([0.18, T], [0.82, T]), line([0.5, T], [0.5, B])];

const U = (id: string, strokes: Pt[][], voice?: string): Glyph => ({
  id,
  label: id,
  voice: (voice ?? `letter.${id}`) as LineId,
  kind: 'upper',
  strokes,
});

/** Pre-writing strokes (age 4–5), in teaching order. */
export const STROKES: Glyph[] = [
  {
    id: 'line',
    label: '|',
    voice: 'nisip.s.line',
    kind: 'stroke',
    strokes: [line([0.5, 0.12], [0.5, 0.88])],
  },
  {
    id: 'dots',
    label: '•',
    voice: 'nisip.s.dots',
    kind: 'stroke',
    strokes: [0.2, 0.4, 0.6, 0.8].map((x) => line([x, 0.5])),
  },
  {
    id: 'wave',
    label: '~',
    voice: 'nisip.s.wave',
    kind: 'stroke',
    strokes: [
      Array.from({ length: 41 }, (_, i) => ({
        x: 0.08 + (0.84 * i) / 40,
        y: 0.5 - 0.17 * Math.sin((i / 40) * Math.PI * 4),
      })),
    ],
  },
  {
    id: 'zigzag',
    label: '^',
    voice: 'nisip.s.zigzag',
    kind: 'stroke',
    strokes: [
      line([0.08, 0.68], [0.22, 0.32], [0.36, 0.68], [0.5, 0.32], [0.64, 0.68], [0.78, 0.32], [0.92, 0.68]),
    ],
  },
  {
    id: 'hook',
    label: 'J',
    voice: 'nisip.s.hook',
    kind: 'stroke',
    strokes: [join(line([0.62, 0.12], [0.62, 0.66]), arc(0.45, 0.66, 0.17, 0.2, 0, 180))],
  },
  {
    id: 'loop',
    label: 'n',
    voice: 'nisip.s.loop',
    kind: 'stroke',
    strokes: [
      join(
        line([0.08, 0.72], [0.08, 0.5]),
        arc(0.2, 0.5, 0.12, 0.2, 180, 360),
        arc(0.44, 0.5, 0.12, 0.2, 180, 360),
        arc(0.68, 0.5, 0.12, 0.2, 180, 360),
        line([0.92, 0.5], [0.92, 0.72]),
      ),
    ],
  },
  {
    id: 'circle',
    label: 'O',
    voice: 'nisip.s.circle',
    kind: 'stroke',
    strokes: [arc(0.5, 0.5, 0.33, 0.33, -90, -450)],
  },
  {
    id: 'oval',
    label: '0',
    voice: 'nisip.s.oval',
    kind: 'stroke',
    strokes: [arc(0.5, 0.5, 0.24, 0.36, -90, -450)],
  },
  {
    id: 'spiral',
    label: '@',
    voice: 'nisip.s.spiral',
    kind: 'stroke',
    strokes: [
      Array.from({ length: 73 }, (_, i) => {
        const a = (i / 72) * Math.PI * 4;
        const r = 0.04 + (0.34 * i) / 72;
        return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) };
      }),
    ],
  },
];

/** Capital letters in the Romanian curriculum teaching order (stroke order as taught for print capitals). */
export const UPPER: Glyph[] = [
  U('A', A),
  U('M', [line([0.18, B], [0.18, T], [0.5, 0.66], [0.82, T], [0.82, B])]),
  U('U', [
    join(line([0.22, T], [0.22, 0.64]), arc(0.5, 0.64, 0.28, 0.26, 180, 0), line([0.78, 0.64], [0.78, T])),
  ]),
  U('N', [line([0.22, B], [0.22, T], [0.78, B], [0.78, T])]),
  U('I', I),
  U('E', [
    line([0.26, T], [0.26, B]),
    line([0.26, T], [0.76, T]),
    line([0.26, M], [0.68, M]),
    line([0.26, B], [0.76, B]),
  ]),
  U('R', [
    line([0.26, T], [0.26, B]),
    join(line([0.26, T], [0.5, T]), arc(0.5, 0.39, 0.22, 0.17, -90, 90), line([0.5, 0.56], [0.26, 0.56])),
    line([0.46, 0.56], [0.8, B]),
  ]),
  U('O', [arc(0.5, M, 0.32, 0.34, -90, -450)]),
  U('C', [arc(0.52, M, 0.32, 0.34, -40, -320)]),
  U('A2', [...A, breve], 'letter.A2'),
  U('L', [line([0.28, T], [0.28, B], [0.76, B])]),
  U('T', Tt),
  U('S', S),
  U('P', [
    line([0.26, T], [0.26, B]),
    join(line([0.26, T], [0.5, T]), arc(0.5, 0.39, 0.24, 0.17, -90, 90), line([0.5, 0.56], [0.26, 0.56])),
  ]),
  U('V', [line([0.18, T], [0.5, B], [0.82, T])]),
  U('D', [
    line([0.26, T], [0.26, B]),
    join(line([0.26, T], [0.4, T]), arc(0.4, M, 0.36, 0.34, -90, 90), line([0.4, B], [0.26, B])),
  ]),
  U('S2', [...S, comma], 'letter.S2'),
  U('I2', [...I, hat], 'letter.I2'),
  U('A3', [...A, hat], 'letter.A3'),
  U('B', [
    line([0.26, T], [0.26, B]),
    join(line([0.26, T], [0.48, T]), arc(0.48, 0.385, 0.2, 0.165, -90, 90), line([0.48, 0.55], [0.26, 0.55])),
    join(
      line([0.26, 0.55], [0.52, 0.55]),
      arc(0.52, 0.725, 0.24, 0.175, -90, 90),
      line([0.52, B], [0.26, B]),
    ),
  ]),
  U('J', [join(line([0.62, T], [0.62, 0.7]), arc(0.44, 0.7, 0.18, 0.2, 0, 180))]),
  U('H', [line([0.24, T], [0.24, B]), line([0.76, T], [0.76, B]), line([0.24, M], [0.76, M])]),
  U('G', [arc(0.52, M, 0.32, 0.34, -40, -330), line([0.56, 0.6], [0.8, 0.6], [0.8, 0.86])]),
  U('T2', [...Tt, comma], 'letter.T2'),
  U('Z', [line([0.2, T], [0.8, T], [0.2, B], [0.8, B])]),
  U('F', [line([0.28, T], [0.28, B]), line([0.28, T], [0.76, T]), line([0.28, M], [0.66, M])]),
  U('X', [line([0.2, T], [0.8, B]), line([0.8, T], [0.2, B])]),
  U('K', [line([0.26, T], [0.26, B]), line([0.76, T], [0.3, 0.58], [0.78, B])]),
  U('Q', [arc(0.5, M, 0.32, 0.34, -90, -450), line([0.58, 0.74], [0.84, 0.96])]),
  U('W', [line([0.1, T], [0.3, B], [0.5, 0.45], [0.7, B], [0.9, T])]),
  U('Y', [line([0.2, T], [0.5, 0.56]), line([0.8, T], [0.5, 0.56], [0.5, B])]),
];

const D = (n: number, strokes: Pt[][]): Glyph => ({
  id: `D${n}`,
  label: String(n),
  voice: `num.${n}` as LineId,
  kind: 'digit',
  strokes,
});

/** Digits 0–9, written the way they are taught (start point and direction). */
export const DIGITS: Glyph[] = [
  D(1, [line([0.34, 0.36], [0.56, T], [0.56, B])]),
  D(2, [join(arc(0.5, 0.42, 0.24, 0.2, -165, 15), line([0.73, 0.47], [0.26, B], [0.78, B]))]),
  D(3, [join(arc(0.5, 0.39, 0.22, 0.17, -160, 90), arc(0.5, 0.73, 0.24, 0.17, -90, 160))]),
  D(4, [line([0.6, T], [0.22, 0.68], [0.8, 0.68]), line([0.62, 0.42], [0.62, B])]),
  D(5, [join(line([0.74, T], [0.34, T], [0.31, 0.52]), arc(0.48, 0.71, 0.26, 0.19, -125, 160))]),
  D(6, [join(arc(0.52, 0.58, 0.25, 0.36, -70, -180), arc(0.51, 0.71, 0.24, 0.19, 180, 540))]),
  D(7, [line([0.24, T], [0.76, T], [0.42, B])]),
  D(8, [join(arc(0.5, 0.39, 0.19, 0.17, 90, 450), arc(0.5, 0.73, 0.23, 0.17, -90, 270))]),
  D(9, [join(arc(0.5, 0.41, 0.22, 0.19, 10, -350), line([0.72, 0.44], [0.66, B]))]),
  D(0, [arc(0.5, M, 0.25, 0.34, -90, -450)]),
];

export const LABEL: Record<string, string> = { A2: 'Ă', A3: 'Â', I2: 'Î', S2: 'Ș', T2: 'Ț' };
export const glyphLabel = (g: Glyph) => (g.kind === 'upper' ? (LABEL[g.id] ?? g.id) : g.label);
