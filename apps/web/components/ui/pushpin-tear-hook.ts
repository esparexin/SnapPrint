import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clamp01,
  easeInOut,
  easeTear,
  flapOpen,
  flapPoly,
  FLAPS,
  introYs,
  makeTear,
  morphYs,
  polyD,
  sheetD,
  START,
  XS,
} from './pushpin-tear-math';
import { Flap, Tear, AnimationParams } from './pushpin-tear-types';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => setReduced(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);
  return reduced;
}

export function usePushpinTearAnimation(p: AnimationParams) {
  const { seed, still, rootRef, svgRef, sheetRef, rimRef, flapRefs, gradRefs, onRepin } = p;
  const [stage, setStage] = useState(3);
  const [hit] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pin, setPin] = useState<'idle' | 'lift' | 'stab'>('idle');
  const timers = useRef<number[]>([]);

  const s = useRef({
    W: 0,
    H: 0,
    tear: makeTear(seed),
    prev: null as Tear | null,
    from: [] as number[],
    ys: [] as number[],
    mode: 'rest' as 'wait' | 'intro' | 'morph' | 'rest',
    t0: 0,
    dur: 1,
    raf: 0,
    px: -1e4,
    py: -1e4,
    lift: new Array(FLAPS).fill(0) as number[],
    still: false,
    busy: false,
    seed,
  }).current;
  s.still = still;

  const frame = useCallback(
    (now: number) => {
      s.raf = 0;
      const { W, H, tear } = s;
      if (!W || !H) return;
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
      } else ys = tear.ys;
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
      if (busy) s.raf = requestAnimationFrame(frame);
    },
    [s, sheetRef, rimRef, flapRefs, gradRefs]
  );

  const kick = useCallback(() => {
    if (!s.raf && typeof requestAnimationFrame !== 'undefined')
      s.raf = requestAnimationFrame(frame);
  }, [s, frame]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      s.W = el.clientWidth;
      s.H = el.clientHeight;
      if (svgRef.current) {
        svgRef.current.setAttribute('width', String(s.W));
        svgRef.current.setAttribute('height', String(s.H));
        svgRef.current.setAttribute('viewBox', '0 0 ' + s.W + ' ' + s.H);
      }
      kick();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [s, kick, rootRef, svgRef]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.22 });
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!visible) return;
    setStage(3);
    s.mode = 'rest';
    kick();
  }, [visible, s, kick]);

  useEffect(() => () => timers.current.forEach((id) => clearTimeout(id)), []);

  useEffect(() => {
    if (seed === s.seed) return;
    s.seed = seed;
    s.prev = s.tear;
    s.from = s.ys.length ? s.ys : s.tear.ys;
    s.tear = makeTear(seed);
    if (s.mode !== 'wait') {
      s.mode = still ? 'rest' : 'morph';
      s.t0 = performance.now();
      s.dur = 1100;
    }
    kick();
  }, [seed, still, s, kick]);

  const repin = () => {
    if (s.busy || stage < 3) return;
    const next = s.seed + 1;
    const swap = () => {
      s.seed = next;
      s.prev = s.tear;
      s.from = s.ys.length ? s.ys : s.tear.ys;
      s.tear = makeTear(next);
    };
    if (still) {
      swap();
      s.prev = null;
      s.mode = 'rest';
      kick();
      onRepin?.(next);
      return;
    }
    s.busy = true;
    setPin('lift');
    timers.current.push(
      window.setTimeout(() => {
        swap();
        s.mode = 'morph';
        s.t0 = performance.now();
        s.dur = 1150;
        kick();
      }, 300),
      window.setTimeout(() => setPin('stab'), 1280),
      window.setTimeout(() => {
        setPin('idle');
        s.busy = false;
        onRepin?.(next);
      }, 1720)
    );
  };

  return { stage, hit, pin, repin, kick, s, timers };
}
