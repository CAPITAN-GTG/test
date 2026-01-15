import { CANVAS_MIN_X, CANVAS_MAX_X, CANVAS_MIN_Y, CANVAS_MAX_Y } from './canvas-constants';

export interface PanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculate pan bounds for canvas given viewport dimensions and zoom level.
 * With unified transform: screen position = canvasCoord * zoom + panX
 * When zoomed out (canvas fits in viewport), allows centering.
 * When zoomed in, prevents viewing outside canvas bounds.
 */
export function calculatePanBounds(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number
): PanBounds {
  // Return infinite bounds if viewport not ready
  if (viewportWidth === 0 || viewportHeight === 0) {
    return { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
  }

  const canvasWidth = CANVAS_MAX_X - CANVAS_MIN_X;
  const canvasHeight = CANVAS_MAX_Y - CANVAS_MIN_Y;
  const scaledCanvasWidth = canvasWidth * zoom;
  const scaledCanvasHeight = canvasHeight * zoom;

  // When zoomed out, canvas fits in viewport - allow centering
  // Check both dimensions independently
  const widthFits = scaledCanvasWidth <= viewportWidth;
  const heightFits = scaledCanvasHeight <= viewportHeight;

  let minPanX, maxPanX, minPanY, maxPanY;

  if (widthFits) {
    // Canvas width fits - allow centering with some movement
    const centerPanX = viewportWidth / 2;
    const offset = (viewportWidth - scaledCanvasWidth) / 2;
    minPanX = centerPanX - offset;
    maxPanX = centerPanX + offset;
    // Ensure min < max
    if (minPanX >= maxPanX) {
      minPanX = centerPanX - 1;
      maxPanX = centerPanX + 1;
    }
  } else {
    // Canvas width doesn't fit - prevent viewing outside bounds
    minPanX = viewportWidth - CANVAS_MAX_X * zoom;
    maxPanX = -CANVAS_MIN_X * zoom;
    // Ensure min < max
    if (minPanX >= maxPanX) {
      const center = (minPanX + maxPanX) / 2;
      minPanX = center - 1;
      maxPanX = center + 1;
    }
  }

  if (heightFits) {
    // Canvas height fits - allow centering with some movement
    const centerPanY = viewportHeight / 2;
    const offset = (viewportHeight - scaledCanvasHeight) / 2;
    minPanY = centerPanY - offset;
    maxPanY = centerPanY + offset;
    // Ensure min < max
    if (minPanY >= maxPanY) {
      minPanY = centerPanY - 1;
      maxPanY = centerPanY + 1;
    }
  } else {
    // Canvas height doesn't fit - prevent viewing outside bounds
    minPanY = viewportHeight - CANVAS_MAX_Y * zoom;
    maxPanY = -CANVAS_MIN_Y * zoom;
    // Ensure min < max
    if (minPanY >= maxPanY) {
      const center = (minPanY + maxPanY) / 2;
      minPanY = center - 1;
      maxPanY = center + 1;
    }
  }

  return { minX: minPanX, maxX: maxPanX, minY: minPanY, maxY: maxPanY };
}
