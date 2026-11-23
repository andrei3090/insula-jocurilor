import { create } from 'zustand';
import type { IslandId } from './types';

export type Route =
  | { name: 'splash' }
  | { name: 'age' }
  | { name: 'map' }
  | { name: 'island'; island: IslandId }
  | { name: 'game'; id: string; island: IslandId }
  | { name: 'album' }
  | { name: 'parent'; page?: string }
  | { name: 'art' };

type RouterState = { route: Route; go(r: Route): void; up(): void };

/** The parent of a route: where the Home button and Android "back" go. Never out of the app. */
export function parentOf(r: Route): Route {
  switch (r.name) {
    case 'game':
      return { name: 'island', island: r.island };
    case 'age':
      return { name: 'splash' };
    case 'island':
    case 'album':
    case 'parent':
    case 'art':
      return { name: 'map' };
    default:
      return { name: 'map' };
  }
}

const initial: Route =
  typeof location !== 'undefined' && location.hash === '#art' && import.meta.env.MODE !== 'production'
    ? { name: 'art' }
    : { name: 'splash' };

export const useRouter = create<RouterState>()((set, get) => ({
  route: initial,
  go: (route) => {
    set({ route });
    try {
      history.pushState({ insula: true }, '');
    } catch {
      /* ignore */
    }
  },
  up: () => set({ route: parentOf(get().route) }),
}));

/** Android back button / swipe-back: go one level up and keep the app open. */
export function installBackHandler() {
  history.replaceState({ insula: true }, '');
  history.pushState({ insula: true }, '');
  window.addEventListener('popstate', () => {
    const { route } = useRouter.getState();
    if (route.name !== 'splash') useRouter.setState({ route: parentOf(route) });
    history.pushState({ insula: true }, '');
  });
}
