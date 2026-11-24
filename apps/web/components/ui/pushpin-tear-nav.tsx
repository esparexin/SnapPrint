import React from 'react';
import { A, Icon } from './pushpin-tear-icons';
import { FooterColumn, IconLink, TopNavLink } from './pushpin-tear-types';

export function PushpinTearColumns({
  cols,
  H,
}: {
  cols: FooterColumn[];
  H: (i: number) => React.CSSProperties;
}) {
  if (!cols.length) return null;
  return (
    <>
      {cols.map((c, i) => (
        <nav key={i} className={'tpf-z tpf-col tpf-h ' + (i ? 'r' : 'l')} style={H(6 + i)}>
          <h3>{c.title}</h3>
          <ul>
            {c.links.map((l, j) => (
              <li key={j}>
                <A href={l.href} onClick={l.onClick}>
                  {l.label}
                </A>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </>
  );
}

export function PushpinTearBottom({
  name,
  brand,
  logoHref,
  chat,
  mailto,
  sideLinks,
  copyright,
  footerLinks,
  H,
}: {
  name: string;
  brand: React.ReactNode;
  logoHref: string;
  chat: { label: string; href?: string } | null;
  mailto: string;
  sideLinks: IconLink[];
  copyright: string;
  footerLinks?: TopNavLink[];
  H: (i: number) => React.CSSProperties;
}) {
  return (
    <>
      <div className="tpf-z tpf-brand tpf-ink">
        <div className="tpf-brand-top tpf-p" style={H(0)}>
          <span className="tpf-eye">{name}</span>
          {chat && (
            <A href={chat.href ?? mailto} className="tpf-bub" label={chat.label}>
              <b>{chat.label}</b>
            </A>
          )}
        </div>
        <A href={logoHref} className="tpf-word" label={typeof brand === 'string' ? brand : name}>
          <span>{brand}</span>
        </A>
      </div>
      {sideLinks.slice(0, 2).map((l, i) => (
        <A
          key={i}
          href={l.href}
          onClick={l.onClick}
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
        {footerLinks && footerLinks.length > 0 && (
          <div className="tpf-foot-links tpf-p" style={H(4)}>
            {footerLinks.map((l, i) => (
              <A key={i} href={l.href} onClick={l.onClick} label={l.label}>
                {l.label}
              </A>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
