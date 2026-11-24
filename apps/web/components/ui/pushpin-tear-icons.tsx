import React from 'react';
import { IconName } from './pushpin-tear-types';

export { Seal, SnapPrintLogo, Clock, A } from './pushpin-tear-atoms';

const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

type IconKey = IconName | 'chevL' | 'copy' | 'squiggle' | 'arrow' | 'check';

const ICONS: Record<string, { el: React.ReactNode; fill?: boolean }> = {
  chevL: { el: <path d="M14.5 5.5 8 12l6.5 6.5" /> },
  arrow: { el: <path d="M5 12h13M13 6.5 18.5 12 13 17.5" /> },
  check: { el: <path d="m5.5 12.5 4 4 9-9.5" /> },
  copy: {
    el: (
      <>
        <path d="M13.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5v-6.5" />
        <circle cx="18.5" cy="5.5" r="2.3" />
      </>
    ),
  },
  github: {
    fill: true,
    el: (
      <path
        fillRule="evenodd"
        d="M12 2.8a9.3 9.3 0 0 0-2.9 18.1c.5.1.6-.2.6-.5v-1.7c-2.6.6-3.1-1.1-3.1-1.1-.4-1.1-1-1.4-1-1.4-.9-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .8 1.4 2.2 1 2.7.8.1-.6.3-1 .6-1.2-2.1-.2-4.2-1-4.2-4.6 0-1 .4-1.8 1-2.5-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a8.8 8.8 0 0 1 4.6 0c1.8-1.2 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.5 1 2.5 0 3.6-2.2 4.4-4.2 4.6.3.3.6.8.6 1.6v2.4c0 .3.2.6.7.5A9.3 9.3 0 0 0 12 2.8z"
      />
    ),
  },
  linkedin: {
    fill: true,
    el: (
      <path
        fillRule="evenodd"
        d="M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5zm.2 6.6v7h2.2v-7zm1.1-3.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm2.6 3.4v7h2.2v-3.7c0-1 .4-1.6 1.2-1.6s1.1.6 1.1 1.6v3.7h2.2v-4.3c0-2-1-2.9-2.5-2.9-.9 0-1.6.4-2 1v-.8z"
      />
    ),
  },
  doc: {
    el: (
      <>
        <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
        <path d="M14 3.5V8h4.5M8.8 12.5h6.4M8.8 16h4.2" />
      </>
    ),
  },
  chat: {
    fill: true,
    el: (
      <path
        fillRule="evenodd"
        d="M12 3C7 3 3.2 6.6 3.2 11.2c0 2.5 1.1 4.6 2.9 6.1v3.4l3.2-1.8c.8.2 1.8.4 2.7.4 5 0 8.8-3.6 8.8-8.1S17 3 12 3zm-4 9.4a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"
      />
    ),
  },
  x: { el: <path d="M5 4.5h3.6l10.4 15H15.4zM18.6 4.5 13.4 10.4M5.4 19.5l5.4-6.2" /> },
  ig: {
    el: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.8" />
        <circle cx="17.1" cy="6.9" r=".6" fill="currentColor" />
      </>
    ),
  },
  globe: {
    el: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z" />
      </>
    ),
  },
  mail: {
    el: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </>
    ),
  },
  link: {
    el: (
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    ),
  },
  shield: {
    fill: true,
    el: (
      <path
        fillRule="evenodd"
        d="M6.5 2.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4v-11a4 4 0 0 1 4-4zM12 6.2 7.6 7.8v3.6c0 2.9 1.9 5.2 4.4 6.2 2.5-1 4.4-3.3 4.4-6.2V7.8zm-2 5.8 1.4 1.4 2.8-2.9"
      />
    ),
  },
};

export function Icon({ name }: { name: IconKey }) {
  const item = ICONS[name];
  if (!item) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      className="tpf-ico"
      aria-hidden="true"
      {...(item.fill ? { fill: 'currentColor' } : P)}
    >
      {item.el}
    </svg>
  );
}
