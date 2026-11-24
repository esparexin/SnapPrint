'use client';

import React, { useId, useRef } from 'react';
import { PushpinTearContent } from './pushpin-tear-content';
import { usePushpinTearAnimation, useReducedMotion } from './pushpin-tear-hook';
import { PushpinTearBottom, PushpinTearColumns } from './pushpin-tear-nav';
import { PinButton } from './pushpin-tear-pin';
import { PushpinTearStage } from './pushpin-tear-stage';
import { computePushpinVars, TEAR_CSS } from './pushpin-tear-styles';
import { DEFAULT_PROPS, PushpinTearFooterProps } from './pushpin-tear-types';

export default function PushpinTearFooter(rawProps: PushpinTearFooterProps) {
  const p = { ...DEFAULT_PROPS, ...rawProps };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<SVGPathElement>(null);
  const rimRef = useRef<SVGPathElement>(null);
  const flapRefs = useRef<(SVGPathElement | null)[]>([]);
  const gradRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
  const pinRef = useRef<HTMLButtonElement>(null);

  const still = useReducedMotion();

  const { stage, hit, pin, repin, kick, s } = usePushpinTearAnimation({
    seed: p.seed,
    still,
    rootRef,
    svgRef,
    sheetRef,
    rimRef,
    flapRefs,
    gradRefs,
    onRepin: p.onRepin,
  });

  const { pinBase, flapBase, vars } = computePushpinVars(
    p.sheet,
    p.paper,
    p.sheetInk,
    p.paperInk,
    p.height,
    p.fontSans
  );

  const mailto = 'mailto:' + p.email;
  const cols = (p.columns ?? []).slice(0, 2);
  const H = (i: number) => ({ '--i': i }) as React.CSSProperties;
  const cls = [
    'tpf',
    stage >= 1 && 's1',
    stage >= 2 && 's2',
    stage >= 3 && 's3',
    hit && 'is-hit',
    p.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <footer
      ref={rootRef}
      className={cls}
      style={vars}
      onPointerMove={(e) => {
        if (!rootRef.current || s.still) return;
        const r = rootRef.current.getBoundingClientRect();
        s.px = e.clientX - r.left;
        s.py = e.clientY - r.top;
        const tilt = Math.max(-9, Math.min(9, (s.px / r.width - 0.5) * 18));
        pinRef.current?.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
        kick();
      }}
      onPointerLeave={() => {
        s.px = s.py = -1e4;
        pinRef.current?.style.setProperty('--tilt', '0deg');
        kick();
      }}
    >
      <style>{TEAR_CSS}</style>
      <PushpinTearStage
        svgRef={svgRef}
        uid={uid}
        flapBase={flapBase}
        gradRefs={gradRefs}
        sheetRef={sheetRef}
        rimRef={rimRef}
        flapRefs={flapRefs}
      />
      <PushpinTearContent
        uid={uid}
        brand={p.brand}
        topNav={p.topNav}
        socials={p.socials}
        logo={p.logo}
        logoHref={p.logoHref}
        name={p.name}
        newsletter={p.newsletter}
        onSubscribe={p.onSubscribe}
        mark={p.mark}
        timeZone={p.timeZone}
        timeLabel={p.timeLabel}
        status={p.status}
        description={p.description}
        mailto={mailto}
        H={H}
        flash={() => {}}
      />
      <PushpinTearColumns cols={cols} H={H} />
      <PinButton pinRef={pinRef} pin={pin} repin={repin} pinBase={pinBase} uid={uid} />
      <PushpinTearBottom
        name={p.name}
        brand={p.brand}
        logoHref={p.logoHref}
        chat={p.chat ?? null}
        mailto={mailto}
        sideLinks={p.sideLinks}
        copyright={p.copyright}
        footerLinks={p.footerLinks}
        H={H}
      />
    </footer>
  );
}
