import React, { useState } from 'react';
import { A, Clock, Icon, Seal, SnapPrintLogo } from './pushpin-tear-icons';
import { IconLink, TopNavLink } from './pushpin-tear-types';

interface PushpinTearContentProps {
  uid: string;
  socials?: IconLink[];
  logo?: React.ReactNode;
  logoHref: string;
  brand?: string;
  topNav?: TopNavLink[];
  name: string;
  newsletter?: { label: string; placeholder?: string } | null;
  onSubscribe?: (email: string) => void;
  mark?: string;
  timeZone?: string;
  timeLabel?: string;
  status?: { label: string; href?: string } | null;
  mailto: string;
  H: (i: number) => React.CSSProperties;
  flash?: () => void;
}

export function PushpinTearContent({
  uid,
  socials,
  logo,
  logoHref,
  brand,
  topNav,
  name,
  newsletter,
  onSubscribe,
  mark,
  timeZone,
  timeLabel,
  status,
  mailto,
  H,
  flash,
}: PushpinTearContentProps) {
  const [sent, setSent] = useState(false);
  const [address, setAddress] = useState('');

  return (
    <>
      <div className="tpf-z tpf-top">
        <A href={logoHref} className="tpf-brand-link tpf-h" label={name} style={H(0)}>
          {logo ?? <SnapPrintLogo />}
          <span className="tpf-brand-title">{brand ?? name}</span>
        </A>

        {topNav && topNav.length > 0 ? (
          <nav className="tpf-nav tpf-h" style={H(1)}>
            {topNav.map((item, idx) => (
              <A
                key={idx}
                href={item.href}
                onClick={item.onClick}
                className={item.variant === 'button' ? 'tpf-btn-cta' : 'tpf-nav-link'}
                label={item.label}
              >
                {item.label}
              </A>
            ))}
          </nav>
        ) : (
          <div className="tpf-row tpf-h" style={H(1)}>
            {socials?.map((l, i) => (
              <A key={i} href={l.href} className="tpf-ib" label={l.label}>
                <Icon name={l.icon} />
              </A>
            ))}
          </div>
        )}
      </div>

      {newsletter && (
        <form
          className="tpf-z tpf-news tpf-h"
          style={H(3)}
          onSubmit={(e) => {
            e.preventDefault();
            const v = address.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return flash?.();
            setSent(true);
            onSubscribe?.(v);
          }}
        >
          <label htmlFor={uid + 'e'}>{newsletter.label}</label>
          <div className="tpf-pill" data-sent={sent}>
            <input
              id={uid + 'e'}
              type="email"
              placeholder={newsletter.placeholder ?? 'your@email'}
              value={address}
              disabled={sent}
              onChange={(e) => setAddress(e.target.value)}
            />
            <span className="tpf-sent">{sent ? <>you're on the list</> : null}</span>
            <button type="submit" className="tpf-knob" aria-label="Subscribe" disabled={sent}>
              <Icon name={sent ? 'check' : 'arrow'} />
            </button>
          </div>
        </form>
      )}

      {mark && (
        <span className="tpf-z tpf-flank tpf-h" style={{ ...H(4), left: '24%' }}>
          {mark}
        </span>
      )}
      {timeZone && (
        <span className="tpf-z tpf-flank tpf-h" style={{ ...H(4), left: '76%' }}>
          <Clock zone={timeZone} label={timeLabel ?? 'IST'} />
        </span>
      )}

      {status && (
        <>
          <A href={status.href ?? mailto} className="tpf-z tpf-status tpf-h" style={H(5)}>
            <i className="tpf-live" aria-hidden="true" />
            <span>{status.label}</span>
          </A>
          <span className="tpf-z tpf-badge">
            <span
              className="tpf-h"
              style={{ ...H(6), display: 'block', width: '100%', height: '100%' }}
            >
              <Seal />
            </span>
          </span>
        </>
      )}
    </>
  );
}
