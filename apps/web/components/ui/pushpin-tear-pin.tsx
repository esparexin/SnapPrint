import React from 'react';
import { mixHex } from './pushpin-tear-color';

export function PinButton({
  pinRef,
  pin,
  repin,
  pinBase,
  uid,
}: {
  pinRef: React.RefObject<HTMLButtonElement | null>;
  pin: string;
  repin: () => void;
  pinBase: string;
  uid: string;
}) {
  return (
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
  );
}

export function Pin({ base, id }: { base: string; id: string }) {
  const hi = mixHex(base, '#ffffff', 0.62);
  const mid = base;
  const lo = mixHex(base, '#000000', 0.42);
  const deep = mixHex(base, '#000000', 0.66);
  const t = { transition: 'stop-color .7s ease' };
  const side = (gid: string) => (
    <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" style={{ ...t, stopColor: lo }} />
      <stop offset=".24" style={{ ...t, stopColor: mid }} />
      <stop offset=".4" style={{ ...t, stopColor: hi }} />
      <stop offset=".58" style={{ ...t, stopColor: mid }} />
      <stop offset="1" style={{ ...t, stopColor: deep }} />
    </linearGradient>
  );
  return (
    <svg viewBox="0 0 100 200" className="tpf-pin-svg" aria-hidden="true">
      <defs>
        {side(id + 's')}
        <radialGradient id={id + 't'} cx=".38" cy=".3" r=".8">
          <stop offset="0" style={{ ...t, stopColor: hi }} />
          <stop offset=".55" style={{ ...t, stopColor: mid }} />
          <stop offset="1" style={{ ...t, stopColor: lo }} />
        </radialGradient>
        <linearGradient id={id + 'n'} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5b616b" />
          <stop offset=".4" stopColor="#f4f5f7" />
          <stop offset=".7" stopColor="#a3a9b2" />
          <stop offset="1" stopColor="#4a4f57" />
        </linearGradient>
        <filter id={id + 'b'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <path d="M48.3 112h3.4l-.7 76-1 4-1-4z" fill={'url(#' + id + 'n)'} />
      <ellipse cx="50" cy="191.5" rx="3.2" ry="1.1" fill="#0b1a33" opacity=".35" />
      <path d="M28 103v6.5a22 7 0 0 0 44 0V103z" fill={'url(#' + id + 's)'} />
      <ellipse cx="50" cy="103" rx="22" ry="7" fill={'url(#' + id + 't)'} />
      <path
        d="M41.5 38c1.6 16 4.6 26 3 36-1.8 10-13 19-14.6 29h40.2c-1.6-10-12.8-19-14.6-29-1.6-10 1.4-20 3-36z"
        fill={'url(#' + id + 's)'}
      />
      <path d="M16 22v14a34 13 0 0 0 68 0V22z" fill={'url(#' + id + 's)'} />
      <ellipse cx="50" cy="22" rx="34" ry="13" fill={'url(#' + id + 't)'} />
      <ellipse
        cx="50"
        cy="22"
        rx="33"
        ry="12.3"
        fill="none"
        stroke="#fff"
        strokeOpacity=".28"
        strokeWidth=".8"
      />
      <ellipse
        cx="37"
        cy="17.5"
        rx="12"
        ry="4"
        fill="#fff"
        opacity=".7"
        filter={'url(#' + id + 'b)'}
      />
      <path
        d="M22 38c4 4.5 9.5 6.4 15 7"
        stroke="#fff"
        strokeOpacity=".35"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        filter={'url(#' + id + 'b)'}
      />
      <path
        d="M45 50c.8 8 1.6 14 .8 22"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
