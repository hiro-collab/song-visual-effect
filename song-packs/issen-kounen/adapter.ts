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
  { label: "first page", start: 3.04, end: 31, intensity: 0.3 },
  { label: "voice handoff", start: 31, end: 56.21, intensity: 0.52 },
  { label: "chorus ledger 1", start: 56.21, end: 79.95, intensity: 0.95 },
  { label: "folded middle", start: 100, end: 124, intensity: 0.44 },
  { label: "chorus ledger 2", start: 147.45, end: 171.19, intensity: 1 },
  { label: "future margin", start: 190, end: 229.5, intensity: 0.74 }
];

const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

const wrap01 = (value: number) => {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

const safeCard = (card: VoiceCard, index: number): VoiceCard => ({
  label: typeof card.label === "string" && card.label ? card.label : DEFAULT_VOICE_CARDS[index % DEFAULT_VOICE_CARDS.length].label,
  short: typeof card.short === "string" && card.short ? card.short : DEFAULT_VOICE_CARDS[index % DEFAULT_VOICE_CARDS.length].short,
  color: typeof card.color === "string" && /^#[0-9a-f]{6}$/i.test(card.color) ? card.color : DEFAULT_VOICE_CARDS[index % DEFAULT_VOICE_CARDS.length].color,
  lane: Number.isFinite(card.lane) ? Math.max(0, Math.floor(card.lane)) : index % 5,
  offset: Number.isFinite(card.offset) ? wrap01(card.offset) : index / DEFAULT_VOICE_CARDS.length
});

const safeRange = (section: SectionCue): Range | null => {
  if (!Number.isFinite(section.start) || !Number.isFinite(section.end) || section.end <= section.start) return null;
  return { start: section.start, end: section.end, intensity: section.intensity ?? 1 };
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

const laneY = (rect: LayoutRect, lane: number, time: number) => {
  const lanes = [0.24, 0.34, 0.44, 0.65, 0.76];
  return rect.top + rect.height * lanes[lane % lanes.length] + Math.sin(time * 0.34 + lane * 1.7) * rect.height * 0.012;
};

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const drawBackdrop = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  time: number,
  chorus: number,
  emphasis: number,
  userInk: number
) => {
  const { width, height } = viewport;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#141820");
  gradient.addColorStop(0.42, "#202235");
  gradient.addColorStop(0.68, "#1c332b");
  gradient.addColorStop(1, "#402631");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.08 + chorus * 0.08 + userInk * 0.04;
  ctx.translate(((time * -6) % 220) - 220, 0);
  for (let i = -1; i < 8; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#f4efe4" : "#99d3be";
    ctx.beginPath();
    ctx.moveTo(i * 240, height * 0.08);
    ctx.lineTo(i * 240 + 150, height * 0.02);
    ctx.lineTo(i * 240 + 330, height * 0.92);
    ctx.lineTo(i * 240 + 180, height * 0.98);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08 + emphasis * 0.08;
  ctx.fillStyle = "#ffe08a";
  for (let i = 0; i < 9; i += 1) {
    const y = height * (0.14 + i * 0.095) + Math.sin(time * 0.12 + i) * 8;
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
};

const drawDistanceMarks = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  time: number,
  beatPulse: number,
  chorus: number
) => {
  const { width } = viewport;
  const topY = content.top + content.height * 0.06;
  const bottomY = content.bottom - content.height * 0.06;
  const spacing = Math.max(44, width / 18);
  const offset = (time * (18 + chorus * 20)) % spacing;
  ctx.save();
  ctx.globalAlpha = 0.26 + chorus * 0.24;
  ctx.strokeStyle = `rgba(244, 239, 228, ${0.32 + beatPulse * 0.35})`;
  ctx.fillStyle = "rgba(244, 239, 228, 0.45)";
  ctx.lineWidth = 1;
  ctx.font = "11px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
  for (let i = -1; i <= width / spacing + 2; i += 1) {
    const x = i * spacing - offset;
    const topHeight = i % 4 === 0 ? 30 : 15;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, topY + topHeight);
    ctx.moveTo(x, bottomY);
    ctx.lineTo(x, bottomY - topHeight * 0.7);
    ctx.stroke();
    if (i % 4 === 0) ctx.fillText(String(Math.max(0, Math.floor(time + i * 8))).padStart(4, "0"), x + 5, topY + 39);
  }
  ctx.restore();
};

const drawRoutes = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  time: number,
  chorus: number,
  userInk: number
) => {
  const { width } = viewport;
  ctx.save();
  for (let lane = 0; lane < 5; lane += 1) {
    const y = laneY(content, lane, time);
    const slide = Math.sin(time * 0.18 + lane) * width * 0.025;
    ctx.beginPath();
    ctx.moveTo(-80, y + slide * 0.08);
    ctx.bezierCurveTo(width * 0.24, y - 35, width * 0.68, y + 32, width + 80, y - 10);
    ctx.strokeStyle = lane % 2 === 0 ? `rgba(244, 239, 228, ${0.12 + chorus * 0.12})` : `rgba(153, 211, 190, ${0.1 + userInk * 0.08})`;
    ctx.lineWidth = 16 + chorus * 7;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 224, 138, ${0.16 + chorus * 0.18})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([7, 12]);
    ctx.lineDashOffset = -time * (14 + lane * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
};

const drawLedger = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  time: number,
  chorus: number,
  emphasis: number,
  beatPulse: number,
  title: string
) => {
  const { width } = viewport;
  const y = mix(content.top + content.height * 0.58, content.top + content.height * 0.52, chorus);
  const ledgerHeight = mix(
    Math.max(52, Math.min(72, content.height * 0.11)),
    Math.max(82, Math.min(116, content.height * 0.19)),
    chorus
  );
  const leftLift = Math.sin(time * 0.18) * 5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-30, y - ledgerHeight * 0.48 + leftLift);
  ctx.lineTo(width + 40, y - ledgerHeight * 0.4);
  ctx.lineTo(width + 20, y + ledgerHeight * 0.48);
  ctx.lineTo(-40, y + ledgerHeight * 0.42 + leftLift);
  ctx.closePath();
  ctx.fillStyle = `rgba(244, 239, 228, ${0.12 + chorus * 0.2 + emphasis * 0.08})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 224, 138, ${0.24 + chorus * 0.22})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.globalAlpha = 0.28 + chorus * 0.25;
  ctx.strokeStyle = "#f4efe4";
  for (let i = 0; i < 18; i += 1) {
    const x = ((i / 17) * width + (time * 7) % 70) % (width + 80) - 40;
    ctx.beginPath();
    ctx.moveTo(x, y - ledgerHeight * 0.38);
    ctx.lineTo(x + 16, y + ledgerHeight * 0.34);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = `rgba(244, 239, 228, ${0.46 + chorus * 0.28})`;
  ctx.font = `${Math.max(22, Math.min(38, content.width * 0.052))}px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(title, content.left + content.width * 0.04, y - ledgerHeight * 0.08);
  ctx.font = "12px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
  ctx.fillStyle = `rgba(185, 216, 255, ${0.55 + beatPulse * 0.25})`;
  ctx.fillText(`archive ${formatTime(time)}`, content.left + content.width * 0.044, y + ledgerHeight * 0.22);
  ctx.restore();
};

const drawCard = (
  ctx: CanvasRenderingContext2D,
  card: VoiceCard,
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
  pulse: number,
  active: boolean,
  chorus: number
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 12 + chorus * 8;
  ctx.shadowOffsetY = 8;
  roundedRectPath(ctx, -width / 2, -height / 2, width, height, 5);
  ctx.fillStyle = active ? "rgba(250, 247, 235, 0.96)" : "rgba(244, 239, 228, 0.82)";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = withAlpha(card.color, 0.35 + chorus * 0.18);
  ctx.beginPath();
  ctx.moveTo(width / 2 - 30, -height / 2);
  ctx.lineTo(width / 2, -height / 2);
  ctx.lineTo(width / 2, -height / 2 + 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = active ? withAlpha(card.color, 0.94) : withAlpha(card.color, 0.58);
  ctx.lineWidth = active ? 2.2 : 1.2;
  roundedRectPath(ctx, -width / 2, -height / 2, width, height, 5);
  ctx.stroke();

  ctx.globalAlpha = 0.24 + pulse * 0.32;
  ctx.fillStyle = withAlpha(card.color, 0.75);
  ctx.fillRect(-width / 2 + 14, height / 2 - 14, width - 28, 3);

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#141820";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(15, Math.min(20, width * 0.11))}px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif`;
  ctx.fillText(card.label, -width / 2 + 16, -height * 0.08);
  ctx.font = "11px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
  ctx.fillStyle = "rgba(20, 24, 32, 0.62)";
  ctx.fillText(card.short, -width / 2 + 16, height * 0.23);

  if (pulse > 0.08) {
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.strokeStyle = withAlpha(card.color, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(width * 0.27, -height * 0.16, 15 + pulse * 9, 7 + pulse * 4, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
};

const drawCards = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  cards: VoiceCard[],
  frame: SongAppFrame,
  chorus: number,
  beatPulse: number,
  pointer: { x: number; y: number; active: boolean }
) => {
  const { width } = viewport;
  const cardWidth = Math.max(118, Math.min(188, content.width * 0.17));
  const cardHeight = Math.max(52, Math.min(74, content.height * 0.13));
  const currentIndex = Math.floor(wrap01(frame.time / 29) * cards.length);
  const pointerPull = pointer.active ? 1 : 0;

  cards.forEach((card, index) => {
    const travel = wrap01(card.offset + frame.time / (58 + (index % 5) * 6));
    const freeX = width * (1.1 - travel * 1.26);
    const freeY = laneY(content, card.lane, frame.time) + Math.sin(frame.time * 0.8 + index) * 10;
    const orderedX = content.left + content.width * (0.08 + (index / Math.max(1, cards.length - 1)) * 0.84);
    const orderedY = content.top + content.height * (0.52 + ((index % 5) - 2) * 0.034);
    const x = mix(freeX, orderedX, chorus * 0.78) + (pointer.x - 0.5) * 18 * pointerPull;
    const y = mix(freeY, orderedY, chorus * 0.82) + (pointer.y - 0.5) * 12 * pointerPull;
    const pulse = ((index + currentIndex) % 4 === 0 ? beatPulse : beatPulse * 0.35) + (index === currentIndex ? 0.2 : 0);
    const angle = mix(((index % 3) - 1) * 0.055 + Math.sin(frame.time * 0.22 + index) * 0.02, 0, chorus * 0.72);
    drawCard(ctx, card, x, y, cardWidth, cardHeight, angle, clamp(pulse), index === currentIndex, chorus);
  });
};

const drawClosingMargin = (
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  content: LayoutRect,
  cards: VoiceCard[],
  time: number,
  duration: number,
  chorus: number
) => {
  const { width } = viewport;
  const progress = clamp(time / duration);
  const current = cards[Math.floor(progress * cards.length * 2) % cards.length];
  const left = content.left + content.width * 0.035;
  const labelY = content.bottom - 42;
  const nameY = content.bottom - 18;
  const railY = content.bottom - 29;

  ctx.save();
  ctx.fillStyle = "rgba(244, 239, 228, 0.72)";
  ctx.font = "12px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("current voice card", left, labelY);
  ctx.fillStyle = current ? withAlpha(current.color, 0.9) : "rgba(255, 224, 138, 0.9)";
  ctx.font = "18px 'Yu Gothic UI', 'Yu Gothic', Meiryo, sans-serif";
  ctx.fillText(current?.label ?? "voice", left, nameY);

  ctx.globalAlpha = 0.2 + chorus * 0.34;
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(content.left + content.width * 0.23, railY);
  ctx.lineTo(Math.min(width - 16, content.left + content.width * (0.23 + progress * 0.69)), railY);
  ctx.stroke();
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
    const userInk = clamp(frame.userGlow);

    ctx.save();
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    drawBackdrop(ctx, viewport, time, chorus, Math.max(section, marker), userInk);
    drawDistanceMarks(ctx, viewport, content, time, beatPulse, chorus);
    drawRoutes(ctx, viewport, content, time, chorus, userInk);
    drawLedger(ctx, viewport, content, time, chorus, Math.max(section, marker), beatPulse, context.manifest.title);
    drawCards(ctx, viewport, content, cards, frame, chorus, beatPulse, pointer);
    drawClosingMargin(ctx, viewport, content, cards, time, duration, chorus);
    ctx.restore();
  };

  const pointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
    pointer.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
    pointer.active = true;
  };

  return {
    id: `${context.manifest.id}:paper-voice-ledger`,
    status: "一千光年担当: paper voice ledger",
    resize,
    render,
    pointerMove,
    pointerLeave: () => {
      pointer.active = false;
    }
  };
};
