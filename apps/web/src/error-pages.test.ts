import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    default: actual,
    useEffect: (fn: () => void) => {
      try {
        fn();
      } catch {
        // no-op
      }
    },
  };
});

import NotFound from '../app/not-found.js';
import ErrorBoundary from '../app/error.js';
import GlobalError from '../app/global-error.js';

function collectStringsAndProps(node: React.ReactNode): {
  texts: string[];
  hrefs: string[];
  buttons: Array<{ text: string; onClick?: () => void }>;
} {
  const result: {
    texts: string[];
    hrefs: string[];
    buttons: Array<{ text: string; onClick?: () => void }>;
  } = {
    texts: [],
    hrefs: [],
    buttons: [],
  };

  function traverse(current: unknown) {
    if (typeof current === 'string' || typeof current === 'number') {
      result.texts.push(String(current));
      return;
    }
    if (!current || typeof current !== 'object') {
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(traverse);
      return;
    }

    const element = current as {
      type?: unknown;
      props?: Record<string, unknown>;
    };

    if (typeof element.type === 'function') {
      try {
        const rendered = (element.type as (props: unknown) => React.ReactNode)(element.props || {});
        traverse(rendered);
      } catch {
        // no-op
      }
    }

    if (element.props) {
      if (typeof element.props.href === 'string') {
        result.hrefs.push(element.props.href);
      }
      if (element.type === 'button') {
        const buttonText: string[] = [];
        if (typeof element.props.children === 'string') {
          buttonText.push(element.props.children);
        }
        result.buttons.push({
          text: buttonText.join(' '),
          onClick: element.props.onClick as (() => void) | undefined,
        });
      }
      if (element.props.children) {
        traverse(element.props.children);
      }
    }
  }

  traverse(node);
  return result;
}

describe('Phase 13: Branded Route Error Pages & Boundaries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('apps/web/app/not-found.tsx (404 Page)', () => {
    it('renders a branded 404 page with return home link and Palnadu.dev attribution', () => {
      const element = NotFound();
      const { texts, hrefs, buttons } = collectStringsAndProps(element);
      const fullText = texts.join(' ');

      // Must display 404 status indicator and friendly messaging
      expect(fullText).toContain('404');
      expect(fullText).toContain('Resource Not Found');
      expect(fullText).toContain('We couldn’t find that page');

      // Must include Return to Home link
      expect(hrefs).toContain('/');

      // Must include mandatory attribution link to Palnadu.dev
      expect(hrefs).toContain('https://www.palnadu.dev');
      expect(fullText).toContain('Developed by Palnadu.dev');

      // INVARIANT: No retry action for permanent 404 errors
      const retryButtons = buttons.filter((b) => /retry|try again/i.test(b.text));
      expect(retryButtons).toHaveLength(0);
    });
  });

  describe('apps/web/app/error.tsx (Client Error Boundary)', () => {
    it('renders error boundary with safe recovery actions and diagnostic reference', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const resetMock = vi.fn();
      const errorWithDigest = Object.assign(new Error('Sensitive internal DB failure details'), {
        digest: 'NEXT_ERR_DIGEST_98765',
      });

      const element = ErrorBoundary({ error: errorWithDigest, reset: resetMock });
      const { texts, hrefs, buttons } = collectStringsAndProps(element);
      const fullText = texts.join(' ');

      // Must log to diagnostic console
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unhandled route error caught by error boundary:',
        errorWithDigest
      );

      // Must indicate 500 / unexpected error
      expect(fullText).toContain('500');
      expect(fullText).toContain('Unexpected Error');
      expect(fullText).toContain('Something went wrong');

      // INVARIANT: Must NOT leak raw internal error message / stack trace to UI
      expect(fullText).not.toContain('Sensitive internal DB failure details');

      // Must display safe digest identifier
      expect(fullText).toContain('NEXT_ERR_DIGEST_98765');

      // Must include Try Again button that triggers reset()
      const tryAgainButton = buttons.find((b) => /try again/i.test(b.text));
      expect(tryAgainButton).toBeDefined();
      expect(tryAgainButton?.onClick).toBeDefined();
      tryAgainButton?.onClick?.();
      expect(resetMock).toHaveBeenCalledTimes(1);

      // Must include navigation link to home
      expect(hrefs).toContain('/');

      // Must include Palnadu.dev attribution
      expect(hrefs).toContain('https://www.palnadu.dev');
      expect(fullText).toContain('Developed by Palnadu.dev');
    });

    it('renders cleanly without digest reference when digest is absent', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const resetMock = vi.fn();
      const simpleError = new Error('Client render glitch');

      const element = ErrorBoundary({ error: simpleError, reset: resetMock });
      const { texts } = collectStringsAndProps(element);
      const fullText = texts.join(' ');

      expect(fullText).toContain('Something went wrong');
      expect(fullText).not.toContain('Error Reference ID');
    });
  });

  describe('apps/web/app/global-error.tsx (Root Layout Crash Boundary)', () => {
    it('renders html/body wrapper with retry action and Palnadu.dev attribution', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const resetMock = vi.fn();
      const fatalError = Object.assign(new Error('Root shell breakdown'), {
        digest: 'FATAL_ROOT_ERR_4321',
      });

      const element = GlobalError({ error: fatalError, reset: resetMock });

      // Must return an <html> tag element
      expect(element.type).toBe('html');

      // Must log to diagnostic console
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fatal root layout error caught by global error boundary:',
        fatalError
      );

      const { texts, hrefs, buttons } = collectStringsAndProps(element);
      const fullText = texts.join(' ');

      // Displays fatal error messaging and diagnostic ID
      expect(fullText).toContain('Fatal Application Error');
      expect(fullText).toContain('FATAL_ROOT_ERR_4321');

      // Must NOT leak raw error text
      expect(fullText).not.toContain('Root shell breakdown');

      // Has Try Again button that calls reset()
      const tryAgainBtn = buttons.find((b) => /try again/i.test(b.text));
      expect(tryAgainBtn).toBeDefined();
      tryAgainBtn?.onClick?.();
      expect(resetMock).toHaveBeenCalledTimes(1);

      // Has Reload SnapPrint button
      const reloadBtn = buttons.find((b) => /reload snapprint/i.test(b.text));
      expect(reloadBtn).toBeDefined();

      // Has Palnadu.dev link
      expect(hrefs).toContain('https://www.palnadu.dev');
      expect(fullText).toContain('Developed by Palnadu.dev');
    });
  });
});
