'use client';

import React from 'react';
import { CANVAS_MIN_X, CANVAS_MAX_X, CANVAS_MIN_Y, CANVAS_MAX_Y, GRID_SIZE } from '@/lib/canvas-constants';

interface GridLayerProps {
  canvasZoom?: number;
  gridColor?: string;
}

function GridLayerComponent({ canvasZoom = 1, gridColor }: GridLayerProps) {
  // Calculate visible grid lines
  const gridStep = GRID_SIZE;
  
  // Generate grid lines within the canvas bounds
  const verticalLines: number[] = [];
  const horizontalLines: number[] = [];
  
  // Start from the nearest grid line to the minimum bound
  const startX = Math.floor(CANVAS_MIN_X / gridStep) * gridStep;
  const startY = Math.floor(CANVAS_MIN_Y / gridStep) * gridStep;
  
  for (let x = startX; x <= CANVAS_MAX_X; x += gridStep) {
    verticalLines.push(x);
  }
  
  for (let y = startY; y <= CANVAS_MAX_Y; y += gridStep) {
    horizontalLines.push(y);
  }

  const canvasWidth = CANVAS_MAX_X - CANVAS_MIN_X;
  const canvasHeight = CANVAS_MAX_Y - CANVAS_MIN_Y;

  return (
    <svg
      style={{
        position: 'absolute',
        left: CANVAS_MIN_X,
        top: CANVAS_MIN_Y,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
      viewBox={`${CANVAS_MIN_X} ${CANVAS_MIN_Y} ${canvasWidth} ${canvasHeight}`}
    >
      <defs>
        <pattern
          id="grid"
          width={gridStep}
          height={gridStep}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`}
            fill="none"
            stroke={gridColor || 'currentColor'}
            strokeWidth="1"
            className={gridColor ? undefined : 'text-muted'}
            opacity={gridColor ? undefined : 0.3}
          />
        </pattern>
        {/* Clip path to restrict grid to canvas boundaries */}
        <clipPath id="canvasClip">
          <rect
            x={CANVAS_MIN_X}
            y={CANVAS_MIN_Y}
            width={canvasWidth}
            height={canvasHeight}
          />
        </clipPath>
      </defs>
      <g clipPath="url(#canvasClip)">
        {/* Grid background using pattern - clipped to canvas bounds */}
        <rect
          x={CANVAS_MIN_X}
          y={CANVAS_MIN_Y}
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#grid)"
        />
      </g>
      {/* Canvas boundary indicator - outside clip path so it's always visible */}
      <g>
        <rect
          x={CANVAS_MIN_X}
          y={CANVAS_MIN_Y}
          width={canvasWidth}
          height={canvasHeight}
          fill="none"
          stroke="currentColor"
          strokeWidth={Math.max(1, 2 / canvasZoom)}
          strokeDasharray={canvasZoom < 0.5 ? "8 4" : "none"}
          className="text-border"
          opacity="0.4"
          style={{
            filter: canvasZoom < 0.5 ? 'drop-shadow(0 0 3px rgba(237, 237, 237, 0.1))' : 'none',
          }}
        />
      </g>
    </svg>
  );
}

export const GridLayer = React.memo(GridLayerComponent);