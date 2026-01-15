// Canvas boundary constants
export const CANVAS_MIN_X = -3000;
export const CANVAS_MAX_X = 3000;
export const CANVAS_MIN_Y = -3000;
export const CANVAS_MAX_Y = 3000;
export const CANVAS_WIDTH = CANVAS_MAX_X - CANVAS_MIN_X; // 6000
export const CANVAS_HEIGHT = CANVAS_MAX_Y - CANVAS_MIN_Y; // 6000

// Grid spacing
export const GRID_SIZE = 50;

// Helper functions to clamp coordinates
export function clampX(x: number): number {
  return Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X, x));
}

export function clampY(y: number): number {
  return Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y, y));
}

export function clampBoxPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
  // Ensure the box stays within bounds (box position is top-left corner)
  const clampedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - width, x));
  const clampedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - height, y));
  return { x: clampedX, y: clampedY };
}

