import React from 'react';

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
