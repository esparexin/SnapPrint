export interface SlideToPayProps {
  amountFormatted: string;
  enableOnline?: boolean;
  onSelectCash: () => void;
  onSelectOnline?: () => void;
  selectedMethod?: 'cash' | 'online' | null;
  loading?: boolean;
  disabled?: boolean;
  onReset?: () => void;
}

export function resetTrackHandle(
  handle: HTMLButtonElement | null,
  left: HTMLDivElement | null,
  right: HTMLDivElement | null
) {
  if (!handle) return;
  handle.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
  handle.style.transform = 'translate3d(0, 0, 0)';
  if (left) left.style.opacity = '1';
  if (right) right.style.opacity = '1';
}

const laneBase = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 'calc(50% - 28px)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 1,
} as const;

const fillBase = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: '50%',
  pointerEvents: 'none',
  zIndex: 0,
} as const;

const titleBase = {
  fontSize: '12px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  lineHeight: 1.2,
} as const;

export const slideToPayStyles = {
  track: {
    position: 'relative',
    height: '64px',
    width: '100%',
    maxWidth: '420px',
    borderRadius: '9999px',
    backgroundColor: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    overflow: 'hidden',
    userSelect: 'none',
    touchAction: 'pan-y',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  } as const,
  leftLane: { ...laneBase, left: '12px', alignItems: 'flex-start' } as const,
  rightLane: { ...laneBase, right: '12px', alignItems: 'flex-end' } as const,
  laneTitleGreen: { ...titleBase, color: '#065f46' } as const,
  laneTitleBlue: { ...titleBase, color: '#0369a1' } as const,
  amountTextGreen: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#047857',
    marginTop: '2px',
  } as const,
  amountTextBlue: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#0284c7',
    marginTop: '2px',
  } as const,
  leftFill: { ...fillBase, left: 0, backgroundColor: '#ecfdf5' } as const,
  rightFill: { ...fillBase, right: 0, backgroundColor: '#f0f9ff' } as const,
  handle: {
    position: 'absolute',
    top: '7px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.28)',
    cursor: 'grab',
    zIndex: 10,
    outline: 'none',
    border: 'none',
    willChange: 'transform',
    boxSizing: 'border-box',
  } as const,
  singleLabel: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#065f46',
    paddingLeft: '56px',
    paddingRight: '16px',
    pointerEvents: 'none',
    zIndex: 1,
  } as const,
  confirmedTrack: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    padding: '0 16px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    fontWeight: 700,
    fontSize: '13px',
    boxSizing: 'border-box',
  } as const,
  resetBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#047857',
    backgroundColor: '#ffffff',
    border: '1px solid #a7f3d0',
    borderRadius: '9999px',
    cursor: 'pointer',
  } as const,
};
