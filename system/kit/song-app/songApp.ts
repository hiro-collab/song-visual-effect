import type { SongAdapterContext } from "./songAdapterContext";
import type { SongAppThreeServices } from "../render/threeServices";

export type SongAppContentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
};

export type SongVisualLayer = {
  element: HTMLElement;
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D | null;
  safeArea: () => SongAppContentRect;
  resize: () => SongAppContentRect;
  dispose: () => void;
};

export type SongVisualLayerOptions = {
  id?: string;
  className?: string;
  kind?: "canvas" | "div";
  canvasContext?: "2d" | "none";
  zIndex?: number;
  pointerEvents?: "none" | "auto";
  hideBaseCanvas?: boolean;
  alpha?: boolean;
};

export type SongVisualHost = {
  safeArea: () => SongAppContentRect;
  resizeLayers: () => void;
  createLayer: (options?: SongVisualLayerOptions) => SongVisualLayer;
};

export type SongAppServices = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  three?: SongAppThreeServices;
  loadThree?: () => Promise<SongAppThreeServices>;
  safeArea?: () => SongAppContentRect;
  visualHost?: SongVisualHost;
};

export type SongAppFrame = {
  time: number;
  dt: number;
  userGlow: number;
  safeArea?: SongAppContentRect;
  contentRect?: SongAppContentRect;
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
