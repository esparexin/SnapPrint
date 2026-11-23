import React from 'react';

export type Flap = {
  at: number;
  span: number;
  len: number;
  skew: number;
  dir: number;
  jag: number[];
};

export type Tear = {
  ys: number[];
  rim: number[];
  lag: number[];
  flaps: Flap[];
};

export type IconName =
  | 'github'
  | '21st'
  | 'x'
  | 'ig'
  | 'linkedin'
  | 'dribbble'
  | 'chat'
  | 'globe'
  | 'mail'
  | 'link'
  | 'shield'
  | 'doc';

export type TearLink = { label: string; href?: string; onClick?: () => void };
export type IconLink = { icon: IconName; label: string; href?: string; onClick?: () => void };
export type FooterColumn = { title: string; links: TearLink[] };

export const DEFAULT_SOCIALS: IconLink[] = [
  { icon: 'globe', label: 'Website', href: 'https://print.palnadu.dev' },
  { icon: 'mail', label: 'Email', href: 'mailto:contact@snapprint.in' },
];

export const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'services',
    links: [
      { label: 'B&W Xerox & Document Print', href: '/' },
      { label: 'Color Photo Printing', href: '/' },
      { label: 'Duplex Document Xerox', href: '/' },
    ],
  },
  {
    title: 'portal',
    links: [
      { label: 'Studio Login', href: '/' },
      { label: 'Register', href: '/' },
    ],
  },
];

export const DEFAULT_SIDES: IconLink[] = [
  { icon: 'shield', label: 'privacy policy', href: '/#privacy' },
  { icon: 'doc', label: 'terms & conditions', href: '/#terms' },
];

export interface AnimationParams {
  seed: number;
  still: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  sheetRef: React.RefObject<SVGPathElement | null>;
  rimRef: React.RefObject<SVGPathElement | null>;
  flapRefs: React.MutableRefObject<(SVGPathElement | null)[]>;
  gradRefs: React.MutableRefObject<(SVGLinearGradientElement | null)[]>;
  onRepin?: (seed: number) => void;
}

export type PushpinTearFooterProps = {
  brand?: string;
  name?: string;
  logo?: React.ReactNode;
  logoHref?: string;
  socials?: IconLink[];
  email?: string;
  newsletter?: { label: string; placeholder?: string } | null;
  status?: { label: string; href?: string } | null;
  mark?: string;
  timeZone?: string;
  timeLabel?: string;
  columns?: FooterColumn[];
  chat?: TearLink | null;
  sideLinks?: IconLink[];
  copyright?: string;
  credit?: string;
  handle?: TearLink;
  sheet?: string;
  paper?: string;
  sheetInk?: string;
  paperInk?: string;
  seed?: number;
  height?: number | string;
  fontSans?: string;
  onSubscribe?: (email: string) => void;
  onRepin?: (seed: number) => void;
  className?: string;
};
