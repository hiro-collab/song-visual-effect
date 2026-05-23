import type { Range, SongAdapterContext, SongApp, SongAppFrame, SongAppServices } from "../../system/kit";
import { activeRange, beatAt, clamp, emphasisAt } from "../../system/kit";

type VoiceCard = {
  label: string;
  short: string;
  color: string;
  lane: number;
  offset: number;
};

type SectionCue = {
  label: string;
  start: number;
  end: number;
  intensity?: number;
};

type DesignCues = {
  voiceCards?: VoiceCard[];
  sections?: SectionCue[];
};

type Viewport = {
  width: number;
  height: number;
  dpr: number;
};

type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Point = {
  x: number;
  y: number;
};

type PlacedVoice = Point & {
  card: VoiceCard;
  index: number;
  active: boolean;
  pulse: number;
  angle: number;
  scale: number;
};

const DEFAULT_VOICE_CARDS: VoiceCard[] = [
  { label: "初音ミク", short: "Miku", color: "#b9d8ff", lane: 1, offset: 0.03 },
  { label: "v flower", short: "flower", color: "#d7c2ff", lane: 3, offset: 0.13 },
  { label: "歌愛ユキ", short: "Yuki", color: "#f2a7c4", lane: 0, offset: 0.22 },
  { label: "GUMI", short: "GUMI", color: "#bfe9a6", lane: 4, offset: 0.31 },
  { label: "可不", short: "KAFU", color: "#f4efe4", lane: 2, offset: 0.41 },
  { label: "星界", short: "SEKAI", color: "#99d3be", lane: 1, offset: 0.5 },
  { label: "足立レイ", short: "Rei", color: "#f0c46d", lane: 4, offset: 0.58 },
  { label: "裏命", short: "RIME", color: "#dd8b8c", lane: 2, offset: 0.67 },
  { label: "花隈千冬", short: "Chifuyu", color: "#ffe08a", lane: 0, offset: 0.76 },
  { label: "VY1", short: "VY1", color: "#a8c7ff", lane: 3, offset: 0.85 },
  { label: "SOLARIA", short: "SOLARIA", color: "#ffd0a1", lane: 1, offset: 0.94 }
];

const DEFAULT_SECTIONS: SectionCue[] = [
  { label: "window thaws", start: 3.04, end: 31, intensity: 0.35 },
  { label: "beside walk", start: 31, end: 56.21, intensity: 0.58 },
  { label: "light-year chorus 1", start: 56.21, end: 79.95, intensity: 0.98 },
  { label: "quiet room", start: 100, end: 124, intensity: 0.5 },
  { label: "light-year chorus 2", start: 147.45, end: 171.19, intensity: 1 },
  { label: "future afterimage", start: 190, end: 229.5, intensity: 0.78 }
];

const FONT_FAMILY = "'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
const LANE_LEVELS = [0.22, 0.32, 0.43, 0.58, 0.7];

const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const wrap01 = (value: number) => {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

const capText = (value: unknown, fallback: string, maxLength: number) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
};

const safeCard = (card: VoiceCard, index: number): VoiceCard => {
  const fallback = DEFAULT_VOICE_CARDS[index % DEFAULT_VOICE_CARDS.length];
  return {
    label: capText(card.label, fallback.label, 16),
    short: capText(card.short, fallback.short, 12),
    color: typeof card.color === "string" && /^#[0-9a-f]{6}$/i.test(card.color) ? card.color : fallback.color,
    lane: Number.isFinite(card.lane) ? Math.max(0, Math.floor(card.lane)) : index % 5,
    offset: Number.isFinite(card.offset) ? wrap01(card.offset) : index / DEFAULT_VOICE_CARDS.length
  };
};

const safeRange = (section: SectionCue): Range | null => {
  if (!Number.isFinite(section.start) || !Number.isFinite(section.end) || section.end <= section.start) return null;
  return {
    start: section.start,
    end: section.end,
    intensity: Number.isFinite(section.intensity) ? clamp(section.intensity ?? 1) : 1
  };
};

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
};

const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const viewportRect = (viewport: Viewport): LayoutRect => ({
  x: 0,
  y: 0,
  width: viewport.width,
  height: viewport.height,
  left: 0,
  top: 0,
  right: viewport.width,
  bottom: viewport.height
});

const contentRectFromFrame = (frame: SongAppFrame, viewport: Viewport): LayoutRect => {
  const rect = frame.contentRect ?? frame.safeArea;
  if (!rect || rect.width < 240 || rect.height < 180) return viewportRect(viewport);
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom
  };
};

const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight = "400"
) => {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 1;
  } while (size > minSize);
  ctx.fillText(text, x, y);
};

const quadraticPoint = (a: Point, b: Point, c: Point, t: number): Point => {
  const inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * b.x + t * t * c.x,
    y: inv * inv * a.y + 2 * inv * t * b.y + t * t * c.y
  };
};

const walkPoint = (content: LayoutRect, progress: number, side: number, time: number): Point => {
  const near = {
    x: content.left + content.width * (0.18 + side * 0.1),
    y: content.bottom - content.height * 0.12
  };
  const bend = {
    x: content.left + content.width * (0.45 + side * 0.035),
    y: content.top + content.height * 0.66
  };
  const far = {
    x: content.right + content.width * 0.12,
    y: content.top + content.height * (0.36 + side * 0.035)
  };
  const point = quadraticPoint(near, bend, far, progress);
  return {
    x: point.x,
    y: point.y + Math.sin(time * 0.22 + progress * 8 + side) * content.height * 0.006
  };
};

const voiceStreamPoint = (
  content: LayoutRect,
  card: VoiceCard,
  index: number,
  progress: number,
  time: number,
  chorus: number
): Point => {
  const lane = LANE_LEVELS[card.lane % LANE_LEVELS.length];
  const x = content.left + content.width * (-0.12 + progress * 1.25);
  const y =
    content.top +
    content.height * lane +
    Math.sin(time * 0.28 + index * 1.4 + progress * Math.PI) * content.height * 0.022;
  const walk = walkPoint(content, progress, index % 2, time);
  return {
    x: mix(x, walk.x, 0.36 + chorus * 0.28),
    y: mix(y, walk.y, 0.22 + chorus * 0.18)
  };
};

const chorusPoint = (content: LayoutRect, index: number, count: number, time: number): Point => {
  const ratio = count <= 1 ? 0.5 : index / (count - 1);
  return {
    x: content.left + content.width * (0.08 + ratio * 0.84),
    y: content.top + content.height * (0.34 + Math.sin(ratio * Math.PI * 2 + time * 0.12) * 0.075)
  };
};

const drawBackdrop = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  time: number,
  chorus: number,
  emphasis: number,
  breath: number
) => {
  const { width, height } = viewport;
  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#26324c");
  sky.addColorStop(0.28, "#526f81");
  sky.addColorStop(0.58, "#f0c3a8");
  sky.addColorStop(0.78, "#b9d8c2");
  sky.addColorStop(1, "#27372f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.16 + chorus * 0.2 + breath * 0.08;
  const dawn = ctx.createRadialGradient(width * 0.78, content.top + content.height * 0.22, 40, width * 0.78, content.top + content.height * 0.22, width * 0.72);
  dawn.addColorStop(0, "#fff2b8");
  dawn.addColorStop(0.45, "rgba(255, 208, 161, 0.45)");
  dawn.addColorStop(1, "rgba(153, 211, 190, 0)");
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12 + emphasis * 0.06;
  ctx.translate(((time * -5) % 180) - 180, 0);
  for (let i = -1; i < 9; i += 1) {
    const x = i * 180;
    ctx.fillStyle = i % 2 === 0 ? "#f4efe4" : "#b9d8ff";
    ctx.beginPath();
    ctx.moveTo(x, height * 0.08);
    ctx.lineTo(x + 84, height * 0.03);
    ctx.lineTo(x + 160, height * 0.94);
    ctx.lineTo(x + 48, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12 + breath * 0.1;
  ctx.strokeStyle = "#f4efe4";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i += 1) {
    const y = content.top + content.height * (0.16 + i * 0.105) + Math.sin(time * 0.1 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(content.left - 18, y);
    ctx.lineTo(content.right + 18, y + Math.sin(time * 0.07 + i) * 7);
    ctx.stroke();
  }
  ctx.restore();
};

const drawWindow = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  time: number,
  chorus: number,
  beatPulse: number
) => {
  const padX = Math.max(16, content.width * 0.055);
  const padTop = Math.max(18, content.height * 0.045);
  const x = content.left + padX;
  const y = content.top + padTop;
  const width = content.width - padX * 2;
  const height = content.height * 0.62;
  const open = smoothstep(0.12, 0.9, chorus);

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = "rgba(244, 239, 228, 0.44)";
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, width, height, 8);
  ctx.stroke();

  ctx.globalAlpha = 0.2 + chorus * 0.18;
  ctx.fillStyle = "rgba(244, 239, 228, 0.12)";
  roundedRectPath(ctx, x, y, width, height, 8);
  ctx.fill();

  const centerX = x + width * 0.5;
  const centerY = y + height * 0.48;
  ctx.globalAlpha = 0.42 + beatPulse * 0.1;
  ctx.strokeStyle = "rgba(244, 239, 228, 0.66)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(centerX - open * width * 0.035, y + 12);
  ctx.lineTo(centerX - open * width * 0.09, y + height - 12);
  ctx.moveTo(centerX + open * width * 0.035, y + 12);
  ctx.lineTo(centerX + open * width * 0.09, y + height - 12);
  ctx.moveTo(x + 10, centerY + Math.sin(time * 0.14) * 4);
  ctx.lineTo(x + width - 10, centerY - Math.sin(time * 0.11) * 4);
  ctx.stroke();

  ctx.globalAlpha = 0.2 + open * 0.16;
  ctx.strokeStyle = "#ffe08a";
  for (let i = 0; i < 4; i += 1) {
    const offset = ((time * 10 + i * 96) % (width + 120)) - 60;
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height * 0.08);
    ctx.lineTo(x + offset + 74, y + height * 0.92);
    ctx.stroke();
  }
  ctx.restore();
};

const drawLightYearTicks = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  time: number,
  beatPulse: number,
  chorus: number
) => {
  const y = content.top + content.height * (0.18 + chorus * 0.035);
  const spacing = Math.max(34, content.width / 12);
  const offset = (time * (14 + chorus * 14)) % spacing;

  ctx.save();
  ctx.globalAlpha = 0.24 + chorus * 0.22;
  ctx.strokeStyle = `rgba(244, 239, 228, ${0.42 + beatPulse * 0.24})`;
  ctx.fillStyle = "rgba(244, 239, 228, 0.52)";
  ctx.lineWidth = 1;
  ctx.font = `10px ${FONT_FAMILY}`;
  for (let i = -1; i <= content.width / spacing + 2; i += 1) {
    const x = content.left + i * spacing - offset;
    const tall = i % 4 === 0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + (tall ? 22 : 11));
    ctx.stroke();
    if (tall) ctx.fillText(`${Math.floor(time + i * 7).toString().padStart(4, "0")}`, x + 4, y + 35);
  }
  ctx.restore();
};

const drawCompanionWalk = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  time: number,
  beatPulse: number,
  chorus: number,
  emphasis: number
) => {
  ctx.save();
  for (let side = 0; side < 2; side += 1) {
    const near = walkPoint(content, 0, side, time);
    const bend = walkPoint(content, 0.5, side, time);
    const far = walkPoint(content, 1, side, time);
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.quadraticCurveTo(bend.x, bend.y, far.x, far.y);
    ctx.strokeStyle = side === 0 ? `rgba(244, 239, 228, ${0.34 + chorus * 0.18})` : `rgba(185, 216, 255, ${0.3 + emphasis * 0.14})`;
    ctx.lineWidth = 2.2 + chorus * 1.4;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  for (let i = 0; i < 18; i += 1) {
    const progress = wrap01(i / 18 + time * 0.045);
    const side = i % 2;
    const point = walkPoint(content, progress, side, time);
    const fade = 0.18 + progress * 0.44;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-0.48 + progress * 0.42 + side * 0.28);
    ctx.globalAlpha = fade + (i % 5 === 0 ? beatPulse * 0.22 : 0);
    ctx.fillStyle = side === 0 ? "#f4efe4" : "#99d3be";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7 + beatPulse * 2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

const placeVoices = (
  content: LayoutRect,
  cards: VoiceCard[],
  frame: SongAppFrame,
  chorus: number,
  beatPulse: number,
  pointer: { x: number; y: number; active: boolean }
): PlacedVoice[] => {
  const currentIndex = Math.floor(wrap01(frame.time / 27) * cards.length);
  const pointerPull = pointer.active ? 1 : 0;
  return cards.map((card, index) => {
    const travel = wrap01(card.offset + frame.time / (64 + (index % 5) * 5));
    const stream = voiceStreamPoint(content, card, index, travel, frame.time, chorus);
    const chorusTarget = chorusPoint(content, index, cards.length, frame.time);
    const gather = smoothstep(0.16, 0.82, chorus);
    const x = mix(stream.x, chorusTarget.x, gather * 0.72) + (pointer.x - 0.5) * 22 * pointerPull;
    const y = mix(stream.y, chorusTarget.y, gather * 0.78) + (pointer.y - 0.5) * 16 * pointerPull;
    const active = index === currentIndex;
    return {
      card,
      index,
      active,
      x,
      y,
      pulse: clamp((active ? 0.24 : 0.04) + beatPulse * (active ? 0.84 : 0.28)),
      angle: mix(-0.09 + (index % 5) * 0.035 + Math.sin(frame.time * 0.17 + index) * 0.025, 0.02 * Math.sin(index), gather),
      scale: active ? 1.08 : 0.92 + ((index % 3) * 0.035)
    };
  });
};

const drawHandoffRibbons = (
  ctx: CanvasRenderingContext2D,
  placed: PlacedVoice[],
  time: number,
  chorus: number
) => {
  ctx.save();
  ctx.globalAlpha = 0.15 + chorus * 0.24;
  ctx.lineWidth = 1.3 + chorus * 1.1;
  ctx.lineCap = "round";
  for (let i = 0; i < placed.length - 1; i += 1) {
    const current = placed[i];
    const next = placed[i + 1];
    const midX = (current.x + next.x) / 2 + Math.sin(time * 0.16 + i) * 20;
    const midY = (current.y + next.y) / 2 - 24 - chorus * 12;
    ctx.strokeStyle = withAlpha(current.card.color, 0.72);
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.quadraticCurveTo(midX, midY, next.x, next.y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawVoicePetal = (
  ctx: CanvasRenderingContext2D,
  placed: PlacedVoice,
  content: LayoutRect,
  chorus: number
) => {
  const width = Math.max(86, Math.min(138, content.width * 0.27)) * placed.scale;
  const height = Math.max(34, Math.min(46, content.height * 0.075)) * placed.scale;
  const color = placed.card.color;

  ctx.save();
  ctx.translate(placed.x, placed.y);
  ctx.rotate(placed.angle);
  ctx.globalAlpha = placed.active ? 0.97 : 0.74;
  ctx.shadowColor = "rgba(35, 38, 51, 0.28)";
  ctx.shadowBlur = placed.active ? 17 : 9;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  ctx.moveTo(-width / 2 + 12, -height / 2);
  ctx.lineTo(width / 2 - 18, -height / 2);
  ctx.quadraticCurveTo(width / 2 + 5, -height / 2 + 3, width / 2 + 12, 0);
  ctx.quadraticCurveTo(width / 2 + 5, height / 2 - 3, width / 2 - 18, height / 2);
  ctx.lineTo(-width / 2 + 12, height / 2);
  ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - 12);
  ctx.lineTo(-width / 2, -height / 2 + 12);
  ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + 12, -height / 2);
  ctx.closePath();
  ctx.fillStyle = placed.active ? "rgba(255, 251, 238, 0.96)" : "rgba(244, 239, 228, 0.82)";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = withAlpha(color, 0.28 + chorus * 0.16);
  ctx.beginPath();
  ctx.ellipse(width * 0.29, -height * 0.18, width * 0.17 + placed.pulse * 5, height * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(color, placed.active ? 0.9 : 0.54);
  ctx.lineWidth = placed.active ? 1.9 : 1;
  roundedRectPath(ctx, -width / 2, -height / 2, width, height, 10);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#26324c";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  fitText(ctx, placed.card.label, -width / 2 + 12, -height * 0.08, width - 28, Math.min(17, height * 0.42), 11, "600");
  ctx.fillStyle = "rgba(38, 50, 76, 0.58)";
  fitText(ctx, placed.card.short, -width / 2 + 12, height * 0.25, width - 28, 10, 8);

  if (placed.pulse > 0.18) {
    ctx.globalAlpha = 0.2 + placed.pulse * 0.34;
    ctx.strokeStyle = withAlpha(color, 0.84);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 10, height / 2 - 7);
    ctx.lineTo(width / 2 - 14, height / 2 - 7);
    ctx.stroke();
  }

  ctx.restore();
};

const drawVoicePetals = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  placed: PlacedVoice[],
  time: number,
  chorus: number
) => {
  drawHandoffRibbons(ctx, placed, time, chorus);
  placed.forEach((voice) => drawVoicePetal(ctx, voice, content, chorus));
};

const drawFutureWash = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  time: number,
  chorus: number,
  emphasis: number
) => {
  const { width } = viewport;
  const horizonY = content.top + content.height * (0.32 - chorus * 0.035);

  ctx.save();
  ctx.globalAlpha = 0.2 + chorus * 0.32 + emphasis * 0.08;
  const bridge = ctx.createLinearGradient(content.left, horizonY, content.right, horizonY + content.height * 0.16);
  bridge.addColorStop(0, "rgba(185, 216, 255, 0)");
  bridge.addColorStop(0.38, "rgba(255, 224, 138, 0.58)");
  bridge.addColorStop(0.68, "rgba(153, 211, 190, 0.45)");
  bridge.addColorStop(1, "rgba(242, 167, 196, 0)");
  ctx.fillStyle = bridge;
  ctx.beginPath();
  ctx.moveTo(content.left - 40, horizonY + Math.sin(time * 0.09) * 8);
  ctx.bezierCurveTo(width * 0.34, horizonY - 24, width * 0.62, horizonY + 42, content.right + 50, horizonY + 6);
  ctx.lineTo(content.right + 50, horizonY + content.height * 0.16);
  ctx.bezierCurveTo(width * 0.58, horizonY + content.height * 0.11, width * 0.32, horizonY + content.height * 0.21, content.left - 40, horizonY + content.height * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.32 + chorus * 0.3;
  ctx.strokeStyle = "rgba(255, 224, 138, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 16]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath();
  ctx.moveTo(content.left - 20, horizonY + 16);
  ctx.bezierCurveTo(width * 0.28, horizonY - 8, width * 0.76, horizonY + 44, content.right + 34, horizonY + 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};

const paintPoint = (content: LayoutRect, progress: number, time: number, chorus: number): Point => ({
  x: content.left + content.width * (-0.08 + progress * 1.18),
  y:
    content.top +
    content.height * (0.49 - chorus * 0.08) +
    Math.sin(progress * Math.PI * 2.1 + time * 0.13) * content.height * 0.055 +
    Math.sin(progress * Math.PI * 5.4 - time * 0.19) * content.height * 0.014
});

const drawPaintStroke = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  time: number,
  beatPulse: number,
  chorus: number,
  breath: number
) => {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let pass = 0; pass < 3; pass += 1) {
    ctx.beginPath();
    for (let i = 0; i <= 96; i += 1) {
      const progress = i / 96;
      const point = paintPoint(content, progress, time + pass * 0.24, chorus);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.globalAlpha = [0.16, 0.44, 0.82][pass] + chorus * [0.06, 0.1, 0.12][pass];
    ctx.strokeStyle = pass === 0 ? "#f4efe4" : pass === 1 ? "#bfe9a6" : "#8cff47";
    ctx.lineWidth = [18, 11, 6][pass] + chorus * [5, 4, 3][pass] + breath * [3, 2, 1][pass];
    ctx.stroke();
  }

  ctx.globalAlpha = 0.58 + beatPulse * 0.26;
  ctx.fillStyle = "rgba(140, 255, 71, 0.9)";
  for (let i = 0; i < 16; i += 1) {
    const progress = wrap01(i / 16 + time * 0.062);
    const point = paintPoint(content, progress, time, chorus);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.sin(progress * Math.PI * 2 + time * 0.3) * 0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + beatPulse * 2, 1.8 + chorus * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tip = paintPoint(content, wrap01(time * 0.055), time, chorus);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "rgba(244, 239, 228, 0.78)";
  ctx.beginPath();
  ctx.ellipse(tip.x, tip.y, 10 + beatPulse * 3, 7, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(140, 255, 71, 0.95)";
  ctx.beginPath();
  ctx.ellipse(tip.x + 6, tip.y, 8 + beatPulse * 2, 4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawQuietCaption = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  cards: VoiceCard[],
  time: number,
  duration: number,
  chorus: number
) => {
  const progress = clamp(time / duration);
  const current = cards[Math.floor(progress * cards.length * 1.8) % cards.length];
  const left = content.left + content.width * 0.04;
  const baseY = content.bottom - Math.max(22, content.height * 0.045);
  const railStart = content.left + content.width * 0.28;
  const railEnd = content.right - content.width * 0.05;

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(244, 239, 228, 0.68)";
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.fillText("walking voice", left, baseY - 19);
  ctx.fillStyle = current ? withAlpha(current.color, 0.9) : "rgba(255, 224, 138, 0.9)";
  fitText(ctx, current?.label ?? "voice", left, baseY, content.width * 0.22, 18, 12, "600");

  ctx.globalAlpha = 0.24 + chorus * 0.28;
  ctx.strokeStyle = "#f4efe4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(railStart, baseY - 9);
  ctx.lineTo(railEnd, baseY - 9);
  ctx.stroke();
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(railStart, baseY - 9);
  ctx.lineTo(mix(railStart, railEnd, progress), baseY - 9);
  ctx.stroke();
  ctx.restore();
};

const drawTitleWhisper = (
  ctx: CanvasRenderingContext2D,
  content: LayoutRect,
  title: string,
  time: number,
  chorus: number
) => {
  ctx.save();
  ctx.globalAlpha = 0.42 + chorus * 0.18;
  ctx.fillStyle = "rgba(244, 239, 228, 0.82)";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  fitText(ctx, title, content.right - content.width * 0.04, content.top + content.height * 0.065 + Math.sin(time * 0.16) * 2, content.width * 0.34, 20, 13, "600");
  ctx.restore();
};

export const createSongApp = async (
  context: SongAdapterContext,
  services: SongAppServices
): Promise<SongApp> => {
  const { canvas, ctx } = services;
  const design = await context.assets.readDesignCues<DesignCues>();
  const cards = (design?.voiceCards?.length ? design.voiceCards : DEFAULT_VOICE_CARDS).map(safeCard);
  const sectionRanges = (design?.sections?.length ? design.sections : DEFAULT_SECTIONS)
    .map(safeRange)
    .filter((range): range is Range => Boolean(range));
  let viewport: Viewport = { width: 1, height: 1, dpr: 1 };
  const pointer = { x: 0.5, y: 0.5, active: false };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    viewport = {
      width: Math.max(320, rect.width || window.innerWidth || 320),
      height: Math.max(220, rect.height || window.innerHeight || 220),
      dpr
    };
    canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
    canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
  };

  const render = (frame: SongAppFrame) => {
    const duration = Math.max(1, context.musicMap.duration);
    const time = frame.time % duration;
    const content = contentRectFromFrame(frame, viewport);
    const beat = beatAt(time, context.musicMap.beats);
    const beatPulse = beat.pulse;
    const chorus = activeRange(time, context.musicMap.chorus);
    const section = activeRange(time, sectionRanges);
    const marker = emphasisAt(time, context.musicMap);
    const emphasis = Math.max(section, marker);
    const breath = clamp(frame.userGlow);
    const placed = placeVoices(content, cards, frame, chorus, beatPulse, pointer);

    ctx.save();
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    drawBackdrop(ctx, viewport, content, time, chorus, emphasis, breath);
    drawWindow(ctx, content, time, chorus, beatPulse);
    drawFutureWash(ctx, viewport, content, time, chorus, emphasis);
    drawPaintStroke(ctx, content, time, beatPulse, chorus, breath);
    drawLightYearTicks(ctx, content, time, beatPulse, chorus);
    drawCompanionWalk(ctx, content, time, beatPulse, chorus, emphasis);
    drawVoicePetals(ctx, content, placed, time, chorus);
    drawTitleWhisper(ctx, content, context.manifest.title, time, chorus);
    drawQuietCaption(ctx, content, cards, time, duration, chorus);
    ctx.restore();
  };

  const pointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
    pointer.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
    pointer.active = true;
  };

  return {
    id: `${context.manifest.id}:miku-paint-bridge`,
    status: "一千光年担当: miku paint bridge",
    resize,
    render,
    pointerMove,
    pointerLeave: () => {
      pointer.active = false;
    }
  };
};
