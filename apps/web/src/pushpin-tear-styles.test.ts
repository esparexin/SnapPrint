import { describe, expect, it } from 'vitest';
import { computePushpinVars, TEAR_CSS } from '../components/ui/pushpin-tear-styles';
import { DEFAULT_PROPS } from '../components/ui/pushpin-tear-types';

describe('PushpinTear Viewport & Responsive Styles Regression Tests', () => {
  it('defaults pushpin tear container height to 100% to match parent viewport', () => {
    const { vars } = computePushpinVars();
    expect(vars.height).toBe('100%');
    expect(DEFAULT_PROPS.height).toBe('100%');
  });

  it('guarantees stage svg fills 100% width and height', () => {
    expect(TEAR_CSS).toContain('.tpf-stage{position:absolute;left:0;top:0;width:100%;height:100%');
  });

  it('ensures .tpf uses 100% min-height rather than hardcoded 560px or svh', () => {
    expect(TEAR_CSS).toContain('min-height:100%');
    expect(TEAR_CSS).not.toContain('min-height:560px');
    expect(TEAR_CSS).not.toContain('100svh');
  });

  it('anchors top navigation below mobile sensor notch with safe-area-inset-top', () => {
    expect(TEAR_CSS).toContain(
      '.tpf-top{padding:0 5%;top:calc(env(safe-area-inset-top, 0px) + 10px)'
    );
  });

  it('anchors footer links above iOS home indicator with safe-area-inset-bottom', () => {
    expect(TEAR_CSS).toContain(
      '.tpf-foot{padding:0 5%;bottom:max(calc(env(safe-area-inset-bottom, 0px) + 8px), 3%)'
    );
  });
});
