import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { BAR_COLORS, SKILLS } from './logic';

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'svg',
    { viewBox: '0 0 100 100', width: size, height: size, 'aria-hidden': true },
    ...BAR_COLORS.slice(0, 6).map((c, i) =>
      createElement('rect', {
        key: c,
        x: 8 + i * 15,
        y: 18 + i * 5,
        width: 12,
        height: 70 - i * 10,
        rx: 4,
        fill: c,
        stroke: '#3b2a4a',
        strokeWidth: 2.5,
      }),
    ),
  );

export const manifest: GameManifest = {
  id: 'xilofon',
  title: 'Xilofonul lui Bruno',
  titleVoice: 'game.xilofon.title',
  island: 'pestera',
  ages: [4, 10],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  roundSize: 4,
  promoteAfter: 3,
  startStep: (age) => (age <= 4 ? 0 : age <= 6 ? 1 : 3),
};
