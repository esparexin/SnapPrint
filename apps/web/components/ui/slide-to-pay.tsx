'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { resetTrackHandle, SlideToPayProps, slideToPayStyles as s } from './slide-to-pay-styles';

export type { SlideToPayProps };

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
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(360);

  useEffect(() => {
    const update = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.clientWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const maxDist = enableOnline
    ? Math.max(40, (trackWidth - 48) / 2)
    : Math.max(40, trackWidth - 64);
  const resetPos = useCallback(() => {
    resetTrackHandle(handleRef.current, leftRef.current, rightRef.current);
  }, []);

  useEffect(() => {
    if (!selectedMethod && !loading) resetPos();
  }, [selectedMethod, loading, resetPos]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || loading || selectedMethod) return;
    dragRef.current = true;
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (handleRef.current) handleRef.current.style.transition = 'none';
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current || !handleRef.current) return;
    const rawDx = e.clientX - startXRef.current;
    const dx = enableOnline
      ? Math.max(-maxDist, Math.min(maxDist, rawDx))
      : Math.max(0, Math.min(maxDist, rawDx));
    handleRef.current.style.transform = `translate3d(${dx}px, 0, 0)`;
    if (enableOnline && leftRef.current && rightRef.current) {
      const ratio = Math.min(1, Math.abs(dx) / (maxDist * 0.75));
      rightRef.current.style.opacity = dx < 0 ? `${1 - ratio}` : '1';
      leftRef.current.style.opacity = dx > 0 ? `${1 - ratio}` : '1';
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const rawDx = e.clientX - startXRef.current;
    const thresh = maxDist * 0.75;
    if (enableOnline && rawDx <= -thresh) {
      if (handleRef.current) handleRef.current.style.transform = `translate3d(-${maxDist}px, 0, 0)`;
      onSelectCash();
    } else if (rawDx >= thresh) {
      if (handleRef.current) handleRef.current.style.transform = `translate3d(${maxDist}px, 0, 0)`;
      if (enableOnline) onSelectOnline?.();
      else onSelectCash();
    } else {
      resetPos();
    }
  };

  if (selectedMethod === 'cash') {
    return (
      <div ref={trackRef} style={s.track}>
        <div style={s.confirmedTrack}>
          <span>✓ Cash Payment Selected · {amountFormatted}</span>
          {onReset && (
            <button type="button" onClick={onReset} style={s.resetBtn}>
              Change ↺
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={trackRef} style={s.track} role="region" aria-label="Payment Method Selector">
      {enableOnline ? (
        <>
          <div style={s.leftFill} />
          <div style={s.rightFill} />
          <div ref={leftRef} style={s.leftLane}>
            <div style={s.laneTitleGreen}>◄ 💵 CASH</div>
            <div style={s.amountTextGreen}>{amountFormatted}</div>
          </div>
          <div ref={rightRef} style={s.rightLane}>
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={resetPos}
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
