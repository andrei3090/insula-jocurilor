import type { Route } from './router';

/** A new app version may activate only where it cannot interrupt a game. */
export const shouldActivate = (routeName: Route['name']) => routeName === 'map' || routeName === 'splash';

let pending: ((reload?: boolean) => Promise<void>) | null = null;

export function setPendingUpdate(apply: (reload?: boolean) => Promise<void>) {
  pending = apply;
}

export function maybeApplyUpdate(routeName: Route['name']) {
  if (pending && shouldActivate(routeName)) {
    const apply = pending;
    pending = null;
    void apply(true);
  }
}

export const hasPendingUpdate = () => pending !== null;
