import type { SongAdapterContext, SongApp, SongAppFrame, SongAppServices } from "../../system/kit";
import { activeRange, beatAt, clamp, decayPulse, emphasisAt, smoothstep } from "../../system/kit";

type MonitoringCues = {
  cameraCount?: number;
  labels?: string[];
  warningTimes?: number[];
  statusWords?: string[];
};

type Pane = {
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  col: number;
  depth: number;
  tilt: number;
};

type DrawingBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const COLORS = {
  room: "#120c10",
  panel: "#101717",
  panelHot: "#25121f",
  ink: "#d7fff1",
  dim: "rgba(215, 255, 241, 0.48)",
  mint: "#9fffd8",
  amber: "#f1f26a",
  rose: "#ff6fa3",
  sky: "#6cc8ff",
  wall: "#ffe5a8",
  wallShadow: "#ffc1a0",
  floor: "#c98154",
  wood: "#6d3d31",
  door: "#1d1217",
  brass: "#e5b764",
  teal: "#1fcfc4",
  paper: "#fff7b9"
};

const DEFAULT_LABELS = [
  "ENTRANCE",
  "STAIR",
  "HALL",
  "ROOM",
  "ROOF",
  "BACKYARD",
  "ELEVATOR",
  "LOBBY",
  "STORAGE",
  "SERVER",
  "PARKING",
  "CORNER",
  "DOOR",
  "WINDOW",
  "BLIND"
];

const DEFAULT_STATUS = ["REC", "SCAN", "LOCK", "TRACE", "WAIT"];

const rand = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453123;
  return value - Math.floor(value);
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const fitRange = (value: number, min: number, max: number) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const fillRectAlpha = (
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
};

const strokeRectAlpha = (
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  lineWidth = 1
) => {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
};

const fillRoundRectAlpha = (
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) => {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
};

const strokeRoundRectAlpha = (
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  lineWidth = 1
) => {
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
};

const formatClock = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const frames = Math.floor((time % 1) * 24);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frames
    .toString()
    .padStart(2, "0")}`;
};

const safeStringList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return strings.length ? strings : fallback;
};

const resolveDrawingBounds = (frame: SongAppFrame, width: number, height: number): DrawingBounds => {
  const safeArea = frame.contentRect ?? frame.safeArea;
  if (!safeArea || safeArea.width < 120 || safeArea.height < 120) {
    return { x: 0, y: 0, width, height };
  }
  const scaleX = width / Math.max(1, safeArea.viewportWidth);
  const scaleY = height / Math.max(1, safeArea.viewportHeight);
  return {
    x: safeArea.left * scaleX,
    y: safeArea.top * scaleY,
    width: safeArea.width * scaleX,
    height: safeArea.height * scaleY
  };
};

const createPaneLayout = (width: number, height: number, count: number): Pane[] => {
  const landscape = width >= height;
  const cols = landscape ? 5 : 3;
  const rows = Math.ceil(count / cols);
  const outer = Math.max(16, Math.min(width, height) * 0.035);
  const gap = Math.max(8, Math.min(width, height) * 0.012);
  const topBand = Math.max(58, height * 0.09);
  const bottomBand = Math.max(36, height * 0.06);
  const cellW = (width - outer * 2 - gap * (cols - 1)) / cols;
  const cellH = (height - outer - topBand - bottomBand - gap * (rows - 1)) / rows;
  const centerX = width / 2;
  const panes: Pane[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const depth = rows <= 1 ? 0 : row / (rows - 1);
    const side = cols <= 1 ? 0 : (col - (cols - 1) / 2) / ((cols - 1) / 2);
    const flatX = outer + col * (cellW + gap);
    const flatY = topBand + row * (cellH + gap);
    const scale = 0.94 + depth * 0.14;
    const projectedX = centerX + (flatX - centerX) * (1 - depth * 0.08) + side * depth * 18;
    panes.push({
      x: projectedX,
      y: flatY + depth * 22,
      w: cellW * scale,
      h: cellH * scale,
      row,
      col,
      depth,
      tilt: side * (0.08 + depth * 0.07)
    });
  }

  return panes;
};

const drawRoom = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, intrusion: number) => {
  const vanishingX = width * (0.52 + Math.sin(time * 0.13) * 0.015);
  const vanishingY = height * 0.18;
  const floorTop = height * 0.58;

  const rear = ctx.createLinearGradient(0, 0, 0, height);
  rear.addColorStop(0, "rgba(159, 255, 216, 0.055)");
  rear.addColorStop(0.56, "rgba(255, 79, 145, 0.08)");
  rear.addColorStop(1, "rgba(0, 0, 0, 0.44)");
  ctx.fillStyle = rear;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = "rgba(159, 255, 216, 0.035)";
  ctx.beginPath();
  ctx.moveTo(width * 0.04, height);
  ctx.lineTo(width * 0.23, floorTop);
  ctx.lineTo(width * 0.77, floorTop);
  ctx.lineTo(width * 0.96, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(159, 255, 216, ${0.06 + intrusion * 0.07})`;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 7; i += 1) {
    const x = mix(width * 0.08, width * 0.92, i / 7);
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(vanishingX, vanishingY);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const y = mix(floorTop, height * 0.98, t * t);
    const inset = mix(width * 0.23, width * 0.04, t);
    ctx.beginPath();
    ctx.moveTo(inset, y);
    ctx.lineTo(width - inset, y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawWallpaper = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, warmth: number) => {
  ctx.save();
  const top = ctx.createLinearGradient(0, 0, 0, height * 0.68);
  top.addColorStop(0, "#fff1bd");
  top.addColorStop(0.5, "#ffd4a8");
  top.addColorStop(1, "#f6a884");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, height * 0.66);

  ctx.strokeStyle = `rgba(115, 74, 63, ${0.06 + warmth * 0.03})`;
  ctx.lineWidth = 1;
  const stripeStep = Math.max(34, width * 0.045);
  for (let x = -stripeStep; x < width + stripeStep; x += stripeStep) {
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(time * 0.25 + x * 0.01) * 2, 0);
    ctx.lineTo(x - width * 0.025, height * 0.66);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(255, 113, 165, ${0.08 + warmth * 0.03})`;
  for (let i = 0; i < 34; i += 1) {
    const seed = i * 17;
    const x = rand(seed) * width;
    const y = rand(seed + 3) * height * 0.56;
    const r = 1.5 + rand(seed + 5) * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawFloor = (ctx: CanvasRenderingContext2D, width: number, height: number, beatPulse: number) => {
  const floorTop = height * 0.64;
  const floor = ctx.createLinearGradient(0, floorTop, 0, height);
  floor.addColorStop(0, "#db9161");
  floor.addColorStop(1, "#8f4c3b");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, floorTop);
  ctx.lineTo(width, floorTop);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(87, 45, 36, ${0.28 + beatPulse * 0.08})`;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 10; i += 1) {
    const y = mix(floorTop, height, (i / 9) ** 1.45);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i += 1) {
    const x = mix(width * -0.08, width * 1.08, i / 8);
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(width * 0.5, floorTop);
    ctx.stroke();
  }
};

const drawWindowAndCurtain = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number
) => {
  const x = width * 0.62;
  const y = height * 0.15;
  const w = width * 0.22;
  const h = height * 0.28;
  const sky = ctx.createLinearGradient(x, y, x + w, y + h);
  sky.addColorStop(0, "#bff5ff");
  sky.addColorStop(1, "#7ec8ff");
  fillRoundRectAlpha(ctx, "#ffffff", 0.72, x - 8, y - 8, w + 16, h + 16, 8);
  ctx.save();
  ctx.fillStyle = sky;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 71, 68, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.moveTo(x, y + h * 0.52);
  ctx.lineTo(x + w, y + h * 0.52);
  ctx.stroke();
  ctx.restore();

  const sway = Math.sin(time * 1.2) * 5 + beatPulse * 5;
  fillRoundRectAlpha(ctx, COLORS.rose, 0.44 + intrusion * 0.08, x - 22 + sway, y - 10, 24, h + 32, 9);
  fillRoundRectAlpha(ctx, COLORS.teal, 0.34 + intrusion * 0.1, x + w - 2 - sway, y - 10, 28, h + 32, 9);
  fillRectAlpha(ctx, "#fff8d6", 0.32, x + w * 0.68, y + h * 0.12, w * 0.18, h * 0.14);
};

const drawLivingFurniture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number
) => {
  const shelfX = width * 0.12;
  const shelfY = height * 0.23;
  const shelfW = width * 0.18;
  const shelfH = height * 0.31;
  fillRoundRectAlpha(ctx, "#8a5a45", 0.82, shelfX, shelfY, shelfW, shelfH, 8);
  for (let row = 0; row < 3; row += 1) {
    const y = shelfY + 18 + row * (shelfH - 26) / 3;
    fillRectAlpha(ctx, "#5e372f", 0.58, shelfX + 9, y, shelfW - 18, 4);
    for (let i = 0; i < 7; i += 1) {
      const bx = shelfX + 16 + i * (shelfW - 40) / 6;
      const bh = 16 + rand(row * 20 + i) * 22;
      const color = i % 3 === 0 ? COLORS.teal : i % 3 === 1 ? COLORS.rose : COLORS.paper;
      fillRoundRectAlpha(ctx, color, 0.52, bx, y - bh, 7, bh, 2);
    }
  }

  const couchX = width * 0.34;
  const couchY = height * 0.53;
  const couchW = width * 0.32;
  const couchH = height * 0.15;
  fillRoundRectAlpha(ctx, "#f68aa5", 0.78, couchX, couchY, couchW, couchH, 16);
  fillRoundRectAlpha(ctx, "#ffc367", 0.75, couchX + couchW * 0.08, couchY - couchH * 0.28, couchW * 0.84, couchH * 0.45, 14);
  fillRoundRectAlpha(ctx, "#704033", 0.35, couchX + 12, couchY + couchH * 0.72, couchW - 24, couchH * 0.18, 7);
  fillRoundRectAlpha(ctx, COLORS.teal, 0.55, couchX + couchW * 0.12, couchY + 12, couchW * 0.18, couchH * 0.48, 7);
  fillRoundRectAlpha(ctx, COLORS.paper, 0.68, couchX + couchW * 0.69, couchY + 10, couchW * 0.16, couchH * 0.42, 7);

  const tableX = width * 0.43;
  const tableY = height * 0.71;
  const tableW = width * 0.25;
  const tableH = height * 0.055;
  fillRoundRectAlpha(ctx, "#774637", 0.82, tableX, tableY, tableW, tableH, 10);
  fillRectAlpha(ctx, "#4b2a26", 0.55, tableX + tableW * 0.15, tableY + tableH, 8, height * 0.08);
  fillRectAlpha(ctx, "#4b2a26", 0.55, tableX + tableW * 0.78, tableY + tableH, 8, height * 0.08);

  const lampX = width * 0.43;
  const lampY = height * 0.2;
  const lampGlow = ctx.createRadialGradient(lampX, lampY, 4, lampX, lampY, height * (0.22 + beatPulse * 0.04));
  lampGlow.addColorStop(0, `rgba(255, 252, 175, ${0.44 + beatPulse * 0.18})`);
  lampGlow.addColorStop(1, "rgba(255, 252, 175, 0)");
  ctx.fillStyle = lampGlow;
  ctx.fillRect(lampX - width * 0.22, lampY - height * 0.15, width * 0.44, height * 0.38);
  fillRoundRectAlpha(ctx, "#fff28e", 0.72 + beatPulse * 0.18, lampX - 24, lampY - 14, 48, 28, 12);
  fillRectAlpha(ctx, "#765244", 0.5, lampX - 1, 0, 2, lampY - 16);

  const plantX = width * 0.78;
  const plantY = height * 0.66;
  fillRoundRectAlpha(ctx, "#ad7050", 0.8, plantX - 18, plantY, 36, 45, 8);
  ctx.save();
  ctx.strokeStyle = `rgba(31, 207, 196, ${0.45 + intrusion * 0.16})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(plantX, plantY + 6);
    ctx.quadraticCurveTo(
      plantX + (i - 2) * 22,
      plantY - 45 - Math.sin(time * 0.8 + i) * 6,
      plantX + (i - 2) * 34,
      plantY - 68 + rand(i) * 12
    );
    ctx.stroke();
  }
  ctx.restore();
};

const drawCareNote = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number,
  chorus: number
) => {
  const x = width * (0.47 + Math.sin(time * 0.18) * 0.01);
  const y = height * 0.61;
  const w = width * 0.2;
  const h = Math.max(72, height * 0.13);
  const warmth = clamp(0.66 + beatPulse * 0.18 + chorus * 0.12);
  ctx.save();
  ctx.rotate(0.015 * Math.sin(time * 0.8));
  fillRoundRectAlpha(ctx, COLORS.paper, 0.88, x, y, w, h, 5);
  fillRoundRectAlpha(ctx, COLORS.rose, 0.08 + intrusion * 0.08, x, y, w, h, 5);
  strokeRoundRectAlpha(ctx, "#a4724e", 0.22, x, y, w, h, 5, 1);
  ctx.font = `${Math.max(11, width * 0.012)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(76, 47, 42, 0.82)";
  ctx.fillText("i hear you", x + 16, y + 15);
  ctx.fillStyle = `rgba(255, 91, 141, ${0.66 + intrusion * 0.2})`;
  ctx.fillText("stay close", x + 16, y + 36);
  ctx.strokeStyle = `rgba(31, 207, 196, ${0.35 + warmth * 0.32})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const waveY = y + h - 20;
  for (let px = x + 16; px < x + w - 16; px += 6) {
    const t = (px - x) / Math.max(1, w);
    const py = waveY + Math.sin(t * Math.PI * 6 + time * 4.4) * (2 + beatPulse * 4);
    if (px === x + 16) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
};

const drawPopIntrusion = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number,
  chorus: number
) => {
  ctx.save();
  ctx.globalAlpha = 0.35 + intrusion * 0.35 + chorus * 0.2;
  ctx.lineWidth = 7;
  ctx.strokeStyle = COLORS.teal;
  ctx.beginPath();
  ctx.moveTo(width * 0.2, height * 0.13);
  ctx.bezierCurveTo(width * 0.38, height * 0.03, width * 0.59, height * 0.05, width * 0.73, height * 0.18);
  ctx.stroke();
  ctx.strokeStyle = COLORS.rose;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.78);
  ctx.bezierCurveTo(width * 0.2, height * 0.68, width * 0.31, height * 0.78, width * 0.42, height * 0.69);
  ctx.stroke();

  const heartCount = 4 + Math.floor(chorus * 4);
  for (let i = 0; i < heartCount; i += 1) {
    const seed = 120 + i * 11;
    const hx = width * (0.16 + rand(seed) * 0.7);
    const hy = height * (0.16 + rand(seed + 3) * 0.58);
    const size = 8 + rand(seed + 5) * 12 + beatPulse * 4;
    ctx.fillStyle = i % 2 === 0 ? COLORS.rose : COLORS.teal;
    ctx.beginPath();
    ctx.moveTo(hx, hy + size * 0.35);
    ctx.bezierCurveTo(hx - size, hy - size * 0.2, hx - size * 0.4, hy - size, hx, hy - size * 0.34);
    ctx.bezierCurveTo(hx + size * 0.4, hy - size, hx + size, hy - size * 0.2, hx, hy + size * 0.35);
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(255, 247, 185, ${0.36 + beatPulse * 0.3})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    const sx = width * (0.24 + i * 0.22);
    const sy = height * (0.16 + rand(i + 70) * 0.28);
    const r = 8 + i * 2 + beatPulse * 5;
    ctx.beginPath();
    ctx.moveTo(sx - r, sy);
    ctx.lineTo(sx + r, sy);
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx, sy + r);
    ctx.stroke();
  }
  ctx.restore();
};

const drawWatcherGlimpse = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number
) => {
  const cx = width * (0.2 + Math.sin(time * 0.2) * 0.01);
  const cy = height * (0.52 + Math.cos(time * 0.15) * 0.012);
  const rx = width * (0.065 + intrusion * 0.018);
  const ry = height * (0.035 + beatPulse * 0.012);
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx * 2.8);
  glow.addColorStop(0, `rgba(255, 247, 185, ${0.2 + intrusion * 0.12})`);
  glow.addColorStop(0.5, `rgba(255, 111, 163, ${0.08 + intrusion * 0.12})`);
  glow.addColorStop(1, "rgba(255, 111, 163, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - rx * 3, cy - rx * 2, rx * 6, rx * 4);
  ctx.strokeStyle = `rgba(76, 47, 42, ${0.45 + intrusion * 0.12})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(40, 42, 78, ${0.55 + intrusion * 0.24})`;
  ctx.beginPath();
  ctx.arc(cx + Math.sin(time * 0.7) * rx * 0.12, cy, Math.min(rx, ry) * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.65 + beatPulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(cx - rx * 0.18, cy - ry * 0.22, Math.max(2, rx * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawSoftFocus = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  active: boolean,
  intensity: number
) => {
  const radius = 18 + intensity * 28;
  ctx.save();
  ctx.strokeStyle = active ? COLORS.rose : COLORS.brass;
  ctx.globalAlpha = active ? 0.45 : 0.18 + intensity * 0.14;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.arc(x, y, radius + Math.sin(time * 3) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = active ? COLORS.rose : COLORS.brass;
  ctx.globalAlpha *= 0.55;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawApartmentRoom = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number,
  chorus: number,
  warmth: number,
  pointerX: number,
  pointerY: number,
  pointerActive: boolean
) => {
  const light = clamp(0.62 + warmth * 0.24 + chorus * 0.12 + beatPulse * 0.08);
  drawWallpaper(ctx, width, height, time, light);
  drawFloor(ctx, width, height, beatPulse);
  drawWindowAndCurtain(ctx, width, height, time, intrusion, beatPulse);
  drawLivingFurniture(ctx, width, height, time, intrusion, beatPulse);
  drawPopIntrusion(ctx, width, height, time, intrusion, beatPulse, chorus);
  drawWatcherGlimpse(ctx, width, height, time, intrusion, beatPulse);
  drawCareNote(ctx, width, height, time, intrusion, beatPulse, chorus);
  drawSoftFocus(ctx, pointerX, pointerY, time, pointerActive, intrusion);

  const roomGlow = ctx.createRadialGradient(width * 0.5, height * 0.36, 0, width * 0.5, height * 0.4, width * 0.58);
  roomGlow.addColorStop(0, `rgba(255, 247, 185, ${0.18 + light * 0.18})`);
  roomGlow.addColorStop(0.7, `rgba(255, 111, 163, ${0.03 + chorus * 0.06})`);
  roomGlow.addColorStop(1, "rgba(255, 247, 185, 0)");
  ctx.fillStyle = roomGlow;
  ctx.fillRect(0, 0, width, height);
};

const drawPaneShell = (
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  selected: boolean,
  alert: number,
  beforeTexture: boolean
) => {
  const side = 8 + pane.depth * 9;
  const shadow = 14 + pane.depth * 18;
  if (beforeTexture) {
    fillRectAlpha(ctx, "#000000", 0.24 + pane.depth * 0.18, pane.x + side, pane.y + shadow, pane.w, pane.h);
    ctx.save();
    ctx.fillStyle = selected ? "rgba(241, 242, 106, 0.22)" : "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.moveTo(pane.x + pane.w, pane.y + 5);
    ctx.lineTo(pane.x + pane.w + side, pane.y + side);
    ctx.lineTo(pane.x + pane.w + side, pane.y + pane.h + side);
    ctx.lineTo(pane.x + pane.w, pane.y + pane.h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  strokeRectAlpha(ctx, selected ? COLORS.amber : COLORS.mint, selected ? 0.9 : 0.22 + pane.depth * 0.16, pane.x, pane.y, pane.w, pane.h, selected ? 2.5 : 1);
  if (alert > 0.35) {
    strokeRectAlpha(ctx, COLORS.rose, alert * 0.42, pane.x - 3, pane.y - 3, pane.w + 6, pane.h + 6, 1.5);
  }
};

const drawCameraTexture = (
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  index: number,
  time: number,
  noise: number,
  selected: boolean
) => {
  const drift = Math.floor(time * (selected ? 18 : 6));
  const baseHue = rand(index + 4) > 0.5 ? COLORS.panel : COLORS.panelHot;
  fillRectAlpha(ctx, baseHue, selected ? 0.92 : 0.82, pane.x, pane.y, pane.w, pane.h);

  const bands = 5 + Math.floor(noise * 7);
  for (let i = 0; i < bands; i += 1) {
    const y = pane.y + rand(index * 101 + i * 7 + drift) * pane.h;
    const h = mix(1, pane.h * 0.11, rand(index * 23 + i));
    const color = i % 3 === 0 ? COLORS.sky : i % 2 === 0 ? COLORS.mint : COLORS.rose;
    fillRectAlpha(ctx, color, 0.035 + noise * 0.12, pane.x, y, pane.w, h);
  }

  const stripeStep = Math.max(4, pane.h / 16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(pane.x, pane.y, pane.w, pane.h);
  ctx.clip();
  ctx.strokeStyle = "rgba(215, 255, 241, 0.08)";
  ctx.lineWidth = 1;
  for (let y = pane.y + ((time * 18 + index * 3) % stripeStep); y < pane.y + pane.h; y += stripeStep) {
    ctx.beginPath();
    ctx.moveTo(pane.x, y);
    ctx.lineTo(pane.x + pane.w, y);
    ctx.stroke();
  }
  ctx.restore();

  const vignette = ctx.createLinearGradient(pane.x, pane.y, pane.x + pane.w, pane.y + pane.h);
  vignette.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  vignette.addColorStop(0.42, "rgba(255, 255, 255, 0.00)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(pane.x, pane.y, pane.w, pane.h);
};

const drawDetection = (
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  index: number,
  time: number,
  intensity: number,
  pointerX: number,
  pointerY: number
) => {
  const count = 1 + Math.floor(intensity * 3);
  for (let i = 0; i < count; i += 1) {
    const seed = index * 41 + i * 13;
    const phase = time * (0.18 + rand(seed) * 0.18) + rand(seed + 3) * 9;
    const follow = i === 0 ? intensity * 0.35 : 0;
    const centerX = mix(pane.x + pane.w * (0.18 + rand(seed + 1) * 0.64), pointerX, follow);
    const centerY = mix(pane.y + pane.h * (0.18 + rand(seed + 2) * 0.64), pointerY, follow);
    const x = centerX + Math.sin(phase) * pane.w * 0.12;
    const y = centerY + Math.cos(phase * 0.7) * pane.h * 0.12;
    const w = pane.w * mix(0.18, 0.42, rand(seed + 4));
    const h = pane.h * mix(0.15, 0.34, rand(seed + 5));
    const color = i % 2 === 0 ? COLORS.mint : COLORS.amber;
    strokeRectAlpha(ctx, color, 0.38 + intensity * 0.45, x - w / 2, y - h / 2, w, h, 1.5 + intensity);
    fillRectAlpha(ctx, color, 0.025 + intensity * 0.04, x - w / 2, y - h / 2, w, h);
  }
};

const drawPaneLabel = (
  ctx: CanvasRenderingContext2D,
  pane: Pane,
  index: number,
  label: string,
  status: string,
  time: number,
  selected: boolean,
  alert: number
) => {
  const fontSize = Math.max(9, Math.min(13, pane.w * 0.052));
  ctx.save();
  ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = selected ? COLORS.amber : COLORS.ink;
  ctx.fillText(`CAM ${String(index + 1).padStart(2, "0")} ${label}`, pane.x + 8, pane.y + 7);
  ctx.fillStyle = alert > 0.45 ? COLORS.rose : COLORS.dim;
  ctx.fillText(status, pane.x + pane.w - 8 - ctx.measureText(status).width, pane.y + 7);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(formatClock(time + index * 0.37), pane.x + 8, pane.y + pane.h - fontSize - 7);
  ctx.restore();
};

const drawPointerFocus = (ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number) => {
  const size = 18 + intensity * 24;
  ctx.save();
  ctx.strokeStyle = COLORS.rose;
  ctx.globalAlpha = 0.28 + intensity * 0.4;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x - size * 0.3, y);
  ctx.moveTo(x + size * 0.3, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y - size * 0.3);
  ctx.moveTo(x, y + size * 0.3);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  ctx.restore();
};

const drawCareTraceGauge = (ctx: CanvasRenderingContext2D, width: number, height: number, intrusion: number, chorus: number) => {
  const x = Math.max(18, width * 0.018);
  const y = height * 0.28;
  const h = height * 0.38;
  const w = Math.max(34, width * 0.032);
  fillRectAlpha(ctx, "#030505", 0.56, x, y, w, h);
  strokeRectAlpha(ctx, COLORS.mint, 0.24, x, y, w, h, 1);
  fillRectAlpha(ctx, COLORS.mint, 0.16, x + 7, y + h * (1 - clamp(0.55 - intrusion * 0.32)), w - 14, h * clamp(0.55 - intrusion * 0.32));
  fillRectAlpha(ctx, COLORS.rose, 0.22 + chorus * 0.18, x + 7, y + h * (1 - intrusion), w - 14, h * intrusion);
  ctx.save();
  ctx.translate(x + w + 12, y + h);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillStyle = COLORS.dim;
  ctx.fillText("CARE / TRACE", 0, 0);
  ctx.restore();
};

const getDoorScopeEllipse = (width: number, height: number, intrusion: number) => ({
  cx: width * 0.5,
  cy: height * 0.5,
  rx: width * (0.48 - intrusion * 0.035),
  ry: height * (0.46 - intrusion * 0.025)
});

const doorScopeRangeAtY = (width: number, height: number, intrusion: number, y: number, padding: number) => {
  const { cx, cy, rx, ry } = getDoorScopeEllipse(width, height, intrusion);
  const normalizedY = (y - cy) / Math.max(1, ry);
  const scale = Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
  return {
    left: cx - rx * scale + padding,
    right: cx + rx * scale - padding
  };
};

const doorScopeBandRange = (
  width: number,
  height: number,
  intrusion: number,
  top: number,
  bottom: number,
  padding: number
) => {
  const samples = [top, (top + bottom) * 0.5, bottom];
  let left = 0;
  let right = width;
  for (const y of samples) {
    const range = doorScopeRangeAtY(width, height, intrusion, y, padding);
    left = Math.max(left, range.left);
    right = Math.min(right, range.right);
  }
  return { left, right };
};

const drawEmpathyAppeal = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number,
  chorus: number
) => {
  const cardH = Math.max(88, Math.min(112, height * 0.14));
  const cardY = Math.min(height * 0.53, height - cardH - 28);
  const scopePadding = Math.max(34, Math.min(width, height) * 0.052);
  const scopeRange = doorScopeBandRange(width, height, intrusion, cardY, cardY + cardH, scopePadding);
  const desiredW = Math.max(220, Math.min(width * 0.31, 330));
  const availableW = Math.max(150, scopeRange.right - scopeRange.left);
  const cardW = Math.min(desiredW, availableW);
  const cardX = fitRange(width * 0.22, scopeRange.left, scopeRange.right - cardW);
  const warmth = clamp(0.62 + (1 - intrusion) * 0.22 + beatPulse * 0.16);
  const persuasion = clamp(0.42 + intrusion * 0.32 + chorus * 0.13);

  ctx.save();
  fillRectAlpha(ctx, "#10110d", 0.68, cardX, cardY, cardW, cardH);
  fillRectAlpha(ctx, COLORS.amber, 0.055 + warmth * 0.035, cardX, cardY, cardW, cardH);
  strokeRectAlpha(ctx, COLORS.amber, 0.24 + warmth * 0.2, cardX, cardY, cardW, cardH, 1.2);

  const faceX = cardX + 42;
  const faceY = cardY + cardH * 0.52;
  const faceR = Math.min(cardH * 0.36, 31);
  const faceGlow = ctx.createRadialGradient(faceX, faceY, faceR * 0.2, faceX, faceY, faceR * 1.8);
  faceGlow.addColorStop(0, `rgba(241, 242, 106, ${0.22 + warmth * 0.18})`);
  faceGlow.addColorStop(0.55, `rgba(255, 111, 163, ${0.07 + persuasion * 0.08})`);
  faceGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = faceGlow;
  ctx.beginPath();
  ctx.arc(faceX, faceY, faceR * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(215, 255, 241, ${0.5 + warmth * 0.25})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(faceX, faceY, faceR, Math.PI * 0.18, Math.PI * 1.82);
  ctx.stroke();

  ctx.fillStyle = `rgba(241, 242, 106, ${0.4 + beatPulse * 0.2})`;
  ctx.beginPath();
  ctx.arc(faceX - faceR * 0.35, faceY - faceR * 0.14, 2.6, 0, Math.PI * 2);
  ctx.arc(faceX + faceR * 0.35, faceY - faceR * 0.14, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 111, 163, ${0.34 + persuasion * 0.18})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(faceX, faceY + faceR * 0.05, faceR * 0.5, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  fillRectAlpha(ctx, COLORS.rose, 0.07 + persuasion * 0.07, faceX - faceR * 0.9, faceY + faceR * 0.05, faceR * 0.35, 5);
  fillRectAlpha(ctx, COLORS.rose, 0.07 + persuasion * 0.07, faceX + faceR * 0.55, faceY + faceR * 0.05, faceR * 0.35, 5);

  const textX = cardX + 82;
  ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.amber;
  ctx.fillText("HUMAN SIGNAL", textX, cardY + 12);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText("gentle", textX, cardY + 31);
  ctx.fillText("empathy", textX, cardY + 49);
  ctx.fillText("I can stay", textX, cardY + 67);

  const barX = textX + 72;
  const barW = cardW - (barX - cardX) - 18;
  fillRectAlpha(ctx, COLORS.amber, 0.14, barX, cardY + 34, barW, 4);
  fillRectAlpha(ctx, COLORS.amber, 0.58, barX, cardY + 34, barW * warmth, 4);
  fillRectAlpha(ctx, COLORS.mint, 0.14, barX, cardY + 52, barW, 4);
  fillRectAlpha(ctx, COLORS.mint, 0.52, barX, cardY + 52, barW * (0.66 + persuasion * 0.25), 4);
  fillRectAlpha(ctx, COLORS.rose, 0.1, barX, cardY + 70, barW, 4);
  fillRectAlpha(ctx, COLORS.rose, 0.3, barX, cardY + 70, barW * (0.35 + persuasion * 0.32), 4);

  ctx.strokeStyle = `rgba(241, 242, 106, ${0.2 + warmth * 0.18})`;
  ctx.beginPath();
  const waveY = cardY + cardH - 12;
  for (let x = barX; x <= barX + barW; x += 6) {
    const t = (x - barX) / Math.max(1, barW);
    const y = waveY + Math.sin(t * Math.PI * 6 + time * 4) * (2 + beatPulse * 4);
    if (x === barX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
};

const drawObserverPresence = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intrusion: number,
  beatPulse: number,
  chorus: number
) => {
  const cx = width * (0.15 + Math.sin(time * 0.09) * 0.006);
  const cy = height * (0.49 + Math.cos(time * 0.11) * 0.012);
  const radius = Math.min(width, height) * (0.085 + intrusion * 0.012);
  const blink = 0.82 + Math.sin(time * 1.7) * 0.08 + beatPulse * 0.08;
  const desire = clamp(intrusion * 0.56 + chorus * 0.16 + beatPulse * 0.08);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const body = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.6);
  body.addColorStop(0, `rgba(255, 111, 163, ${0.09 + desire * 0.1})`);
  body.addColorStop(0.42, `rgba(159, 255, 216, ${0.06 + desire * 0.08})`);
  body.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, width * 0.42, height);

  ctx.fillStyle = `rgba(2, 3, 4, ${0.34 + intrusion * 0.1})`;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.05);
  ctx.bezierCurveTo(width * 0.16, height * 0.04, width * 0.25, height * 0.27, width * 0.26, height * 0.48);
  ctx.bezierCurveTo(width * 0.26, height * 0.72, width * 0.14, height * 0.92, 0, height * 0.95);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(159, 255, 216, ${0.34 + desire * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.28, radius * 0.54 * blink, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 111, 163, ${0.18 + desire * 0.22})`;
  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.08, cy, radius * 0.62, radius * 0.28 * blink, 0, 0, Math.PI * 2);
  ctx.stroke();

  const pupilRadius = radius * (0.12 + desire * 0.08);
  ctx.fillStyle = `rgba(241, 242, 106, ${0.34 + beatPulse * 0.26})`;
  ctx.beginPath();
  ctx.arc(cx + Math.sin(time * 0.7) * radius * 0.05, cy + Math.cos(time * 0.6) * radius * 0.03, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(215, 255, 241, ${0.1 + desire * 0.18})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = cy + (i - 2) * radius * 0.28;
    ctx.beginPath();
    for (let x = cx + radius * 1.45; x < width * 0.43; x += 12) {
      const wave = Math.sin(x * 0.028 + time * (2.1 + i * 0.12)) * radius * 0.035 * (1 + desire);
      if (x === cx + radius * 1.45) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  const logX = Math.max(22, width * 0.045);
  const logY = Math.max(94, height * 0.14);
  ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textBaseline = "top";
  const logs = [
    ["SUBJECT", desire > 0.58 ? "WANTING" : "LISTENING"],
    ["EMPATHY", `${Math.round((0.7 + desire * 0.22) * 100).toString().padStart(3, "0")}%`],
    ["TRACE", `${Math.round(desire * 74).toString().padStart(3, "0")}%`]
  ];
  for (let i = 0; i < logs.length; i += 1) {
    const [key, value] = logs[i];
    const y = logY + i * 17;
    ctx.fillStyle = "rgba(215, 255, 241, 0.42)";
    ctx.fillText(key, logX, y);
    ctx.fillStyle = i === 0 && desire > 0.62 ? COLORS.rose : COLORS.mint;
    ctx.fillText(value, logX + 62, y);
  }

  ctx.restore();
};

const drawDoorScope = (ctx: CanvasRenderingContext2D, width: number, height: number, intrusion: number, beatPulse: number) => {
  const { cx, cy, rx, ry } = getDoorScopeEllipse(width, height, intrusion);
  ctx.save();
  ctx.fillStyle = "rgba(20, 12, 15, 0.76)";
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill("evenodd");

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
  ctx.clip("evenodd");
  const grainAlpha = 0.14;
  for (let i = 0; i < 18; i += 1) {
    const x = width * (i / 17);
    ctx.strokeStyle = `rgba(229, 183, 100, ${grainAlpha * (0.4 + rand(i) * 0.7)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(i) * 7, 0);
    ctx.bezierCurveTo(x + 18, height * 0.28, x - 16, height * 0.62, x + 4, height);
    ctx.stroke();
  }
  ctx.restore();

  const ringAlpha = 0.58 + intrusion * 0.18 + beatPulse * 0.1;
  ctx.strokeStyle = `rgba(229, 183, 100, ${ringAlpha})`;
  ctx.lineWidth = Math.max(9, Math.min(width, height) * 0.021);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 246, 194, ${0.48 + beatPulse * 0.12})`;
  ctx.lineWidth = Math.max(3, Math.min(width, height) * 0.006);
  ctx.beginPath();
  ctx.ellipse(cx - intrusion * 9, cy - beatPulse * 5, rx * 0.982, ry * 0.982, 0, 0, Math.PI * 2);
  ctx.stroke();

  const glass = ctx.createRadialGradient(cx + rx * 0.34, cy - ry * 0.36, 2, cx, cy, Math.max(rx, ry));
  glass.addColorStop(0, `rgba(255, 255, 255, ${0.22 + beatPulse * 0.08})`);
  glass.addColorStop(0.3, "rgba(255, 255, 255, 0.04)");
  glass.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();

  fillRectAlpha(ctx, "#070405", 0.38, 0, 0, width * 0.055, height);
  fillRectAlpha(ctx, COLORS.brass, 0.22 + beatPulse * 0.1, width * 0.035, height * 0.47, width * 0.018, height * 0.12);
  ctx.restore();
};

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  width: number,
  title: string,
  artist: string,
  time: number,
  alert: number
) => {
  fillRectAlpha(ctx, "#050707", 0.84, 0, 0, width, 52);
  fillRectAlpha(ctx, alert > 0.55 ? COLORS.rose : COLORS.mint, 0.12 + alert * 0.24, 0, 50, width, 2);

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  const roomLabel = "MONITORING ROOM";
  ctx.fillStyle = COLORS.mint;
  ctx.fillText(roomLabel, Math.max(20, width * 0.42), 18);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`${title} / ${artist}`, Math.max(20, width * 0.42), 36);
  const clock = formatClock(time);
  ctx.fillStyle = alert > 0.5 ? COLORS.rose : COLORS.amber;
  ctx.fillText(clock, width - 20 - ctx.measureText(clock).width, 27);
  ctx.restore();
};

const drawGlobalWarning = (ctx: CanvasRenderingContext2D, width: number, height: number, alert: number, time: number) => {
  if (alert <= 0.02) return;
  const bandY = height * (0.14 + 0.72 * rand(Math.floor(time * 3) + 80));
  fillRectAlpha(ctx, COLORS.rose, alert * 0.055, 0, bandY, width, Math.max(4, height * 0.014));
  strokeRectAlpha(ctx, COLORS.rose, alert * 0.26, 12, 64, width - 24, height - 78, 1.5);
};

export const createSongApp = async (
  context: SongAdapterContext,
  services: SongAppServices
): Promise<SongApp> => {
  const { canvas, ctx } = services;
  let cues: MonitoringCues = {};
  try {
    cues = (await context.assets.readDesignCues<MonitoringCues>()) ?? {};
  } catch {
    cues = {};
  }

  const warningTimes = Array.isArray(cues.warningTimes)
    ? cues.warningTimes.filter((time): time is number => typeof time === "number" && Number.isFinite(time))
    : [];
  const pointer = { x: 0.5, y: 0.5, active: false };

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  };

  const render = (frame: SongAppFrame) => {
    const width = canvas.width;
    const height = canvas.height;
    const bounds = resolveDrawingBounds(frame, width, height);
    const beat = beatAt(frame.time, context.musicMap.beats);
    const beatPulse = beat.pulse;
    const chorus = activeRange(frame.time, context.musicMap.chorus);
    const warmth = activeRange(frame.time, context.musicMap.markers.warmSections ?? []);
    const markerHit = Math.max(
      emphasisAt(frame.time, context.musicMap),
      ...warningTimes.map((time) => decayPulse(frame.time - time, 1.6))
    );
    const intrusion = clamp(frame.userGlow * 0.52 + chorus * 0.34 + warmth * 0.22 + markerHit * 0.24);
    const pointerX = clamp((pointer.x * width - bounds.x) / Math.max(1, bounds.width)) * bounds.width;
    const pointerY = clamp((pointer.y * height - bounds.y) / Math.max(1, bounds.height)) * bounds.height;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = COLORS.room;
    ctx.fillRect(0, 0, width, height);
    fillRectAlpha(ctx, "#000000", 0.24, 0, 0, width, bounds.y);
    fillRectAlpha(ctx, "#000000", 0.28, 0, bounds.y + bounds.height, width, height - bounds.y - bounds.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();
    ctx.translate(bounds.x, bounds.y);
    drawApartmentRoom(
      ctx,
      bounds.width,
      bounds.height,
      frame.time,
      intrusion,
      beatPulse,
      chorus,
      warmth,
      pointerX,
      pointerY,
      pointer.active
    );
    drawDoorScope(ctx, bounds.width, bounds.height, intrusion, beatPulse);
    ctx.restore();
    strokeRectAlpha(ctx, COLORS.brass, 0.18 + intrusion * 0.12, bounds.x, bounds.y, bounds.width, bounds.height, 1);
    ctx.restore();
  };

  return {
    id: `${context.manifest.id}:peephole-room`,
    status: "peephole apartment adapter",
    resize,
    render,
    pointerMove(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
      pointer.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
      pointer.active = true;
    },
    pointerLeave() {
      pointer.active = false;
    },
    resetVisualTiming() {
      pointer.x = 0.5;
      pointer.y = 0.5;
      pointer.active = false;
    }
  };
};
