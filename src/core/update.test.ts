import { describe, expect, it, vi } from 'vitest';
import { hasPendingUpdate, maybeApplyUpdate, setPendingUpdate, shouldActivate } from './update';

describe('PWA update', () => {
  it('defers activation while route is game', () => {
    const apply = vi.fn(async () => {});
    setPendingUpdate(apply);
    maybeApplyUpdate('game');
    maybeApplyUpdate('island');
    expect(apply).not.toHaveBeenCalled();
    expect(hasPendingUpdate()).toBe(true);
    maybeApplyUpdate('map');
    expect(apply).toHaveBeenCalledWith(true);
    expect(hasPendingUpdate()).toBe(false);
  });

  it('activates only on the map or the splash', () => {
    expect(shouldActivate('map')).toBe(true);
    expect(shouldActivate('splash')).toBe(true);
    expect(shouldActivate('game')).toBe(false);
    expect(shouldActivate('parent')).toBe(false);
  });
});
