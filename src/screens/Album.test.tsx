import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Album } from './Album';

// Regression (B7): `?? []` in a store selector returned a new array each render → infinite loop, blank screen.
describe('Album', () => {
  it('renders for a profile with no stickers yet (no render loop)', () => {
    render(<Album />);
    expect(screen.getByTestId('album-screen')).toBeTruthy();
    expect(screen.getByText('0 / 24')).toBeTruthy();
  });
});
