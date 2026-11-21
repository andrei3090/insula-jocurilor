import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InkCanvas } from './InkCanvas';

// Regression (B6): the wrapper hard-coded `relative`, which overrode a caller's `absolute inset-0`
// and left the drawing surface 0 px tall in the sand game.
describe('InkCanvas', () => {
  it('uses the caller positioning instead of forcing `relative`', () => {
    const { container } = render(<InkCanvas className="absolute inset-0" />);
    const wrap = container.firstElementChild!;
    expect(wrap.className).toContain('absolute');
    expect(wrap.className.split(/\s+/)).not.toContain('relative');
  });

  it('fills its parent by default', () => {
    const { container } = render(<InkCanvas />);
    expect(container.firstElementChild!.className).toContain('h-full');
  });
});
