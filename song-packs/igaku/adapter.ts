import type { SongAdapterContext, SongApp, SongAppFrame, SongAppServices } from "../../system/kit";
import { activeRange, beatAt, clamp, emphasisAt, smoothstep } from "../../system/kit";

type IgakuSection = {
  id: string;
  start: number;
  end: number;
  label: string;
  paper: string;
  ink: string;
  accent: string;
  alert: string;
};

type IgakuCues = {
  schema?: string;
  stamps?: string[];
  glyphs?: string[];
  sections?: IgakuSection[];
};

type Motif = "doctor" | "false" | "body" | "signal" | "dream" | "noise";

type ChartCard = {
  lane: number;
  offset: number;
  lateral: number;
  speed: number;
  width: number;
  height: number;
  tilt: number;
  glyph: string;
  stamp: string;
  code: string;
  motif: Motif;
};

type ProjectedCard = {
  card: ChartCard;
  x: number;
  y: number;
  scale: number;
  skew: number;
  near: number;
};

const DEFAULT_STAMPS = ["FALSE-AUTH", "DREAM-FAULT", "SIGNAL-LOST", "MOTIVE-LIE", "BODY-MORPH", "RE-CHECK"];
const DEFAULT_GLYPHS = ["診", "偽", "嘘", "顔", "足", "耳", "音", "夢", "IG", "AK", "U"];
const MOTIFS: Motif[] = ["doctor", "false", "body", "signal", "dream", "noise"];
const DEFAULT_SECTIONS: IgakuSection[] = [
  {
    id: "intake",
    start: 0,
    end: 46.25,
    label: "PRETEND DOCTOR",
    paper: "#f5f2e8",
    ink: "#151515",
    accent: "#177c72",
    alert: "#f04d3f"
  },
  {
    id: "chorus",
    start: 46.25,
    end: 68.83,
    label: "RE-CHECK",
    paper: "#171717",
    ink: "#f7f0df",
    accent: "#f04d3f",
    alert: "#f0c949"
  },
  {
    id: "final",
    start: 68.83,
    end: 120.34,
    label: "SIGNAL GAP",
    paper: "#d9eee8",
    ink: "#0c0e12",
    accent: "#2b62ba",
    alert: "#f04d3f"
  }
];

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const isSection = (value: unknown): value is IgakuSection => {
  if (!value || typeof value !== "object") return false;
  const section = value as Partial<IgakuSection>;
  return (
    typeof section.id === "string" &&
    isFiniteNumber(section.start) &&
    isFiniteNumber(section.end) &&
    typeof section.label === "string" &&
    typeof section.paper === "string" &&
    typeof section.ink === "string" &&
    typeof section.accent === "string" &&
    typeof section.alert === "string"
  );
};

const normalizeCues = (value: IgakuCues | null | undefined): Required<IgakuCues> => {
  const sections = Array.isArray(value?.sections)
    ? value.sections.filter(isSection).filter((section) => section.end > section.start)
    : [];
  const stamps = Array.isArray(value?.stamps)
    ? value.stamps.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  const glyphs = Array.isArray(value?.glyphs)
    ? value.glyphs.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  return {
    schema: value?.schema ?? "music-effect.igaku-cues.v1",
    stamps: stamps.length ? stamps : DEFAULT_STAMPS,
    glyphs: glyphs.length ? glyphs : DEFAULT_GLYPHS,
    sections: sections.length ? sections.sort((a, b) => a.start - b.start) : DEFAULT_SECTIONS
  };
};

const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

const pick = <T>(items: T[], index: number) => items[((index % items.length) + items.length) % items.length];

const makeCards = (glyphs: string[], stamps: string[]) => {
  const random = createRng(0x1a9a4d);
  const cards: ChartCard[] = [];
  for (let index = 0; index < 44; index += 1) {
    cards.push({
      lane: index % 7,
      offset: random(),
      lateral: random(),
      speed: 0.72 + random() * 0.74,
      width: 126 + random() * 128,
      height: 58 + random() * 48,
      tilt: (random() - 0.5) * 0.08,
      glyph: pick(glyphs, index + Math.floor(random() * glyphs.length)),
      stamp: pick(stamps, index + Math.floor(random() * stamps.length)),
      code: `${(0x2300 + index * 37).toString(16).toUpperCase()}-${Math.floor(random() * 900 + 100)}`,
      motif: pick(MOTIFS, index + Math.floor(random() * MOTIFS.length))
    });
  }
  return cards;
};

const getSection = (sections: IgakuSection[], time: number) =>
  sections.find((section) => time >= section.start && time < section.end) ?? sections[sections.length - 1];

const phaseIn = (section: IgakuSection, time: number) => clamp((time - section.start) / (section.end - section.start));

const setFont = (ctx: CanvasRenderingContext2D, weight: number, size: number, family = "Segoe UI, sans-serif") => {
  ctx.font = `${weight} ${size}px ${family}`;
};

const drawCutRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cut: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + height - cut);
  ctx.lineTo(x + width - cut, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
};

const drawQuad = (
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
) => {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
};

const drawPerspectiveRoom = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  time: number,
  beatPulse: number,
  chorus: number,
  pointerX: number,
  pointerY: number
) => {
  const vanishingX = width * (0.51 + (pointerX - 0.5) * 0.1);
  const horizon = height * (0.31 + (pointerY - 0.5) * 0.04);
  const alertMix = smoothstep(0.18, 0.9, chorus);

  ctx.fillStyle = section.paper;
  ctx.fillRect(0, 0, width, height);

  const backW = width * 0.48;
  const backH = height * 0.36;
  const backX = vanishingX - backW * 0.5;
  const backY = horizon - backH * 0.42;

  ctx.save();
  ctx.fillStyle = section.ink;
  ctx.globalAlpha = 0.1 + alertMix * 0.12;
  drawQuad(ctx, 0, 0, backX, backY, backX, backY + backH, 0, height);
  ctx.fill();
  drawQuad(ctx, width, 0, backX + backW, backY, backX + backW, backY + backH, width, height);
  ctx.fill();
  ctx.globalAlpha = 0.08 + beatPulse * 0.08;
  ctx.fillRect(backX, backY, backW, backH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = section.ink;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.15 + chorus * 0.08;
  const columns = 18;
  for (let index = 0; index <= columns; index += 1) {
    const x = (width * index) / columns;
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(vanishingX, horizon);
    ctx.stroke();
  }
  const rows = 12;
  for (let index = 0; index <= rows; index += 1) {
    const t = index / rows;
    const y = horizon + Math.pow(t, 1.9) * (height - horizon);
    const inset = (1 - t) * width * 0.34;
    ctx.beginPath();
    ctx.moveTo(inset, y + Math.sin(time * 9 + index) * beatPulse * 2);
    ctx.lineTo(width - inset, y - Math.sin(time * 8 + index) * beatPulse * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = section.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.32 + beatPulse * 0.22;
  for (let index = 0; index < 6; index += 1) {
    const x = width * (0.08 + index * 0.17);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(vanishingX + (x - width * 0.5) * 0.12, horizon + 18);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = alertMix > 0.5 ? section.alert : section.accent;
  ctx.globalAlpha = 0.13 + beatPulse * 0.04;
  ctx.fillRect(0, Math.max(0, horizon - 10), width, 18 + chorus * 16);
  ctx.restore();
};

const drawBackMonitors = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  time: number,
  beatPulse: number,
  chorus: number,
  phase: number
) => {
  const panels = [
    { x: 0.18, y: 0.18, w: 0.19, h: 0.13, label: "FALSE / SELF", motif: "false" as Motif },
    { x: 0.55, y: 0.13, w: 0.22, h: 0.15, label: "BODY MORPH", motif: "body" as Motif },
    { x: 0.35, y: 0.35, w: 0.2, h: 0.12, label: "SIGNAL GAP", motif: "signal" as Motif }
  ];

  for (const panel of panels) {
    const x = width * panel.x + Math.sin(time * 1.7 + panel.x * 9) * 4;
    const y = height * panel.y;
    const w = width * panel.w;
    const h = height * panel.h;
    const skew = (panel.x - 0.5) * 22;

    ctx.save();
    ctx.globalAlpha = 0.82;
    drawQuad(ctx, x, y, x + w, y + skew * 0.18, x + w, y + h + skew * 0.18, x, y + h);
    ctx.fillStyle = chorus > 0.4 ? section.ink : section.paper;
    ctx.fill();
    ctx.strokeStyle = chorus > 0.4 ? section.alert : section.ink;
    ctx.lineWidth = 2 + beatPulse * 2;
    ctx.stroke();

    ctx.fillStyle = section.alert;
    ctx.globalAlpha = 0.72 + beatPulse * 0.18;
    ctx.fillRect(x + 10, y + 10, Math.max(12, w * (0.18 + phase * 0.46)), 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = chorus > 0.4 ? section.paper : section.ink;
    setFont(ctx, 800, Math.max(10, Math.min(16, w * 0.08)));
    ctx.textAlign = "left";
    ctx.fillText(panel.label, x + 10, y + h - 14);
    drawMotif(ctx, panel.motif, section, x + w * 0.5, y + h * 0.48, Math.min(w, h) * 0.5, beatPulse, chorus);
    ctx.restore();
  }
};

const drawPulseRulers = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  time: number,
  beatIndex: number,
  beatPulse: number
) => {
  const barHeight = Math.max(28, Math.min(46, height * 0.06));
  ctx.fillStyle = section.ink;
  ctx.fillRect(0, 0, width, barHeight);
  ctx.fillRect(0, height - barHeight, width, barHeight);

  ctx.strokeStyle = section.paper;
  ctx.lineWidth = 2;
  const tickGap = Math.max(18, width / 54);
  const offset = (time * 92) % tickGap;
  for (let x = -tickGap; x < width + tickGap; x += tickGap) {
    const tall = Math.round((x + offset) / tickGap + beatIndex) % 4 === 0;
    const h = tall ? barHeight * 0.72 : barHeight * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - offset, barHeight);
    ctx.lineTo(x - offset, barHeight - h - beatPulse * 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + offset, height - barHeight);
    ctx.lineTo(x + offset, height - barHeight + h + beatPulse * 7);
    ctx.stroke();
  }
};

const drawSideIndex = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  time: number,
  emphasis: number,
  chorus: number
) => {
  const panelWidth = Math.max(92, Math.min(146, width * 0.13));
  const x = width * 0.025;
  const y = height * 0.15;
  const panelHeight = height * 0.72;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, -0.04, -0.08, 1, 0, 0);

  ctx.fillStyle = section.ink;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(12, 18, panelWidth, panelHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = chorus > 0.45 ? section.ink : section.paper;
  ctx.fillRect(0, 0, panelWidth, panelHeight);
  ctx.strokeStyle = section.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, panelWidth, panelHeight);

  ctx.fillStyle = chorus > 0.45 ? section.paper : section.ink;
  setFont(ctx, 900, Math.max(18, panelWidth * 0.23));
  ctx.textAlign = "center";
  ctx.fillText("I", panelWidth * 0.5, 42);
  ctx.fillText("GA", panelWidth * 0.5, 80);
  ctx.fillText("KU", panelWidth * 0.5, 118);

  ctx.strokeStyle = section.accent;
  ctx.lineWidth = 3 + emphasis * 4;
  ctx.beginPath();
  const centerX = panelWidth * 0.52;
  const top = panelHeight * 0.28;
  ctx.moveTo(centerX - 22, top);
  ctx.bezierCurveTo(centerX - 42, top + 34, centerX + 34, top + 58, centerX + 8, top + 96);
  ctx.bezierCurveTo(centerX - 24, top + 134, centerX + 36, top + 168, centerX - 10, top + 208);
  ctx.stroke();

  ctx.fillStyle = section.alert;
  ctx.globalAlpha = 0.86;
  const sampleY = top + 236 + Math.sin(time * 12) * 8;
  ctx.fillRect(centerX - 34, sampleY, 68, 8 + emphasis * 12);
  ctx.restore();
};

const drawExamTable = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  beatPulse: number,
  chorus: number
) => {
  const topY = height * 0.66;
  const bottomY = height * 0.88;
  const leftTop = width * 0.22;
  const rightTop = width * 0.78;
  const leftBottom = width * 0.06;
  const rightBottom = width * 0.94;

  ctx.save();
  ctx.globalAlpha = 0.32 + chorus * 0.16;
  drawQuad(ctx, leftTop, topY, rightTop, topY, rightBottom, bottomY, leftBottom, bottomY);
  ctx.fillStyle = section.ink;
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = section.accent;
  ctx.lineWidth = 2 + beatPulse * 2;
  ctx.stroke();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = section.alert;
  drawQuad(
    ctx,
    leftTop + width * 0.18,
    topY + 10,
    rightTop - width * 0.18,
    topY + 10,
    rightBottom - width * 0.32,
    bottomY - 24,
    leftBottom + width * 0.32,
    bottomY - 24
  );
  ctx.fill();
  ctx.restore();
};

const drawMotif = (
  ctx: CanvasRenderingContext2D,
  motif: Motif,
  section: IgakuSection,
  x: number,
  y: number,
  size: number,
  beatPulse: number,
  chorus: number
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.strokeStyle = section.alert;
  ctx.fillStyle = section.alert;
  ctx.globalAlpha = 0.74 + beatPulse * 0.18;

  if (motif === "doctor") {
    ctx.beginPath();
    ctx.arc(0, -size * 0.18, size * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, size * 0.28);
    ctx.lineTo(0, size * 0.02);
    ctx.lineTo(size * 0.22, size * 0.28);
    ctx.stroke();
    ctx.fillRect(-size * 0.06, -size * 0.38, size * 0.12, size * 0.06);
    ctx.fillRect(-size * 0.025, -size * 0.43, size * 0.05, size * 0.16);
  } else if (motif === "false") {
    ctx.beginPath();
    ctx.ellipse(-size * 0.08, 0, size * 0.24, size * 0.17, -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(size * 0.11, size * 0.06, size * 0.24, size * 0.17, 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(-size * 0.22, -size * 0.04, size * 0.12, size * 0.05);
    ctx.fillRect(size * 0.04, size * 0.02, size * 0.12, size * 0.05);
  } else if (motif === "body") {
    ctx.strokeRect(-size * 0.3, -size * 0.22, size * 0.25, size * 0.25);
    ctx.beginPath();
    ctx.moveTo(-size * 0.02, -size * 0.08);
    ctx.lineTo(size * 0.15, -size * 0.08);
    ctx.lineTo(size * 0.07, -size * 0.18);
    ctx.moveTo(size * 0.15, -size * 0.08);
    ctx.lineTo(size * 0.07, size * 0.02);
    ctx.stroke();
    ctx.fillRect(size * 0.2, -size * 0.2, size * 0.16, size * 0.32);
  } else if (motif === "signal") {
    setFont(ctx, 900, size * 0.42);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("耳", -size * 0.18, -size * 0.02);
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.arc(size * 0.05, 0, size * (0.14 + index * 0.09), -0.7, 0.7);
      ctx.stroke();
    }
    ctx.fillRect(size * 0.22, -size * 0.32, size * 0.07, size * 0.64);
  } else if (motif === "dream") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, 0);
    ctx.bezierCurveTo(-size * 0.12, -size * 0.22, size * 0.14, -size * 0.22, size * 0.34, 0);
    ctx.bezierCurveTo(size * 0.12, size * 0.18, -size * 0.16, size * 0.18, -size * 0.34, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.07 + chorus * 0.04), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    for (let step = 0; step <= 10; step += 1) {
      const px = -size * 0.35 + (size * 0.7 * step) / 10;
      const py = Math.sin(step * 1.7 + beatPulse * 4) * size * 0.14;
      if (step === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillRect(-size * 0.32, size * 0.22, size * 0.64, size * 0.08);
  }

  ctx.restore();
};

const drawCard = (
  ctx: CanvasRenderingContext2D,
  projected: ProjectedCard,
  section: IgakuSection,
  beatPulse: number,
  chorus: number,
  cardIndex: number
) => {
  const { card, x, y, scale, skew, near } = projected;
  const width = card.width * scale;
  const height = card.height * scale;
  const cut = Math.min(20, height * 0.25);
  const frontPaper = chorus > 0.65 ? section.ink : section.paper;
  const frontInk = chorus > 0.65 ? section.paper : section.ink;
  const thickness = (8 + near * 18 + beatPulse * 8) * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(card.tilt + Math.sin(cardIndex * 2.1) * beatPulse * 0.025);
  ctx.transform(1, skew * 0.08, skew * -0.05, 1, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.18 + near * 0.18;
  ctx.fillStyle = section.ink;
  drawCutRect(ctx, -width * 0.5 + thickness * 1.1, -height * 0.5 + thickness * 1.3, width, height, cut);
  ctx.fill();
  ctx.restore();

  for (let layer = 3; layer >= 1; layer -= 1) {
    ctx.save();
    ctx.translate(thickness * layer * 0.18, thickness * layer * 0.22);
    ctx.globalAlpha = 0.28;
    drawCutRect(ctx, -width * 0.5, -height * 0.5, width, height, cut);
    ctx.fillStyle = section.ink;
    ctx.fill();
    ctx.restore();
  }

  drawCutRect(ctx, -width * 0.5, -height * 0.5, width, height, cut);
  ctx.fillStyle = frontPaper;
  ctx.fill();
  ctx.strokeStyle = frontInk;
  ctx.lineWidth = 2 + near * 1.2;
  ctx.stroke();

  ctx.fillStyle = section.accent;
  ctx.fillRect(-width * 0.5, -height * 0.5, width * (0.17 + beatPulse * 0.14), height);

  drawMotif(ctx, card.motif, section, width * 0.07, height * 0.04, Math.min(width, height) * 0.58, beatPulse, chorus);

  ctx.fillStyle = frontInk;
  setFont(ctx, 900, Math.max(22, height * 0.48));
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(card.glyph, -width * 0.38, -height * 0.05);

  ctx.textAlign = "right";
  setFont(ctx, 800, Math.max(10, height * 0.16));
  ctx.fillText(card.code, width * 0.42, -height * 0.3);

  ctx.strokeStyle = section.alert;
  ctx.lineWidth = 2;
  const waveLeft = -width * 0.08;
  const waveRight = width * 0.42;
  const waveY = height * 0.22;
  ctx.beginPath();
  for (let step = 0; step <= 9; step += 1) {
    const px = waveLeft + ((waveRight - waveLeft) * step) / 9;
    const spike = step % 3 === 1 ? -height * (0.13 + beatPulse * 0.2) : height * 0.07;
    if (step === 0) ctx.moveTo(px, waveY);
    else ctx.lineTo(px, waveY + spike);
  }
  ctx.stroke();

  if (chorus > 0.18 || beatPulse > 0.54 || card.motif === "false") {
    ctx.save();
    ctx.rotate(-0.08);
    ctx.strokeStyle = section.alert;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.68 + chorus * 0.24;
    ctx.strokeRect(width * 0.03, -height * 0.4, width * 0.42, height * 0.36);
    ctx.fillStyle = section.alert;
    setFont(ctx, 900, Math.max(9, height * 0.14));
    ctx.textAlign = "center";
    ctx.fillText(card.stamp, width * 0.24, -height * 0.2);
    ctx.restore();
  }

  ctx.restore();
};

const projectCards = (
  width: number,
  height: number,
  cards: ChartCard[],
  time: number,
  beatIndex: number,
  beatPulse: number,
  pointerX: number,
  pointerY: number
): ProjectedCard[] => {
  const vanishingX = width * (0.51 + (pointerX - 0.5) * 0.12);
  const horizon = height * (0.32 + (pointerY - 0.5) * 0.04);
  const projected: ProjectedCard[] = [];

  for (const card of cards) {
    const depth = (card.offset + time * card.speed * 0.052 + beatIndex * 0.0009) % 1;
    const near = 1 - depth;
    const depthEase = smoothstep(0, 1, near);
    const scale = 0.36 + depthEase * 0.9;
    const direction = card.lane % 2 === 0 ? 1 : -1;
    const lateral =
      (((card.lateral + time * card.speed * 0.028 * direction + beatIndex * 0.002) % 1) - 0.5) * width * 1.15;
    const laneShift = (card.lane - 3) * width * 0.09;
    const x = vanishingX + (lateral + laneShift) * (0.42 + scale * 0.78) + (pointerX - 0.5) * near * 36;
    const y =
      horizon +
      depthEase * height * 0.58 +
      (card.lane - 3) * 17 * scale +
      Math.sin(time * (2.2 + card.speed) + card.lane) * 5 * scale +
      beatPulse * near * (card.lane % 2 === 0 ? -15 : 15);
    projected.push({ card, x, y, scale, skew: (x - vanishingX) / width, near });
  }

  return projected.sort((a, b) => a.scale - b.scale);
};

const drawCards = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cards: ChartCard[],
  section: IgakuSection,
  time: number,
  beatIndex: number,
  beatPulse: number,
  chorus: number,
  pointerX: number,
  pointerY: number
) => {
  const projected = projectCards(width, height, cards, time, beatIndex, beatPulse, pointerX, pointerY);
  projected.forEach((card, index) => drawCard(ctx, card, section, beatPulse, chorus, index));
};

const drawScanGate = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  time: number,
  pointerX: number,
  pointerActive: boolean,
  chorus: number
) => {
  const x = pointerActive ? width * pointerX : width * (0.18 + ((time * 0.12) % 0.68));
  const gateWidth = 22 + chorus * 18;
  const topInset = width * 0.05;
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = section.alert;
  drawQuad(ctx, x - gateWidth, height * 0.13, x + gateWidth, height * 0.09, x + gateWidth * 1.7, height * 0.9, x - gateWidth * 1.7, height * 0.86);
  ctx.fill();
  ctx.strokeStyle = section.ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = section.paper;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - topInset, height * 0.1);
  ctx.lineTo(x, height * 0.5);
  ctx.lineTo(x + topInset, height * 0.9);
  ctx.stroke();

  ctx.fillStyle = section.ink;
  setFont(ctx, 800, 11);
  ctx.textAlign = "center";
  ctx.translate(x + gateWidth * 1.6, height * 0.18);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("SCAN GATE", 0, 0);
  ctx.restore();
};

const drawHeader = (
  ctx: CanvasRenderingContext2D,
  width: number,
  section: IgakuSection,
  time: number,
  beatIndex: number,
  phase: number
) => {
  const top = Math.max(34, width * 0.035);
  ctx.save();
  ctx.fillStyle = section.ink;
  setFont(ctx, 900, Math.max(18, Math.min(38, width * 0.036)));
  ctx.textAlign = "left";
  ctx.fillText(section.label, Math.max(110, width * 0.14), top);

  ctx.textAlign = "right";
  setFont(ctx, 700, Math.max(11, Math.min(15, width * 0.015)));
  const code = `CASE ${String(beatIndex).padStart(3, "0")} / ${time.toFixed(2)}s / ${(phase * 100)
    .toFixed(0)
    .padStart(3, "0")}`;
  ctx.fillText(code, width - 24, top);

  ctx.strokeStyle = section.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Math.max(110, width * 0.14), top + 12);
  ctx.lineTo(width - 24, top + 12);
  ctx.stroke();
  ctx.restore();
};

const drawFaultBands = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  section: IgakuSection,
  beatPulse: number,
  emphasis: number,
  chorus: number
) => {
  const amount = Math.ceil(3 + chorus * 4 + emphasis * 4);
  ctx.save();
  ctx.globalAlpha = 0.15 + beatPulse * 0.1;
  for (let index = 0; index < amount; index += 1) {
    const y = height * (0.18 + ((index * 0.137 + beatPulse * 0.04) % 0.66));
    const bandHeight = 8 + ((index * 7) % 17);
    const skew = (index % 2 === 0 ? 1 : -1) * width * 0.04;
    ctx.fillStyle = index % 2 === 0 ? section.accent : section.alert;
    drawQuad(
      ctx,
      width * (0.12 + (index % 3) * 0.08),
      y,
      width * (0.86 - (index % 4) * 0.06),
      y + skew * 0.02,
      width * (0.84 - (index % 4) * 0.06),
      y + bandHeight + skew * 0.02,
      width * (0.1 + (index % 3) * 0.08),
      y + bandHeight
    );
    ctx.fill();
  }
  ctx.restore();
};

export const createIgakuSongApp = async (
  context: SongAdapterContext,
  services: SongAppServices
): Promise<SongApp> => {
  const { canvas, ctx } = services;
  const cues = normalizeCues(await context.assets.readDesignCues<IgakuCues>().catch(() => null));
  const cards = makeCards(cues.glyphs, cues.stamps);
  const pointer = { x: 0.5, y: 0.5, active: false, down: false };
  const viewport = { width: 1, height: 1, dpr: 1 };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    viewport.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    viewport.width = Math.max(1, rect.width);
    viewport.height = Math.max(1, rect.height);
    canvas.width = Math.floor(viewport.width * viewport.dpr);
    canvas.height = Math.floor(viewport.height * viewport.dpr);
  };

  const render = (frame: SongAppFrame) => {
    const width = viewport.width;
    const height = viewport.height;
    const time = frame.time % context.musicMap.duration;
    const section = getSection(cues.sections, time);
    const beat = beatAt(time, context.musicMap.beats);
    const chorus = activeRange(time, context.musicMap.chorus);
    const emphasis = emphasisAt(time, context.musicMap);
    const phase = phaseIn(section, time);
    const beatPulse = clamp(beat.pulse * (1.05 + frame.userGlow * 0.18));
    const content = frame.contentRect ?? frame.safeArea ?? services.safeArea?.();
    const scene = content && content.width > 120 && content.height > 120
      ? content
      : { x: 0, y: 0, width, height };
    const sceneWidth = scene.width;
    const sceneHeight = scene.height;
    const pointerSceneX = clamp((pointer.x * width - scene.x) / Math.max(1, sceneWidth));
    const pointerSceneY = clamp((pointer.y * height - scene.y) / Math.max(1, sceneHeight));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);

    ctx.fillStyle = section.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(scene.x, scene.y);
    ctx.beginPath();
    ctx.rect(0, 0, sceneWidth, sceneHeight);
    ctx.clip();
    drawPerspectiveRoom(ctx, sceneWidth, sceneHeight, section, time, beatPulse, chorus, pointerSceneX, pointerSceneY);
    drawBackMonitors(ctx, sceneWidth, sceneHeight, section, time, beatPulse, chorus, phase);
    drawExamTable(ctx, sceneWidth, sceneHeight, section, beatPulse, chorus);
    drawCards(
      ctx,
      sceneWidth,
      sceneHeight,
      cards,
      section,
      time,
      beat.index,
      beatPulse,
      chorus,
      pointerSceneX,
      pointerSceneY
    );
    drawFaultBands(ctx, sceneWidth, sceneHeight, section, beatPulse, emphasis, chorus);
    drawScanGate(ctx, sceneWidth, sceneHeight, section, time, pointerSceneX, pointer.active || pointer.down, chorus);
    drawSideIndex(ctx, sceneWidth, sceneHeight, section, time, emphasis, chorus);
    drawPulseRulers(ctx, sceneWidth, sceneHeight, section, time, beat.index, beatPulse);
    drawHeader(ctx, sceneWidth, section, time, beat.index, phase);
    ctx.restore();

    ctx.restore();
  };

  const updatePointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
    pointer.y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
    pointer.active = true;
  };

  resize();

  return {
    id: `${context.manifest.id}:lyric-informed-diagnostic-room`,
    status: `${context.manifest.title}: lyric-informed diagnostic room adapter`,
    resize,
    render,
    pointerMove: updatePointer,
    pointerDown: (event) => {
      updatePointer(event);
      pointer.down = true;
    },
    pointerUp: () => {
      pointer.down = false;
    },
    pointerLeave: () => {
      pointer.active = false;
      pointer.down = false;
    }
  };
};
