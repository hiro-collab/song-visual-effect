import type { SongAppContentRect, SongVisualHost, SongVisualLayer, SongVisualLayerOptions } from "../song-app/songApp";

type VisualHostOptions = {
  root?: HTMLElement;
  overlaySelectors?: string[];
  padding?: number;
  maxDpr?: number;
};

const defaultRect = (dpr: number): SongAppContentRect => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  return {
    x: 0,
    y: 0,
    width: viewportWidth,
    height: viewportHeight,
    left: 0,
    top: 0,
    right: viewportWidth,
    bottom: viewportHeight,
    viewportWidth,
    viewportHeight,
    dpr
  };
};

const visibleRect = (element: Element) => {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return null;
  return rect;
};

const clampRect = (rect: SongAppContentRect): SongAppContentRect => {
  const left = Math.min(Math.max(0, rect.left), rect.viewportWidth);
  const right = Math.max(left, Math.min(rect.viewportWidth, rect.right));
  const top = Math.min(Math.max(0, rect.top), rect.viewportHeight);
  const bottom = Math.max(top, Math.min(rect.viewportHeight, rect.bottom));
  return {
    ...rect,
    x: left,
    y: top,
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
};

export const createVisualHost = (baseCanvas: HTMLCanvasElement, options: VisualHostOptions = {}): SongVisualHost => {
  const root = options.root ?? baseCanvas.parentElement ?? document.body;
  const padding = options.padding ?? 12;
  const maxDpr = options.maxDpr ?? 2;
  const overlaySelectors = options.overlaySelectors ?? [];
  const layers = new Set<SongVisualLayer>();

  const currentDpr = () => Math.min(Math.max(1, window.devicePixelRatio || 1), maxDpr);

  const safeArea = () => {
    let rect = defaultRect(currentDpr());
    const midX = rect.viewportWidth / 2;
    const midY = rect.viewportHeight / 2;

    for (const selector of overlaySelectors) {
      for (const element of document.querySelectorAll(selector)) {
        const overlay = visibleRect(element);
        if (!overlay) continue;

        const wide = overlay.width >= rect.viewportWidth * 0.36;
        const tall = overlay.height >= rect.viewportHeight * 0.24;
        const nearTop = overlay.top <= Math.max(120, rect.viewportHeight * 0.18);
        const nearBottom = rect.viewportHeight - overlay.bottom <= Math.max(120, rect.viewportHeight * 0.18);
        const nearLeft = overlay.left <= Math.max(120, rect.viewportWidth * 0.18);
        const nearRight = rect.viewportWidth - overlay.right <= Math.max(120, rect.viewportWidth * 0.18);

        if (wide && nearTop) rect = { ...rect, top: Math.max(rect.top, overlay.bottom + padding) };
        if (wide && nearBottom) rect = { ...rect, bottom: Math.min(rect.bottom, overlay.top - padding) };
        if (tall && nearLeft && overlay.right < midX) rect = { ...rect, left: Math.max(rect.left, overlay.right + padding) };
        if (tall && nearRight && overlay.left > midX) rect = { ...rect, right: Math.min(rect.right, overlay.left - padding) };
      }
    }

    return clampRect(rect);
  };

  const resizeLayerElement = (element: HTMLElement, layerCanvas?: HTMLCanvasElement) => {
    const rect = defaultRect(currentDpr());
    element.style.position = "fixed";
    element.style.inset = "0";
    element.style.width = "100vw";
    element.style.height = "100vh";
    if (layerCanvas) {
      layerCanvas.width = Math.max(1, Math.round(rect.viewportWidth * rect.dpr));
      layerCanvas.height = Math.max(1, Math.round(rect.viewportHeight * rect.dpr));
    }
    return safeArea();
  };

  const resizeLayers = () => {
    for (const layer of layers) layer.resize();
  };

  const createLayer = (layerOptions: SongVisualLayerOptions = {}) => {
    const kind = layerOptions.kind ?? "canvas";
    const element =
      kind === "canvas"
        ? document.createElement("canvas")
        : document.createElement("div");
    const canvas = element instanceof HTMLCanvasElement ? element : undefined;
    const ctx =
      canvas && (layerOptions.canvasContext ?? "2d") === "2d"
        ? canvas.getContext("2d", { alpha: layerOptions.alpha ?? true })
        : undefined;
    const previousBaseDisplay = baseCanvas.style.display;

    if (layerOptions.id) element.id = layerOptions.id;
    if (layerOptions.className) element.className = layerOptions.className;
    element.style.pointerEvents = layerOptions.pointerEvents ?? "none";
    element.style.zIndex = String(layerOptions.zIndex ?? 1);
    if (layerOptions.hideBaseCanvas) baseCanvas.style.display = "none";
    root.append(element);

    const layer: SongVisualLayer = {
      element,
      canvas,
      ctx,
      safeArea,
      resize: () => resizeLayerElement(element, canvas),
      dispose: () => {
        layers.delete(layer);
        element.remove();
        if (layerOptions.hideBaseCanvas) baseCanvas.style.display = previousBaseDisplay;
      }
    };

    layers.add(layer);
    layer.resize();
    return layer;
  };

  return {
    safeArea,
    resizeLayers,
    createLayer
  };
};
