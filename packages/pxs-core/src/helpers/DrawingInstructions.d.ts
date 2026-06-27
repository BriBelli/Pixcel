interface GradientStop {
  at: number;
  color: string;
}

interface DrawingLayer {
  op: 'fill' | 'rect' | 'rrect' | 'circle' | 'ellipse' | 'line' | 'arc'
    | 'gradient' | 'polygon' | 'cells' | 'floodfill' | 'mirror'
    | 'bezier' | 'pattern'
    | string;
  color?: string;
  from?: string;
  to?: string;
  stops?: GradientStop[];
  opacity?: number;
  blend?: 'normal' | 'multiply' | 'screen' | 'overlay';
  filled?: boolean;
  width?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  startAngle?: number;
  endAngle?: number;
  type?: 'horizontal' | 'vertical' | 'diagonal' | 'radial'
    | 'checker' | 'stripes' | 'dots' | 'crosshatch' | 'noise';
  region?: [number, number, number, number];
  points?: [number, number][];
  colors?: string[];
  scale?: number;
  data?: Array<{ x: number; y: number; color: string; opacity?: number }>;
  axis?: 'x' | 'y';
  [key: string]: unknown;
}

interface DrawingInstructionData {
  cols: number;
  rows: number;
  layers: DrawingLayer[];
  metadata?: Record<string, unknown>;
}

export declare class DrawingInstructions {
  static rasterize(instructions: DrawingInstructionData): {
    cols: number;
    rows: number;
    cells: Array<{ x: number; y: number; color: string; opacity?: number }>;
    metadata?: Record<string, unknown>;
  };

  static isInstructionFormat(data: unknown): boolean;
}
