import React from 'react';
import {
  clamp01,
  easeInOut,
  easeTear,
  flapOpen,
  flapPoly,
  FLAPS,
  introYs,
  morphYs,
  polyD,
  sheetD,
  START,
  XS,
} from './pushpin-tear-math';
import { Flap, Tear } from './pushpin-tear-types';

export interface TearState {
  W: number;
  H: number;
  tear: Tear;
  prev: Tear | null;
  from: number[];
  ys: number[];
  mode: 'wait' | 'intro' | 'morph' | 'rest';
  t0: number;
  dur: number;
  raf: number;
  px: number;
  py: number;
  lift: number[];
  still: boolean;
  busy: boolean;
  seed: number;
}

export function computeTearFrame(s: TearState, now: number) {
  const { W, H, tear } = s;
  let busy = false;
  let ys: number[];
  const open = new Array(FLAPS).fill(1);
  const openOld = new Array(FLAPS).fill(0);

  if (s.mode === 'wait') {
    ys = tear.ys.map(() => START);
    open.fill(0);
  } else if (s.mode === 'intro') {
    const p = (now - s.t0) / s.dur;
    ys = introYs(tear, Math.min(1, p));
    tear.flaps.forEach((f, k) => (open[k] = flapOpen(tear, f, Math.min(1, p))));
    if (p >= 1) s.mode = 'rest';
    else busy = true;
  } else if (s.mode === 'morph') {
    const p = (now - s.t0) / s.dur;
    ys = morphYs(s.from, tear, Math.min(1, p));
    open.fill(easeTear((p - 0.5) / 0.5));
    openOld.fill(1 - easeInOut(p / 0.35));
    if (p >= 1) s.mode = 'rest';
    else busy = true;
  } else {
    ys = tear.ys;
  }
  s.ys = ys;

  tear.flaps.forEach((f, k) => {
    const b = Math.min(ys.length - 1, f.at + f.span);
    const mx = ((XS[f.at] + XS[b]) / 2) * W;
    const my = ((ys[f.at] + ys[b]) / 2) * H;
    const target = s.still
      ? 0
      : clamp01(1 - Math.hypot(s.px - mx, s.py - my) / (0.2 * Math.max(W, 520)));
    s.lift[k] += (target - s.lift[k]) * 0.14;
    if (Math.abs(target - s.lift[k]) > 0.003) busy = true;
    open[k] *= 1 + 0.32 * s.lift[k];
  });

  return { ys, open, openOld, busy };
}

export function renderTearSvg(
  s: TearState,
  ys: number[],
  open: number[],
  openOld: number[],
  sheetRef: React.RefObject<SVGPathElement | null>,
  rimRef: React.RefObject<SVGPathElement | null>,
  flapRefs: React.MutableRefObject<(SVGPathElement | null)[]>,
  gradRefs: React.MutableRefObject<(SVGLinearGradientElement | null)[]>
) {
  const { W, H, tear } = s;
  sheetRef.current?.setAttribute('d', sheetD(ys, W, H, tear.rim));
  rimRef.current?.setAttribute('d', sheetD(ys, W, H));

  const draw = (k: number, f: Flap | undefined, o: number) => {
    const el = flapRefs.current[k];
    const g = gradRefs.current[k];
    if (!el || !g) return;
    if (!f || o < 0.01) return el.setAttribute('d', '');
    const pts = flapPoly(ys, f, W, H, o);
    el.setAttribute('d', polyD(pts));
    const b = Math.min(ys.length - 1, f.at + f.span);
    const tip = pts[f.span + 3];
    g.setAttribute('x1', String(((XS[f.at] + XS[b]) / 2) * W));
    g.setAttribute('y1', String(((ys[f.at] + ys[b]) / 2) * H));
    g.setAttribute('x2', String(tip[0]));
    g.setAttribute('y2', String(tip[1]));
  };

  for (let k = 0; k < FLAPS; k++) {
    draw(k, tear.flaps[k], open[k]);
    draw(FLAPS + k, s.prev?.flaps[k], openOld[k]);
  }
}
