import React from 'react';
import { IconName } from './pushpin-tear-types';

const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function Icon({
  name,
}: {
  name: IconName | 'chevL' | 'copy' | 'squiggle' | 'arrow' | 'check';
}) {
  const svg = (children: React.ReactNode, filled?: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className="tpf-ico"
      aria-hidden="true"
      {...(filled ? { fill: 'currentColor' } : P)}
    >
      {children}
    </svg>
  );
  switch (name) {
    case 'chevL':
      return svg(<path d="M14.5 5.5 8 12l6.5 6.5" />);
    case 'arrow':
      return svg(<path d="M5 12h13M13 6.5 18.5 12 13 17.5" />);
    case 'check':
      return svg(<path d="m5.5 12.5 4 4 9-9.5" />);
    case 'copy':
      return svg(
        <>
          <path d="M13.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5v-6.5" />
          <circle cx="18.5" cy="5.5" r="2.3" />
        </>
      );
    case 'github':
      return svg(
        <path
          fillRule="evenodd"
          d="M12 2.8a9.3 9.3 0 0 0-2.9 18.1c.5.1.6-.2.6-.5v-1.7c-2.6.6-3.1-1.1-3.1-1.1-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .8 1.4 2.2 1 2.7.8.1-.6.3-1 .6-1.2-2.1-.2-4.2-1-4.2-4.6 0-1 .4-1.8 1-2.5-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a8.8 8.8 0 0 1 4.6 0c1.8-1.2 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.5 1 2.5 0 3.6-2.2 4.4-4.2 4.6.3.3.6.8.6 1.6v2.4c0 .3.2.6.7.5A9.3 9.3 0 0 0 12 2.8z"
        />,
        true
      );
    case 'linkedin':
      return svg(
        <path
          fillRule="evenodd"
          d="M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5zm.2 6.6v7h2.2v-7zm1.1-3.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm2.6 3.4v7h2.2v-3.7c0-1 .4-1.6 1.2-1.6s1.1.6 1.1 1.6v3.7h2.2v-4.3c0-2-1-2.9-2.5-2.9-.9 0-1.6.4-2 1v-.8z"
        />,
        true
      );
    case 'doc':
      return svg(
        <>
          <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
          <path d="M14 3.5V8h4.5M8.8 12.5h6.4M8.8 16h4.2" />
        </>
      );
    case 'chat':
      return svg(
        <path
          fillRule="evenodd"
          d="M12 3C7 3 3.2 6.6 3.2 11.2c0 2.5 1.1 4.6 2.9 6.1v3.4l3.2-1.8c.8.2 1.8.4 2.7.4 5 0 8.8-3.6 8.8-8.1S17 3 12 3zm-4 9.4a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"
        />,
        true
      );
    case 'x':
      return svg(<path d="M5 4.5h3.6l10.4 15H15.4zM18.6 4.5 13.4 10.4M5.4 19.5l5.4-6.2" />);
    case 'ig':
      return svg(
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17.1" cy="6.9" r=".6" fill="currentColor" />
        </>
      );
    case 'globe':
      return svg(
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z" />
        </>
      );
    case 'mail':
      return svg(
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </>
      );
    case 'link':
      return svg(
        <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
      );
    case 'shield':
      return svg(
        <path
          fillRule="evenodd"
          d="M6.5 2.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4v-11a4 4 0 0 1 4-4zM12 6.2 7.6 7.8v3.6c0 2.9 1.9 5.2 4.4 6.2 2.5-1 4.4-3.3 4.4-6.2V7.8zm-2 5.8 1.4 1.4 2.8-2.9"
        />,
        true
      );
  }
}

export function Seal() {
  let d = '';
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 8.6 : 10;
    d +=
      (i ? 'L' : 'M') + (12 + Math.cos(a) * r).toFixed(2) + ' ' + (12 + Math.sin(a) * r).toFixed(2);
  }
  return (
    <svg viewBox="0 0 24 24" className="tpf-seal" aria-hidden="true">
      <path
        d={d + 'Z'}
        fill="currentColor"
        strokeLinejoin="round"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="m8.3 12.2 2.5 2.5 5-5.2"
        fill="none"
        stroke="var(--tpf-sheet)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SnapPrintLogo() {
  return (
    <img
      src="/brand/snapprint-icon.png"
      alt="SnapPrint"
      style={{
        width: '1.75em',
        height: '1.75em',
        borderRadius: '0.38em',
        display: 'block',
        objectFit: 'contain',
      }}
    />
  );
}

export function Clock({ zone, label }: { zone: string; label: string }) {
  const [t, setT] = React.useState(['--', '--']);
  React.useEffect(() => {
    let f: Intl.DateTimeFormat;
    try {
      f = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: zone,
      });
    } catch {
      f = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
    }
    const tick = () => setT(f.format(new Date()).split(':'));
    tick();
    const id = window.setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [zone]);
  return (
    <span className="tpf-clock">
      {label} {t[0]}
      <i aria-hidden="true">:</i>
      {t[1]}
    </span>
  );
}

export function A({
  href,
  onClick,
  className,
  label,
  children,
  style,
}: {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  if (onClick && !href) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={label}
        title={label}
        style={style}
      >
        {children}
      </button>
    );
  }
  const out = !onClick && !!href && /^https?:/.test(href);
  return (
    <a
      href={href || '/'}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={className}
      aria-label={label}
      title={label}
      style={style}
      {...(out ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
