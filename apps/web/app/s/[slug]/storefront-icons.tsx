import React from 'react';

interface IconProps {
  size?: number;
}

function Svg({
  size = 14,
  viewBox = '0 0 24 24',
  strokeWidth = '2',
  children,
}: {
  size?: number;
  viewBox?: string;
  strokeWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const UploadCloudIcon = ({ size = 18 }: IconProps) => (
  <Svg size={size}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Svg>
);

export const EyeIcon = ({ size = 13 }: IconProps) => (
  <Svg size={size}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const TrashIcon = ({ size = 13 }: IconProps) => (
  <Svg size={size}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Svg>
);

export const PortraitIcon = ({ size = 13 }: IconProps) => (
  <Svg size={size} viewBox="0 0 16 16" strokeWidth="1.5">
    <rect x="4" y="2" width="8" height="12" rx="1.5" />
  </Svg>
);

export const LandscapeIcon = ({ size = 13 }: IconProps) => (
  <Svg size={size} viewBox="0 0 16 16" strokeWidth="1.5">
    <rect x="2" y="4" width="12" height="8" rx="1.5" />
  </Svg>
);

export const AutoOrientIcon = ({ size = 13 }: IconProps) => (
  <Svg size={size}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </Svg>
);

export const PrinterIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </Svg>
);

export const AlertIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);
