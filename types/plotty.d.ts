declare module 'plotty' {
  export interface PlottyOptions {
    canvas: HTMLCanvasElement;
    data: Float32Array | Uint16Array | Int16Array | number[];
    width: number;
    height: number;
    domain?: [number, number];
    colorScale?: string;
    clampLow?: boolean;
    clampHigh?: boolean;
    displayMin?: number;
    displayMax?: number;
  }

  export class plot {
    constructor(options: PlottyOptions);
    setColorScale(name: string, colors: number[][]): void;
    setDomain(min: number, max: number): void;
    render(): void;
    setData(data: Float32Array | Uint16Array | Int16Array | number[]): void;
  }

  export function addColorScale(
    name: string,
    colors: string[] | number[][],
    positions?: number[]
  ): void;

  const plottyDefault: {
    plot: typeof plot;
    addColorScale: typeof addColorScale;
  };

  export default plottyDefault;
}
