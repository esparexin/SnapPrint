import React from 'react';
import { mixHex } from './pushpin-tear-color';

export const TEAR_CSS =
  '.tpf{position:relative;overflow:hidden;container-type:size;min-height:560px;background:var(--tpf-sheet);color:var(--tpf-on-sheet);font-family:var(--tpf-sans);isolation:isolate;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;--ease:cubic-bezier(.22,1,.36,1);--fs:clamp(12px,1.5cqmin,14px)}' +
  '.tpf *,.tpf *::before,.tpf *::after{box-sizing:border-box}' +
  ':where(.tpf) a{color:inherit;text-decoration:none}' +
  ':where(.tpf) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}' +
  ':where(.tpf) input{font:inherit;color:inherit;background:none;border:0;margin:0;outline:none}' +
  ':where(.tpf) :focus-visible{outline:1.5px solid currentColor;outline-offset:4px;border-radius:4px}' +
  '.tpf .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
  '.tpf-stage{position:absolute;left:0;top:0;max-width:none;display:block;pointer-events:none;z-index:0}' +
  '.tpf.is-hit .tpf-sheet-g{animation:tpf-hit .32s cubic-bezier(.3,.7,.4,1)}' +
  '.tpf-sheet{fill:var(--tpf-sheet)}.tpf-paper{fill:var(--tpf-paper)}.tpf-rim{fill:var(--tpf-rim)}' +
  '.tpf-ico{width:1.35em;height:1.35em;display:block;max-width:none;flex:none}' +
  '.tpf-mark{width:3.6em;height:2.3em;display:block;max-width:none;overflow:visible}' +
  '.tpf-seal{width:100%;height:100%;display:block;max-width:none}' +
  '.tpf-z{position:absolute;z-index:2}' +
  '.tpf-ink{color:var(--tpf-on-paper)}' +
  '.tpf-h{transition:opacity .35s var(--ease),translate .35s var(--ease)}' +
  '.tpf:not(.s1) .tpf-h{opacity:0;translate:0 10px}' +
  '.tpf-p{transition:opacity .35s var(--ease),translate .35s var(--ease)}' +
  '.tpf:not(.s3) .tpf-p{opacity:0;translate:0 18px}' +
  '.tpf-top{left:0;right:0;top:9.5%;transform:translateY(-50%);display:flex;align-items:center;justify-content:space-between;padding:0 10%;font-size:clamp(14px,2cqmin,18px)}' +
  '.tpf-brand-link{display:flex;align-items:center;gap:.55em;color:inherit;text-decoration:none}' +
  '.tpf-brand-link .tpf-mark{width:2.1em;height:1.6em}' +
  '.tpf-brand-title{font-size:clamp(16px,2.2cqmin,22px);font-weight:700;letter-spacing:-.025em}' +
  '.tpf-nav{display:flex;align-items:center;gap:clamp(8px,1.5cqmin,16px)}' +
  '.tpf-nav-link{font-size:clamp(13px,1.6cqmin,15px);font-weight:600;padding:.4em .8em;opacity:.95;border-radius:6px;transition:opacity .2s}' +
  '.tpf-nav-link:hover{opacity:1;text-decoration:underline;text-underline-offset:4px}' +
  '.tpf-btn-cta{display:inline-flex;align-items:center;font-size:clamp(13px,1.6cqmin,15px);font-weight:700;padding:.45em 1.2em;border-radius:99px;background:#ffffff;color:var(--tpf-sheet);box-shadow:0 3px 10px rgba(0,0,0,.15);transition:transform .2s,box-shadow .2s}' +
  '.tpf-btn-cta:hover{transform:translateY(-1.5px);box-shadow:0 6px 16px rgba(0,0,0,.22)}' +
  '.tpf-row{display:flex;align-items:center;gap:.55em}' +
  '.tpf-ib{display:grid;place-items:center;width:1.9em;height:1.9em;margin:-.3em;border-radius:50%;transition:transform .35s var(--ease),background-color .25s}' +
  '.tpf-ib:hover{transform:translateY(-2px);background:color-mix(in srgb,currentColor 14%,transparent)}' +
  '.tpf-ib:active{transform:scale(.9)}' +
  '.tpf-flank{top:22.4%;transform:translate(-50%,-50%);font-size:var(--fs);letter-spacing:.04em;white-space:nowrap;text-transform:uppercase}' +
  '.tpf-clock{font-variant-numeric:tabular-nums}.tpf-clock i{font-style:normal;animation:tpf-blink 2s steps(1) infinite}' +
  '.tpf-status{left:50%;top:19%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:.6em;font-size:clamp(13px,1.8cqmin,15px);white-space:nowrap;letter-spacing:.01em}' +
  '.tpf-live{position:relative;width:.5em;height:.5em;border-radius:50%;background:currentColor}' +
  ".tpf-live::after{content:'';position:absolute;inset:0;border-radius:50%;border:1.5px solid currentColor;animation:tpf-ping 2.2s var(--ease) infinite}" +
  '.tpf a.tpf-status:hover span{text-decoration:underline;text-underline-offset:.2em}' +
  '.tpf-badge{left:50%;top:23%;transform:translate(-50%,-50%);width:clamp(14px,1.8cqmin,18px);height:clamp(14px,1.8cqmin,18px)}' +
  '.tpf-desc{left:50%;top:30%;transform:translate(-50%,-50%);max-width:min(92cqw,680px);text-align:center;font-size:clamp(13.5px,1.7cqmin,16.5px);line-height:1.65;font-weight:500;letter-spacing:-.015em}.tpf-desc strong{font-weight:700;color:#ffffff}' +
  '.tpf-col{top:24%;display:grid;gap:clamp(4px,.7cqmin,7px);font-size:var(--fs)}' +
  '.tpf-col.l{left:14%;justify-items:start}.tpf-col.r{right:14%;justify-items:end;text-align:right}' +
  '.tpf-col h3{all:unset;display:flex;align-items:center;gap:1em;margin-bottom:clamp(3px,.5cqmin,6px);font-weight:600;text-transform:uppercase;letter-spacing:.06em;font-size:.88em;opacity:.85}' +
  '.tpf-col.r h3{flex-direction:row-reverse}' +
  '.tpf-col h3 .tpf-ico{width:1.1em;height:1.1em}' +
  '.tpf-col ul{all:unset;display:grid;gap:clamp(3px,.6cqmin,6px);justify-items:inherit}' +
  '.tpf-col li{list-style:none}' +
  '.tpf-col li a{display:inline-block;transition:transform .35s var(--ease),opacity .25s}' +
  '.tpf-col.l li a:hover{transform:translateX(4px)}.tpf-col.r li a:hover{transform:translateX(-4px)}' +
  '.tpf-big{margin-top:clamp(4px,.8cqmin,8px);font-size:clamp(20px,3.5cqmin,28px);letter-spacing:-.025em;line-height:1;text-decoration:underline;text-decoration-thickness:max(1.5px,.04em);text-underline-offset:.12em;transition:text-underline-offset .35s var(--ease)}' +
  '.tpf .tpf-big:hover{text-underline-offset:.22em}' +
  '.tpf-pin{position:absolute;z-index:3;left:50%;top:64%;width:clamp(38px,6cqmin,52px);height:clamp(76px,12cqmin,104px);transform:translate(-50%,-100%);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}' +
  '.tpf-pin:focus-visible{outline-offset:6px}' +
  '.tpf-tilt{position:absolute;inset:0;transform-origin:50% 100%;transform:rotate(calc(5deg + var(--tilt,0deg)));transition:transform .7s var(--ease)}' +
  '.tpf-drop,.tpf-body{position:absolute;inset:0;transform-origin:50% 100%}' +
  '.tpf-body{transition:transform .32s var(--ease)}' +
  '.tpf-pin-svg{position:absolute;inset:0;width:100%;height:100%;max-width:none;display:block;overflow:visible}' +
  '.tpf-shadow{position:absolute;right:50%;bottom:-.5%;width:150%;height:24%;transform-origin:100% 50%;transform:rotate(16deg);transition:transform .45s var(--ease),opacity .45s}' +
  ".tpf-shadow::before,.tpf-shadow::after{content:'';position:absolute;top:50%;border-radius:50%;transform:translateY(-50%)}" +
  '.tpf-shadow::before{right:0;width:100%;height:24%;background:linear-gradient(90deg,transparent,rgba(9,22,48,.26) 60%,rgba(9,22,48,.42));filter:blur(2px)}' +
  '.tpf-shadow::after{left:-6%;width:60%;height:100%;background:radial-gradient(closest-side,rgba(9,22,48,.22),transparent);filter:blur(3px)}' +
  '.tpf:not(.s2) .tpf-pin{opacity:0;pointer-events:none}' +
  '.tpf.s2 .tpf-drop{animation:tpf-drop .62s cubic-bezier(.5,0,.75,0) both}' +
  '.tpf.s2 .tpf-shadow{animation:tpf-shade .62s cubic-bezier(.5,0,.75,0) both}' +
  '.tpf-pin:hover .tpf-body{transform:translateY(-3%)}' +
  '.tpf-pin:hover .tpf-shadow{transform:rotate(16deg) translateX(-5%) scaleX(1.06)}' +
  '.tpf-pin[data-pin=lift] .tpf-body{transform:translateY(-22%) rotate(-10deg);transition-duration:.3s}' +
  '.tpf-pin[data-pin=lift] .tpf-shadow{transform:rotate(16deg) translateX(-26%) scale(1.25);opacity:.55}' +
  '.tpf-pin[data-pin=stab] .tpf-body{animation:tpf-stab .42s cubic-bezier(.55,0,.8,.2) both}' +
  '.tpf-brand{left:50%;top:67%;width:max-content;transform:translateX(-50%);display:grid;justify-items:stretch}' +
  '.tpf-brand-top{display:flex;align-items:center;justify-content:space-between;gap:1em;padding:0 .2em 0 .5em}' +
  '.tpf-eye{font-size:clamp(13px,1.8cqmin,17px);letter-spacing:-.02em;background:linear-gradient(90deg,var(--tpf-on-paper),color-mix(in srgb,var(--tpf-on-paper) 35%,var(--tpf-paper)));-webkit-background-clip:text;background-clip:text;color:transparent}' +
  '.tpf-bub{display:inline-flex;align-items:center;gap:.5em;height:1.7em;padding:0 .55em;border-radius:99px;background:color-mix(in srgb,var(--tpf-on-paper) 11%,var(--tpf-paper));font-size:max(11px,1.6cqmin);overflow:hidden;transition:padding .45s var(--ease)}' +
  '.tpf-dots{display:flex;gap:.22em}' +
  '.tpf-dots i{width:.38em;height:.38em;border-radius:50%;background:color-mix(in srgb,var(--tpf-on-paper) 45%,var(--tpf-paper));animation:tpf-dot 1.2s ease-in-out infinite}' +
  '.tpf-dots i:nth-child(2){animation-delay:.15s}.tpf-dots i:nth-child(3){animation-delay:.3s}' +
  '.tpf-bub b{font-weight:500;max-width:0;opacity:0;white-space:nowrap;transition:max-width .5s var(--ease),opacity .3s}' +
  '.tpf-bub:hover,.tpf-bub:focus-visible{padding:0 .8em}' +
  '.tpf-bub:hover b,.tpf-bub:focus-visible b{max-width:8em;opacity:1}' +
  '.tpf-word{display:block;overflow:hidden;padding:0 .04em .14em;font-size:clamp(36px,min(8cqmin,10cqw),64px);font-weight:600;letter-spacing:-.045em;line-height:.98;white-space:nowrap}' +
  '.tpf-word span{display:block;position:relative;transition:transform 1s var(--ease) .5s}' +
  ".tpf-word span::after{content:'';position:absolute;left:.02em;right:.04em;bottom:-.02em;height:max(2px,.045em);background:currentColor;transform-origin:0 50%;transition:transform .9s var(--ease) 1.05s,height .3s var(--ease)}" +
  '.tpf:not(.s3) .tpf-word span{transform:translateY(125%);transition-delay:0s}' +
  '.tpf:not(.s3) .tpf-word span::after{transform:scaleX(0);transition-delay:0s}' +
  '.tpf-word:hover span::after{height:max(4px,.075em)}' +
  '.tpf-word:has(img) span::after{display:none}' +
  '.tpf-side{top:76%;display:grid;justify-items:center;gap:clamp(8px,1.5cqmin,12px);font-size:clamp(12px,1.6cqmin,14px);transform:translateX(-50%)}' +
  '.tpf-side .tpf-ico{width:1.35em;height:1.35em;transition:transform .35s var(--ease)}' +
  '.tpf-side:hover .tpf-ico{transform:translateY(-2px) rotate(-8deg)}' +
  '.tpf-side span{background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size .4s var(--ease)}' +
  '.tpf-side:hover span{background-size:100% 1px}' +
  '.tpf-foot{left:0;right:0;bottom:4%;display:flex;align-items:center;justify-content:space-between;gap:1.5em;padding:0 10%;font-size:clamp(11px,1.4cqmin,13px)}' +
  '.tpf-foot-links{display:flex;align-items:center;gap:1.5em}' +
  '.tpf-foot-links a{color:inherit;opacity:.85;transition:opacity .2s}' +
  '.tpf-foot-links a:hover{opacity:1;text-decoration:underline;text-underline-offset:3px}' +
  '@container (max-width: 620px){' +
  '.tpf-top{padding:0 5%}.tpf-flank{display:none}' +
  '.tpf-brand-title{font-size:16px}' +
  '.tpf-nav{gap:6px}' +
  '.tpf-nav-link{padding:.3em .4em;font-size:12.5px}' +
  '.tpf-btn-cta{padding:.32em .8em;font-size:12px}' +
  '.tpf-status{top:19%;font-size:12px}.tpf-badge{top:23%}' +
  '.tpf-desc{top:30%;font-size:12.5px;max-width:88cqw;line-height:1.45}' +
  '.tpf-col{top:29%}.tpf-col.l{left:6%}.tpf-col.r{right:6%}.tpf-col li:nth-child(n+3){display:none}' +
  '.tpf-side{top:85%}.tpf-side.l{left:14%!important}.tpf-side.r{left:86%!important}' +
  '.tpf-foot{padding:0 5%;bottom:3%;font-size:11px}' +
  '.tpf-foot-links{gap:1em}' +
  '}' +
  '@keyframes tpf-hit{0%{transform:translateY(0)}30%{transform:translateY(2px)}60%{transform:translateY(-.5px)}100%{transform:translateY(0)}}' +
  '@keyframes tpf-drop{0%{transform:translateY(-62cqh) rotate(-28deg) scale(1.5);opacity:0}25%{opacity:1}80%{transform:translateY(0) rotate(3deg) scale(1)}90%{transform:scale(1.04,.95)}100%{transform:none;opacity:1}}' +
  '@keyframes tpf-shade{0%{transform:rotate(16deg) translateX(-60%) scale(2.4);opacity:0}80%{transform:rotate(16deg);opacity:1}100%{transform:rotate(16deg);opacity:1}}' +
  '@keyframes tpf-stab{0%{transform:translateY(-22%) rotate(-10deg)}70%{transform:translateY(1.5%) rotate(1deg)}100%{transform:none}}' +
  '@keyframes tpf-dot{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-2.5px);opacity:1}}' +
  '@keyframes tpf-bob{0%{transform:none}40%{transform:translateY(-3px) scale(1.15)}100%{transform:none}}' +
  '@keyframes tpf-blink{0%{opacity:1}50%{opacity:.25}}' +
  '@keyframes tpf-ping{0%{transform:scale(1);opacity:.9}80%,100%{transform:scale(2.6);opacity:0}}' +
  '@media (prefers-reduced-motion: reduce){.tpf *,.tpf *::before,.tpf *::after{animation:none!important;transition-duration:.01s!important;transition-delay:0s!important}}';

export function computePushpinVars(
  sheet = '#0284c7',
  paper = '#ffffff',
  sheetInk = '#ffffff',
  paperInk?: string,
  height: number | string = '100svh',
  fontSans = 'var(--font-family)'
) {
  const pinBase = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(sheet) ? sheet : '#0284c7';
  const flapBase = mixHex(
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(paper) ? paper : '#f8fafc',
    '#ffffff',
    0.35
  );
  const vars = {
    height: typeof height === 'number' ? height + 'px' : height,
    '--tpf-sheet': sheet,
    '--tpf-paper': paper,
    '--tpf-on-sheet': sheetInk,
    '--tpf-on-paper': paperInk ?? sheet,
    '--tpf-rim': mixHex(flapBase, '#ffffff', 0.6),
    '--tpf-sans': fontSans,
  } as React.CSSProperties;
  return { pinBase, flapBase, vars };
}
