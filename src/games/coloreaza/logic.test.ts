import { describe, expect, it } from 'vitest';
import { applyFill, isRegion } from './logic';

describe('coloreaza', () => {
  it('filled shapes become regions; ink, tiny highlights and outlines do not', () => {
    expect(isRegion('ellipse', '#bd8552', 900)).toBe(true);
    expect(isRegion('path', '#ff8fb8', 120)).toBe(true);
    expect(isRegion('circle', '#3b2a4a', 300)).toBe(false); // pupil / ink
    expect(isRegion('circle', '#fff', 16)).toBe(false); // eye highlight (tiny)
    expect(isRegion('circle', '#ffffff', 3000)).toBe(true); // a white head can be coloured
    expect(isRegion('circle', '#ffd166', 10)).toBe(false); // tiny dot
    expect(isRegion('path', 'none', 900)).toBe(false); // outline only
    expect(isRegion('g', '#ff0000', 900)).toBe(false);
    expect(isRegion('rect', 'url(#grad)', 900)).toBe(false);
  });

  it('applyFill returns the previous colour for undo', () => {
    const a = applyFill({}, 'r1', '#ff0000');
    expect(a.fills).toEqual({ r1: '#ff0000' });
    expect(a.undo).toEqual({ id: 'r1', color: '#ffffff' });
    const b = applyFill(a.fills, 'r1', '#00ff00');
    expect(b.undo.color).toBe('#ff0000');
  });
});
