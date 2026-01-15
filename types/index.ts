// Type definitions for the visual planning canvas

export type Box = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
  properties: Record<string, string | number | Date | { from: Date; to?: Date }>;
};

export type Connection = {
  id: string;
  fromBoxId: string;
  toBoxId: string;
};

export type CanvasState = {
  boxes: Box[];
  connections: Connection[];
  panX: number;
  panY: number;
  zoom: number;
};

