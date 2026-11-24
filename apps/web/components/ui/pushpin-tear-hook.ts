import { useCallback, useEffect, useRef, useState } from 'react';
import { FLAPS, makeTear } from './pushpin-tear-math';
import { computeTearFrame, renderTearSvg, TearState } from './pushpin-tear-render';
import { Tear, AnimationParams } from './pushpin-tear-types';
import { useReducedMotion } from './use-reduced-motion';

export { useReducedMotion };

export function usePushpinTearAnimation(p: AnimationParams) {
  const { seed, still, rootRef, svgRef, sheetRef, rimRef, flapRefs, gradRefs, onRepin } = p;
  const [stage, setStage] = useState(3);
  const [hit] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pin, setPin] = useState<'idle' | 'lift' | 'stab'>('idle');
  const timers = useRef<number[]>([]);

  const s = useRef<TearState>({
    W: 0,
    H: 0,
    tear: makeTear(seed),
    prev: null as Tear | null,
    from: [] as number[],
    ys: [] as number[],
    mode: 'rest',
    t0: 0,
    dur: 1,
    raf: 0,
    px: -1e4,
    py: -1e4,
    lift: new Array(FLAPS).fill(0),
    still: false,
    busy: false,
    seed,
  }).current;
  s.still = still;

  const frame = useCallback(
    (now: number) => {
      s.raf = 0;
      if (!s.W || !s.H) return;
      const { ys, open, openOld, busy } = computeTearFrame(s, now);
      renderTearSvg(s, ys, open, openOld, sheetRef, rimRef, flapRefs, gradRefs);
      if (busy) s.raf = requestAnimationFrame(frame);
    },
    [s, sheetRef, rimRef, flapRefs, gradRefs]
  );

  const kick = useCallback(() => {
    if (!s.raf && typeof requestAnimationFrame !== 'undefined') {
      s.raf = requestAnimationFrame(frame);
    }
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
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.22,
    });
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
