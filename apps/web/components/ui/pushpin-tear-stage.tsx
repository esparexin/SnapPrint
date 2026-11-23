import React from 'react';
import { FLAPS } from './pushpin-tear-math';

interface PushpinTearStageProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  uid: string;
  flapBase: string;
  gradRefs: React.MutableRefObject<(SVGLinearGradientElement | null)[]>;
  sheetRef: React.RefObject<SVGPathElement | null>;
  rimRef: React.RefObject<SVGPathElement | null>;
  flapRefs: React.MutableRefObject<(SVGPathElement | null)[]>;
}

export function PushpinTearStage({
  svgRef,
  uid,
  flapBase,
  gradRefs,
  sheetRef,
  rimRef,
  flapRefs,
}: PushpinTearStageProps) {
  return (
    <svg ref={svgRef} className="tpf-stage" aria-hidden="true">
      <defs>
        {Array.from({ length: FLAPS * 2 }, (_, k) => (
          <linearGradient
            key={k}
            id={uid + 'fg' + k}
            ref={(el) => {
              gradRefs.current[k] = el;
            }}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor={flapBase} />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
        ))}
        <path id={uid + 's'} ref={sheetRef} />
      </defs>
      <rect className="tpf-paper" width="100%" height="100%" />
      <g className="tpf-sheet-g">
        <path ref={rimRef} className="tpf-rim" />
        <use href={'#' + uid + 's'} className="tpf-sheet" />
      </g>
      <use href={'#' + uid + 's'} />
      <g>
        {Array.from({ length: FLAPS * 2 }, (_, k) => (
          <path
            key={k}
            ref={(el) => {
              flapRefs.current[k] = el;
            }}
            fill={'url(#' + uid + 'fg' + k + ')'}
          />
        ))}
      </g>
    </svg>
  );
}
