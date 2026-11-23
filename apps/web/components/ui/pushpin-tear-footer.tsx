'use client';

import React, { useId, useRef, useState } from 'react';
import { PushpinTearContent } from './pushpin-tear-content';
import { usePushpinTearAnimation, useReducedMotion } from './pushpin-tear-hook';
import { A, Icon } from './pushpin-tear-icons';
import { mixHex } from './pushpin-tear-math';
import { Pin } from './pushpin-tear-pin';
import { PushpinTearStage } from './pushpin-tear-stage';
import { TEAR_CSS } from './pushpin-tear-styles';
import {
  DEFAULT_COLUMNS,
  DEFAULT_SIDES,
  DEFAULT_SOCIALS,
  PushpinTearFooterProps,
} from './pushpin-tear-types';

export default function PushpinTearFooter({
  brand = 'SnapPrint',
  name = 'Palnadu Print Cloud',
  logo,
  logoHref = 'https://print.palnadu.dev',
  socials = DEFAULT_SOCIALS,
  email = 'contact@snapprint.in',
  newsletter = { label: 'get shop updates & print offers', placeholder: 'your@email' },
  status = { label: 'accepting digital print orders' },
  mark = 'SN / 2026',
  timeZone = 'Asia/Kolkata',
  timeLabel = 'IST',
  columns = DEFAULT_COLUMNS,
  chat = null,
  sideLinks = DEFAULT_SIDES,
  copyright = '© 2026 SnapPrint Technologies',
  credit = 'multi-tenant print network',
  handle = { label: '@snapprint', href: 'https://print.palnadu.dev' },
  sheet = '#0284c7',
  paper = '#f8fafc',
  sheetInk = '#ffffff',
  paperInk,
  seed = 7,
  height = '100svh',
  fontSans = '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
  onSubscribe,
  onRepin,
  className = '',
}: PushpinTearFooterProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const sheetRef = useRef<SVGPathElement>(null);
  const rimRef = useRef<SVGPathElement>(null);
  const flapRefs = useRef<(SVGPathElement | null)[]>([]);
  const gradRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
  const pinRef = useRef<HTMLButtonElement>(null);

  const still = useReducedMotion();
  const [toast, setToast] = useState('');

  const { stage, hit, pin, repin, kick, s, timers } = usePushpinTearAnimation({
    seed,
    still,
    rootRef,
    svgRef,
    sheetRef,
    rimRef,
    flapRefs,
    gradRefs,
    onRepin,
  });

  const flash = (msg: string) => {
    setToast(msg);
    timers.current.push(window.setTimeout(() => setToast(''), 1600));
  };

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

  const mailto = 'mailto:' + email;
  const cols = columns.slice(0, 2);
  const H = (i: number) => ({ '--i': i }) as React.CSSProperties;
  const cls = [
    'tpf',
    stage >= 1 && 's1',
    stage >= 2 && 's2',
    stage >= 3 && 's3',
    hit && 'is-hit',
    className,
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
        still={still}
        socials={socials}
        logo={logo}
        logoHref={logoHref}
        name={name}
        email={email}
        newsletter={newsletter}
        onSubscribe={onSubscribe}
        mark={mark}
        timeZone={timeZone}
        timeLabel={timeLabel}
        status={status}
        mailto={mailto}
        H={H}
        flash={flash}
        toast={toast}
      />
      {cols.map((c, i) => (
        <nav key={i} className={'tpf-z tpf-col tpf-h ' + (i ? 'r' : 'l')} style={H(6 + i)}>
          <h3>{c.title}</h3>
          <ul>
            {c.links.map((l, j) => (
              <li key={j}>
                <A href={l.href}>{l.label}</A>
              </li>
            ))}
          </ul>
        </nav>
      ))}
      <button
        ref={pinRef}
        type="button"
        className="tpf-pin"
        data-pin={pin}
        onClick={repin}
        aria-label="Re-pin"
      >
        <span className="tpf-shadow" aria-hidden="true" />
        <span className="tpf-tilt">
          <span className="tpf-drop">
            <span className="tpf-body">
              <Pin base={pinBase} id={uid + 'p'} />
            </span>
          </span>
        </span>
      </button>
      <div className="tpf-z tpf-brand tpf-ink">
        <div className="tpf-brand-top tpf-p" style={H(0)}>
          <span className="tpf-eye">{name}</span>
          {chat && (
            <A href={chat.href ?? mailto} className="tpf-bub" label={chat.label}>
              <b>{chat.label}</b>
            </A>
          )}
        </div>
        <A href={logoHref} className="tpf-word" label={name}>
          <span>{brand}</span>
        </A>
      </div>
      {sideLinks.slice(0, 2).map((l, i) => (
        <A
          key={i}
          href={l.href}
          className={'tpf-z tpf-side tpf-ink tpf-p ' + (i ? 'r' : 'l')}
          label={l.label}
          style={{ ...H(1 + i), left: i ? '71.5%' : '29.5%' }}
        >
          <span>{l.label}</span>
          <Icon name={l.icon} />
        </A>
      ))}
      <div className="tpf-z tpf-foot tpf-ink">
        <span className="tpf-p" style={H(3)}>
          {copyright}
        </span>
        {credit && (
          <span className="tpf-credit tpf-p" style={H(4)}>
            {credit}
          </span>
        )}
        <A href={handle.href} className="tpf-handle tpf-p" style={H(5)}>
          {handle.label}
        </A>
      </div>
    </footer>
  );
}
