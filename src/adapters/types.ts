import type { SongAdapterContext } from "../runtime/songAdapterContext";

export type SongAppServices = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

export type SongAppFrame = {
  time: number;
  dt: number;
  userGlow: number;
};

export type SongApp = {
  id: string;
  status?: string;
  resize: () => void;
  render: (frame: SongAppFrame) => void;
  pointerMove?: (event: PointerEvent) => void;
  pointerLeave?: () => void;
  pointerDown?: (event: PointerEvent) => void;
  pointerUp?: () => void;
  resetVisualTiming?: () => void;
  dispose?: () => void;
};

export type SongAppFactory = (
  context: SongAdapterContext,
  services: SongAppServices
) => SongApp | Promise<SongApp>;
