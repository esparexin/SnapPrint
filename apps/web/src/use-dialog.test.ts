import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  lockScroll,
  unlockScroll,
  getOpenDialogCount,
  resetDialogStateForTests,
} from './use-dialog';

describe('useDialog Scroll Locking & Restoration Logic', () => {
  let mockScrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetDialogStateForTests();

    mockScrollTo = vi.fn();

    const mockBody = {
      style: {
        overflow: '',
      },
    };

    const mockHtml = {
      style: {
        overscrollBehavior: '',
      },
      scrollTop: 0,
    };

    vi.stubGlobal('document', {
      body: mockBody,
      documentElement: mockHtml,
    });

    vi.stubGlobal('window', {
      scrollY: 240,
      scrollTo: mockScrollTo,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks body overflow and document overscroll on first dialog open', () => {
    expect(getOpenDialogCount()).toBe(0);
    lockScroll();

    expect(getOpenDialogCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overscrollBehavior).toBe('contain');
  });

  it('supports nested dialogs without premature unlock', () => {
    lockScroll(); // Dialog 1 (e.g. Printer Fleet)
    lockScroll(); // Dialog 2 (e.g. Pair Agent child modal)

    expect(getOpenDialogCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');

    unlockScroll(); // Close Dialog 2
    expect(getOpenDialogCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(mockScrollTo).not.toHaveBeenCalled();

    unlockScroll(); // Close Dialog 1
    expect(getOpenDialogCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overscrollBehavior).toBe('');
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 240,
      left: 0,
      behavior: 'instant',
    });
  });

  it('restores original scroll position after closing', () => {
    (window as unknown as { scrollY: number }).scrollY = 580;
    lockScroll();

    expect(document.body.style.overflow).toBe('hidden');

    unlockScroll();
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 580,
      left: 0,
      behavior: 'instant',
    });
  });
});
