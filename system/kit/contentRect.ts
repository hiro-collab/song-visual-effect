import type { SongAppContentRect, SongAppFrame, SongAppServices } from "./songApp";
import { clamp } from "./damping";

export type CanvasSceneOptions = {
  maxDpr?: number;
  clip?: boolean;
};

export type CanvasScenePointer = {
  x: number;
  y: number;
  u: number;
  v: number;
  inside: boolean;
};

export type CanvasScene = {
  canvas: HTMLCanvasElement;
  viewport: SongAppContentRect;
  contentRect: SongAppContentRect;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  pointerFromEvent: (event: PointerEvent | MouseEvent) => CanvasScenePointer;
};

export type TextFitOptions = {
  fontFamily?: string;
  fontWeight?: string | number;
  minSize?: number;
  maxSize?: number;
  lineHeight?: number;
  maxLines?: number;
};

export type TextFitResult = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
};

const makeRect = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  viewportWidth: number,
  viewportHeight: number,
  dpr: number
): SongAppContentRect => {
  const safeLeft = clamp(left, 0, viewportWidth);
  const safeRight = clamp(right, safeLeft, viewportWidth);
  const safeTop = clamp(top, 0, viewportHeight);
  const safeBottom = clamp(bottom, safeTop, viewportHeight);
  return {
    x: safeLeft,
    y: safeTop,
    left: safeLeft,
    top: safeTop,
    right: safeRight,
    bottom: safeBottom,
    width: Math.max(0, safeRight - safeLeft),
    height: Math.max(0, safeBottom - safeTop),
    viewportWidth,
    viewportHeight,
    dpr
  };
};

const currentDpr = (maxDpr = 2) => Math.min(Math.max(1, window.devicePixelRatio || 1), maxDpr);

export const resizeCanvasToDisplaySize = (canvas: HTMLCanvasElement, maxDpr = 2) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = currentDpr(maxDpr);
  const pixelWidth = Math.max(1, Math.round(rect.width * dpr));
  const pixelHeight = Math.max(1, Math.round(rect.height * dpr));
  const changed = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
  if (changed) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  return { changed, dpr, cssWidth: rect.width, cssHeight: rect.height, pixelWidth, pixelHeight };
};

export const createCanvasScene = (
  frame: SongAppFrame,
  services: SongAppServices,
  options: CanvasSceneOptions = {}
): CanvasScene => {
  const { canvas } = services;
  const size = resizeCanvasToDisplaySize(canvas, options.maxDpr);
  const canvasRect = canvas.getBoundingClientRect();
  const safeArea = frame.contentRect ?? frame.safeArea ?? services.safeArea?.();
  const dpr = safeArea?.dpr ?? size.dpr;
  const viewport = makeRect(0, 0, canvasRect.width, canvasRect.height, canvasRect.width, canvasRect.height, dpr);
  const contentRect = safeArea
    ? makeRect(
        safeArea.left - canvasRect.left,
        safeArea.top - canvasRect.top,
        safeArea.right - canvasRect.left,
        safeArea.bottom - canvasRect.top,
        canvasRect.width,
        canvasRect.height,
        dpr
      )
    : viewport;

  const pointerFromEvent = (event: PointerEvent | MouseEvent): CanvasScenePointer => {
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;
    const localX = x - contentRect.left;
    const localY = y - contentRect.top;
    const u = contentRect.width > 0 ? clamp(localX / contentRect.width) : 0;
    const v = contentRect.height > 0 ? clamp(localY / contentRect.height) : 0;
    return {
      x: localX,
      y: localY,
      u,
      v,
      inside: x >= contentRect.left && x <= contentRect.right && y >= contentRect.top && y <= contentRect.bottom
    };
  };

  return {
    canvas,
    viewport,
    contentRect,
    dpr,
    cssWidth: canvasRect.width,
    cssHeight: canvasRect.height,
    pixelWidth: size.pixelWidth,
    pixelHeight: size.pixelHeight,
    pointerFromEvent
  };
};

export const withContentRect = (
  ctx: CanvasRenderingContext2D,
  frame: SongAppFrame,
  services: SongAppServices,
  draw: (scene: CanvasScene) => void,
  options: CanvasSceneOptions = {}
) => {
  const scene = createCanvasScene(frame, services, options);
  ctx.save();
  ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
  if (options.clip ?? true) {
    ctx.beginPath();
    ctx.rect(scene.contentRect.left, scene.contentRect.top, scene.contentRect.width, scene.contentRect.height);
    ctx.clip();
  }
  draw(scene);
  ctx.restore();
  return scene;
};

const applyFont = (ctx: CanvasRenderingContext2D, size: number, options: TextFitOptions) => {
  const weight = options.fontWeight ?? 700;
  const family = options.fontFamily ?? "system-ui, sans-serif";
  ctx.font = `${weight} ${size}px ${family}`;
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words.length ? words : [text]) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
};

export const fitTextToRect = (
  ctx: CanvasRenderingContext2D,
  text: string,
  rect: Pick<SongAppContentRect, "width" | "height">,
  options: TextFitOptions = {}
): TextFitResult => {
  const minSize = options.minSize ?? 12;
  const maxSize = options.maxSize ?? 64;
  const lineHeightRatio = options.lineHeight ?? 1.18;
  const maxLines = options.maxLines ?? 3;
  let best: TextFitResult = { fontSize: minSize, lineHeight: minSize * lineHeightRatio, lines: [text] };

  for (let size = maxSize; size >= minSize; size -= 1) {
    applyFont(ctx, size, options);
    const lines = wrapText(ctx, text, rect.width, maxLines);
    const lineHeight = size * lineHeightRatio;
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    if (widest <= rect.width && lines.length * lineHeight <= rect.height) {
      best = { fontSize: size, lineHeight, lines };
      break;
    }
  }

  applyFont(ctx, best.fontSize, options);
  return best;
};
