import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

let pendingEffect: (() => void | (() => void)) | null = null;
let activeCleanup: (() => void) | void = undefined;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    default: actual,
    useEffect: (effect: () => void | (() => void)) => {
      pendingEffect = effect;
    },
  };
});

import { useAutoDismiss } from '../app/hooks/use-auto-dismiss';

describe('useAutoDismiss Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pendingEffect = null;
    activeCleanup = undefined;
  });

  afterEach(() => {
    if (typeof activeCleanup === 'function') activeCleanup();
    vi.useRealTimers();
  });

  it('triggers dismiss after delay when value is truthy', () => {
    const onDismiss = vi.fn();
    useAutoDismiss('saved', onDismiss, 5000);

    // Run the captured effect
    expect(pendingEffect).not.toBeNull();
    activeCleanup = pendingEffect!();

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does nothing when value is falsy', () => {
    const onDismiss = vi.fn();
    useAutoDismiss(null, onDismiss, 5000);

    expect(pendingEffect).not.toBeNull();
    activeCleanup = pendingEffect!();

    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('cancels timeout on cleanup', () => {
    const onDismiss = vi.fn();
    useAutoDismiss('saved', onDismiss, 5000);

    expect(pendingEffect).not.toBeNull();
    activeCleanup = pendingEffect!();

    vi.advanceTimersByTime(2000);
    if (typeof activeCleanup === 'function') {
      activeCleanup();
      activeCleanup = undefined;
    }

    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
