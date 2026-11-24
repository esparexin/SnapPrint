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
export type TopNavLink = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'text' | 'button';
};
export type IconLink = { icon: IconName; label: string; href?: string; onClick?: () => void };
export type FooterColumn = { title: string; links: TearLink[] };

export const DEFAULT_SOCIALS: IconLink[] = [
  { icon: 'globe', label: 'Website', href: 'https://snap.palnadu.dev' },
  { icon: 'mail', label: 'Email', href: 'mailto:contact@snapprint.in' },
];

export const DEFAULT_COLUMNS: FooterColumn[] = [];

export const DEFAULT_SIDES: IconLink[] = [];

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
  brand?: string | React.ReactNode;
  name?: string;
  logo?: React.ReactNode;
  logoHref?: string;
  topNav?: TopNavLink[];
  socials?: IconLink[];
  email?: string;
  newsletter?: { label: string; placeholder?: string } | null;
  status?: { label: string; href?: string } | null;
  description?: string | React.ReactNode;
  mark?: string;
  timeZone?: string;
  timeLabel?: string;
  columns?: FooterColumn[];
  chat?: TearLink | null;
  sideLinks?: IconLink[];
  footerLinks?: TearLink[];
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
