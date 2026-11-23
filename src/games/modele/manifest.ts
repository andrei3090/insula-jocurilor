import { createElement } from 'react';
import type { GameManifest } from '../../core/types';
import { levelSpec, SKILLS, type Token } from './logic';
import { ShapeArt } from './Shape';

const ROW: Token[] = [
  { shape: 'star', color: 'yellow' },
  { shape: 'heart', color: 'red' },
  { shape: 'star', color: 'yellow' },
  { shape: 'heart', color: 'red' },
];

const Icon = ({ size = 120 }: { size?: number }) =>
  createElement(
    'div',
    { className: 'grid grid-cols-2 place-items-center', style: { width: size, height: size } },
    ...ROW.map((tk, i) => createElement(ShapeArt, { key: i, token: tk, size: size * 0.46 })),
  );

export const manifest: GameManifest = {
  id: 'modele',
  title: 'Modele în peșteră',
  titleVoice: 'game.modele.title',
  island: 'pestera',
  ages: [6, 8],
  skills: SKILLS,
  icon: Icon,
  load: () => import('./Game'),
  levelSpec,
  roundSize: 5,
  promoteAfter: 3,
};
