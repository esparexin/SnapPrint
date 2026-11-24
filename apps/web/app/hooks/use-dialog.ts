'use client';

import React, { useEffect, useRef } from 'react';

export interface UseDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  enableSwipeDown?: boolean;
  swipeThreshold?: number;
}

// Module-level state for nested dialogs and scroll restoration
let openDialogCount = 0;
let preservedScrollY = 0;
let previousBodyOverflow = '';
let previousHtmlOverscroll = '';

export function getOpenDialogCount(): number {
  return openDialogCount;
}

export function resetDialogStateForTests(): void {
  openDialogCount = 0;
  preservedScrollY = 0;
  previousBodyOverflow = '';
  previousHtmlOverscroll = '';
}

export function lockScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (openDialogCount === 0) {
    preservedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'contain';
  }
  openDialogCount += 1;
}

export function unlockScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    window.scrollTo({
      top: preservedScrollY,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }
}

export function useDialog({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  enableSwipeDown = false,
  swipeThreshold = 75,
}: UseDialogOptions) {
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  // 1. Background Scroll Lock and Restoration
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  // 2. Escape Key Dismissal
  useEffect(() => {
    if (!isOpen || !closeOnEscape || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, closeOnEscape, onClose]);

  // 3. Backdrop Click Handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  // 4. Safe Swipe-Down Dismissal Handlers (for header/handle)
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!enableSwipeDown || e.touches.length !== 1) return;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!enableSwipeDown || touchStartY.current === null || e.touches.length !== 1) return;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (enableSwipeDown && touchStartY.current !== null && touchCurrentY.current !== null) {
      const deltaY = touchCurrentY.current - touchStartY.current;
      if (deltaY > swipeThreshold) {
        onClose();
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  return {
    handleBackdropClick,
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
