import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOLD_MS, LockButton } from './ParentGate';

describe('ParentGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('releasing before 3 s does not open the PIN pad', () => {
    const onUnlock = vi.fn();
    render(<LockButton onUnlock={onUnlock} />);
    fireEvent.pointerDown(screen.getByTestId('lock'));
    act(() => vi.advanceTimersByTime(HOLD_MS - 500));
    fireEvent.pointerUp(screen.getByTestId('lock'));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByTestId('pin-pad')).toBeNull();
  });

  it('holding 3 s opens the pad; a wrong PIN stays locked, the right one unlocks', () => {
    const onUnlock = vi.fn();
    render(<LockButton onUnlock={onUnlock} />);
    fireEvent.pointerDown(screen.getByTestId('lock'));
    act(() => vi.advanceTimersByTime(HOLD_MS + 10));
    expect(screen.getByTestId('pin-pad')).toBeTruthy();
    for (const d of '1234') fireEvent.click(screen.getByLabelText(d));
    expect(onUnlock).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    for (const d of '0000') fireEvent.click(screen.getByLabelText(d));
    expect(onUnlock).toHaveBeenCalledOnce();
  });
});
