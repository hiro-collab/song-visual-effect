import type { SongAdapterContext } from "./songAdapterContext";
import type * as ThreeModule from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type SongAppThreeServices = {
  THREE: typeof ThreeModule;
  GLTFLoader: new () => GLTFLoader;
};

export type SongAppServices = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  three?: SongAppThreeServices;
  loadThree?: () => Promise<SongAppThreeServices>;
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
