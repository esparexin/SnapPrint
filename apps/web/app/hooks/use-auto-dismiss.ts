'use client';

import { useEffect } from 'react';

/**
 * Automatically triggers a dismiss callback after a delay when a trigger value is truthy.
 * Cleans up the timer on unmount or when the value changes.
 */
export function useAutoDismiss(value: unknown, onDismiss: () => void, delayMs = 5000): void {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(onDismiss, delayMs);
    return () => clearTimeout(timer);
  }, [value, onDismiss, delayMs]);
}
