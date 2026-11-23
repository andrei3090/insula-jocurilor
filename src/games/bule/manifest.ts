import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { COLORS, levelSpec, SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'svg',
    { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': true },
    ...[
      [36, 60, 26, COLORS.blue],
      [68, 40, 20, COLORS.pink],
      [70, 76, 14, COLORS.yellow],
    ].map(([cx, cy, r, c]) =>
      createElement(
        'g',
        { key: `${cx}` },
        createElement('circle', { cx, cy, r, fill: c, fillOpacity: 0.75, stroke: '#3b2a4a', strokeWidth: 3 }),
        createElement('circle', {
          cx: Number(cx) - Number(r) * 0.35,
          cy: Number(cy) - Number(r) * 0.4,
          r: Number(r) * 0.22,
          fill: '#fff',
          opacity: 0.9,
        }),
      ),
    ),
  );

export const manifest: GameManifest = {
  id: 'bule',
  title: 'Bule de săpun',
  titleVoice: 'game.bule.title',
  island: 'castel',
  ages: [3, 4],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  levelSpec,
  roundSize: 5,
  promoteAfter: 3,
};
