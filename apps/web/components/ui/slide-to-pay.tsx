'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { slideToPayStyles as s } from './slide-to-pay-styles';

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

export function SlideToPay({
  amountFormatted,
  enableOnline = true,
  onSelectCash,
  onSelectOnline,
  selectedMethod,
  loading = false,
  disabled = false,
  onReset,
}: SlideToPayProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const leftLaneRef = useRef<HTMLDivElement>(null);
  const rightLaneRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(360);

  const updateWidth = useCallback(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.clientWidth);
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [updateWidth]);

  const maxDist = enableOnline ? Math.max(40, (trackWidth - 48) / 2) : Math.max(40, trackWidth - 64);

  const resetHandlePosition = useCallback(() => {
    if (!handleRef.current) return;
    handleRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
    handleRef.current.style.transform = 'translate3d(0, 0, 0)';
    if (leftLaneRef.current) leftLaneRef.current.style.opacity = '1';
    if (rightLaneRef.current) rightLaneRef.current.style.opacity = '1';
  }, []);

  useEffect(() => {
    if (!selectedMethod && !loading) resetHandlePosition();
  }, [selectedMethod, loading, resetHandlePosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || loading || selectedMethod) return;
    draggingRef.current = true;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (handleRef.current) handleRef.current.style.transition = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current || !handleRef.current) return;
    const rawDx = e.clientX - startXRef.current;
    const dx = enableOnline ? Math.max(-maxDist, Math.min(maxDist, rawDx)) : Math.max(0, Math.min(maxDist, rawDx));
    handleRef.current.style.transform = `translate3d(${dx}px, 0, 0)`;
    if (enableOnline && leftLaneRef.current && rightLaneRef.current) {
      const ratio = Math.min(1, Math.abs(dx) / (maxDist * 0.75));
      rightLaneRef.current.style.opacity = dx < 0 ? `${1 - ratio}` : '1';
      leftLaneRef.current.style.opacity = dx > 0 ? `${1 - ratio}` : '1';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const rawDx = e.clientX - startXRef.current;
    const threshold = maxDist * 0.75;
    if (enableOnline && rawDx <= -threshold) {
      if (handleRef.current) handleRef.current.style.transform = `translate3d(-${maxDist}px, 0, 0)`;
      onSelectCash();
    } else if (rawDx >= threshold) {
      if (handleRef.current) handleRef.current.style.transform = `translate3d(${maxDist}px, 0, 0)`;
      if (enableOnline) onSelectOnline?.(); else onSelectCash();
    } else {
      resetHandlePosition();
    }
  };

  if (selectedMethod === 'cash') {
    return (
      <div ref={trackRef} style={s.track}>
        <div style={s.confirmedTrack}>
          <span>✓ Cash Payment Selected · {amountFormatted}</span>
          {onReset && <button type="button" onClick={onReset} style={s.resetBtn}>Change ↺</button>}
        </div>
      </div>
    );
  }

  return (
    <div ref={trackRef} style={s.track} role="region" aria-label="Payment Method Selector">
      {enableOnline ? (
        <>
          <div style={s.leftFill} /><div style={s.rightFill} />
          <div ref={leftLaneRef} style={s.leftLane}>
            <div style={s.laneTitleGreen}>◄ 💵 CASH</div>
            <div style={s.amountTextGreen}>{amountFormatted}</div>
          </div>
          <div ref={rightLaneRef} style={s.rightLane}>
            <div style={s.laneTitleBlue}>ONLINE 💳 ►</div>
            <div style={s.amountTextBlue}>{amountFormatted}</div>
          </div>
        </>
      ) : (
        <div style={s.singleLabel}>💵 SLIDE TO CONFIRM CASH AT COUNTER · {amountFormatted} ►►►</div>
      )}
      <button
        ref={handleRef}
        type="button"
        role="slider"
        aria-label={enableOnline ? 'Slide left for Cash, right for Online' : 'Slide right for Cash'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetHandlePosition}
        style={{
          ...s.handle,
          left: enableOnline ? 'calc(50% - 24px)' : '8px',
          cursor: disabled || loading ? 'not-allowed' : 'grab',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {loading ? '⟳' : '↔'}
      </button>
    </div>
  );
}
