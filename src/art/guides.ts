import type { ComponentType } from 'react';
import type { Avatar } from '../core/profile';
import type { IslandId } from '../core/types';
import { Bruno } from './Bruno';
import { Cenusareasa } from './Cenusareasa';
import { Marina } from './Marina';
import { Pufi } from './Pufi';
import type { CharacterProps } from './parts';
import { Tavi } from './Tavi';

export const GUIDES: Record<Avatar, ComponentType<CharacterProps>> = {
  pufi: Pufi,
  bruno: Bruno,
  cenusareasa: Cenusareasa,
  marina: Marina,
  tavi: Tavi,
};

export type IslandInfo = {
  id: IslandId;
  name: string;
  guide: Avatar;
  /** second guide shown on the island screen */
  friend?: Avatar;
  sky: string;
  sea: string;
};

export const ISLANDS: Record<IslandId, IslandInfo> = {
  bambus: { id: 'bambus', name: 'Pădurea de bambus', guide: 'pufi', sky: '#dff5c9', sea: '#9edc7a' },
  pestera: { id: 'pestera', name: 'Peștera urșilor', guide: 'bruno', sky: '#ece3ff', sea: '#b39ddb' },
  castel: { id: 'castel', name: 'Castelul de cristal', guide: 'cenusareasa', sky: '#ffe4ee', sea: '#f8bbd0' },
  laguna: {
    id: 'laguna',
    name: 'Laguna stelelor',
    guide: 'marina',
    friend: 'tavi',
    sky: '#d4f3ff',
    sea: '#4cc9c0',
  },
  atelier: {
    id: 'atelier',
    name: 'Atelierul',
    guide: 'pufi',
    friend: 'bruno',
    sky: '#fff1d6',
    sea: '#ffd166',
  },
};

export const ISLAND_ORDER: IslandId[] = ['bambus', 'pestera', 'atelier', 'castel', 'laguna'];
