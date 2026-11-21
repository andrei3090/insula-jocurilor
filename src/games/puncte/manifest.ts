import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'svg',
    { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': true },
    createElement('polyline', {
      points: '20,80 20,40 50,15 80,40 80,80',
      fill: 'none',
      stroke: '#3b2a4a',
      strokeWidth: 5,
      strokeLinejoin: 'round',
      strokeDasharray: '2 9',
      strokeLinecap: 'round',
    }),
    ...[
      [20, 80, 1],
      [20, 40, 2],
      [50, 15, 3],
      [80, 40, 4],
      [80, 80, 5],
    ].map(([x, y, n]) =>
      createElement(
        'g',
        { key: n },
        createElement('circle', {
          cx: x,
          cy: y,
          r: 10,
          fill: n === 1 ? '#ffd166' : '#fff',
          stroke: '#3b2a4a',
          strokeWidth: 3,
        }),
        createElement(
          'text',
          { x, y: y + 4.5, textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: '#3b2a4a' },
          n,
        ),
      ),
    ),
  );

export const manifest: GameManifest = {
  id: 'puncte',
  title: 'Unește punctele',
  titleVoice: 'game.puncte.title',
  island: 'bambus',
  ages: [4, 9],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  roundSize: 4,
  promoteAfter: 3,
  startStep: (age) => (age <= 4 ? 0 : age <= 6 ? 1 : 2),
};
