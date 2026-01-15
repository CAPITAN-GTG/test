'use client';

import React, { useMemo } from 'react';
import type { Box, Connection } from '@/types';
import { CANVAS_MIN_X, CANVAS_MIN_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-constants';

interface ConnectionLayerProps {
  boxes: Box[];
  connections: Connection[];
  canvasZoom: number;
  onConnectionClick?: (connectionId: string) => void;
  connectionSourceId?: string | null;
  connectionTargetPos?: { x: number; y: number } | null;
}

function ConnectionLayerComponent({
  boxes,
  connections,
  canvasZoom,
  onConnectionClick,
  connectionSourceId,
  connectionTargetPos,
}: ConnectionLayerProps) {
  // Keep arrow marker size constant (scales naturally with CSS transform like boxes)
  const markerSize = 10;
  const markerRefX = markerSize * 0.9;
  const markerRefY = markerSize * 0.3;
  // Scale stroke width inversely with zoom (so it appears consistent)
  const strokeWidth = Math.max(1, 2 / canvasZoom);
  const guideStrokeWidth = Math.max(2, 4 / canvasZoom);
  const getBoxCenter = (box: Box) => {
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  };

  const getConnectionPath = (fromBox: Box, toBox: Box): string => {
    const from = getBoxCenter(fromBox);
    const to = getBoxCenter(toBox);

    // Calculate direction vector
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return '';

    // Normalize direction
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate connection points on box edges
    const fromEdgeX = from.x + nx * (fromBox.width / 2);
    const fromEdgeY = from.y + ny * (fromBox.height / 2);
    const toEdgeX = to.x - nx * (toBox.width / 2);
    const toEdgeY = to.y - ny * (toBox.height / 2);

    // Create a simple bezier curve for smoother connections
    const controlPoint1X = fromEdgeX + nx * 50;
    const controlPoint1Y = fromEdgeY + ny * 50;
    const controlPoint2X = toEdgeX - nx * 50;
    const controlPoint2Y = toEdgeY - ny * 50;

    return `M ${fromEdgeX} ${fromEdgeY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${toEdgeX} ${toEdgeY}`;
  };

  const getArrowMarker = (fromBox: Box, toBox: Box): { x: number; y: number; angle: number } => {
    const from = getBoxCenter(fromBox);
    const to = getBoxCenter(toBox);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle);
    const ny = Math.sin(angle);

    const toEdgeX = to.x - nx * (toBox.width / 2);
    const toEdgeY = to.y - ny * (toBox.height / 2);

    return { x: toEdgeX, y: toEdgeY, angle: (angle * 180) / Math.PI };
  };

  const boxMap = useMemo(() => new Map(boxes.map((box) => [box.id, box])), [boxes]);

  return (
    <svg
      style={{
        position: 'absolute',
        left: CANVAS_MIN_X,
        top: CANVAS_MIN_Y,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
      viewBox={`${CANVAS_MIN_X} ${CANVAS_MIN_Y} ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    >
      <defs>
            <marker
              id="arrowhead"
          markerWidth={markerSize}
          markerHeight={markerSize}
          refX={markerRefX}
          refY={markerRefY}
              orient="auto"
            >
          <polygon
            points={`0 0, ${markerSize} ${markerSize * 0.3}, 0 ${markerSize * 0.6}`}
            fill="#A5A08A"
            className="arrowhead-fill"
          />
            </marker>
      </defs>
      <g>
        {/* Connection guide line (when in connection mode) */}
        {connectionSourceId && connectionTargetPos && (() => {
          const sourceBox = boxes.find((b) => b.id === connectionSourceId);
          if (!sourceBox) {
            return null;
          }
          const sourceCenter = getBoxCenter(sourceBox);
          const angle = Math.atan2(connectionTargetPos.y - sourceCenter.y, connectionTargetPos.x - sourceCenter.x);
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);
          const fromEdgeX = sourceCenter.x + nx * (sourceBox.width / 2);
          const fromEdgeY = sourceCenter.y + ny * (sourceBox.height / 2);
          return (
            <g key="guide-line">
              <line
                x1={fromEdgeX}
                y1={fromEdgeY}
                x2={connectionTargetPos.x}
                y2={connectionTargetPos.y}
                stroke="#E8A87C"
                strokeWidth={guideStrokeWidth}
                strokeDasharray={`${8 / canvasZoom} ${4 / canvasZoom}`}
                opacity="0.7"
                pointerEvents="none"
              />
              {/* Arrowhead for guide line */}
              <polygon
                points={`${connectionTargetPos.x},${connectionTargetPos.y} ${connectionTargetPos.x - 12 / canvasZoom},${connectionTargetPos.y - 8 / canvasZoom} ${connectionTargetPos.x - 12 / canvasZoom},${connectionTargetPos.y + 8 / canvasZoom}`}
                fill="#E8A87C"
                opacity="0.7"
                pointerEvents="none"
                transform={`rotate(${angle * (180 / Math.PI)}, ${connectionTargetPos.x}, ${connectionTargetPos.y})`}
              />
            </g>
          );
        })()}
        {connections.map((connection) => {
          const fromBox = boxMap.get(connection.fromBoxId);
          const toBox = boxMap.get(connection.toBoxId);

          if (!fromBox || !toBox) return null;

          const path = getConnectionPath(fromBox, toBox);
          if (!path) return null;

              return (
                <g key={connection.id} style={{ pointerEvents: 'all' }}>
                  <path
                    d={path}
                    stroke="#A5A08A"
                    strokeWidth={strokeWidth}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    className="connection-path"
                    data-connection-id={connection.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectionClick?.(connection.id);
                    }}
                    style={{ cursor: onConnectionClick ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.stroke = '#E8A87C';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.stroke = '';
                    }}
                  />
                  {/* Invisible wider path for easier clicking */}
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={Math.max(5, 10 / canvasZoom)}
                    fill="none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnectionClick?.(connection.id);
                    }}
                    style={{ cursor: onConnectionClick ? 'pointer' : 'default' }}
                    onMouseEnter={(e) => {
                      const visiblePath = e.currentTarget.parentElement?.querySelector('.connection-path') as SVGPathElement;
                      if (visiblePath) visiblePath.style.stroke = '#E8A87C';
                    }}
                    onMouseLeave={(e) => {
                      const visiblePath = e.currentTarget.parentElement?.querySelector('.connection-path') as SVGPathElement;
                      if (visiblePath) visiblePath.style.stroke = '';
                    }}
                  />
                </g>
              );
        })}
      </g>
    </svg>
  );
}

export const ConnectionLayer = React.memo(ConnectionLayerComponent);