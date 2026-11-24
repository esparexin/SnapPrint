'use client';

import React, { useEffect, useRef } from 'react';

export interface UseDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  dialogId?: string;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  enableSwipeDown?: boolean;
  swipeThreshold?: number;
}

// Module-level state for nested dialogs, LIFO stack, and scroll restoration
let openDialogCount = 0;
let preservedScrollY = 0;
let previousBodyOverflow = '';
let previousHtmlOverscroll = '';
let activeDialogStack: string[] = [];

export const getOpenDialogCount = (): number => openDialogCount;
export const getActiveDialogStack = (): string[] => [...activeDialogStack];
export const pushDialogToStack = (id: string): void => {
  activeDialogStack.push(id);
};
export const popDialogFromStack = (id: string): void => {
  const idx = activeDialogStack.lastIndexOf(id);
  if (idx !== -1) activeDialogStack.splice(idx, 1);
};

export function resetDialogStateForTests(): void {
  openDialogCount = 0;
  preservedScrollY = 0;
  previousBodyOverflow = '';
  previousHtmlOverscroll = '';
  activeDialogStack = [];
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
    window.scrollTo({ top: preservedScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
  }
}

export function useDialog({
  isOpen,
  onClose,
  dialogId,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  enableSwipeDown = false,
  swipeThreshold = 75,
}: UseDialogOptions) {
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const idRef = useRef<string>(dialogId || `dialog_${Math.random().toString(36).slice(2, 9)}`);

  // 1. Background Scroll Lock, Restoration, and Stack Tracking
  useEffect(() => {
    if (!isOpen) return;
    const currentId = idRef.current;
    pushDialogToStack(currentId);
    lockScroll();
    return () => {
      popDialogFromStack(currentId);
      unlockScroll();
    };
  }, [isOpen]);

  // 2. Escape Key Dismissal (LIFO top-of-stack only)
  useEffect(() => {
    if (!isOpen || !closeOnEscape || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isEscape = event.key === 'Escape' || event.key === 'Esc';
      if (isEscape && activeDialogStack[activeDialogStack.length - 1] === idRef.current) {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, closeOnEscape, onClose]);

  // 3. Backdrop Click Handler
  const handleBackdropClick = (e: React.MouseEvent<HTMLElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  // 4. Safe Swipe-Down Dismissal Handlers
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
      if (touchCurrentY.current - touchStartY.current > swipeThreshold) onClose();
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    handleBackdropClick,
    swipeHandlers,
    headerSwipeHandlers: swipeHandlers,
  };
}
