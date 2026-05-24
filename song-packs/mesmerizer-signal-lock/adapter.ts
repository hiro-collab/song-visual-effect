import * as THREE from "three";
import type { SongAdapterContext, SongApp, SongAppFrame, SongAppServices, SongVisualLayer } from "../../system/kit";
import { activeRange, beatAt } from "../../system/kit";

type StagePalette = {
  void: string;
  floor: string;
  wall: string;
  screen: string;
  sky: string;
  sun: string;
  glass: string;
  ink: string;
  cyan: string;
  pink: string;
  acid: string;
  amber: string;
  violet: string;
  haze: string;
};

type StageSection = {
  name: string;
  label: string;
  start: number;
  end: number;
  density: number;
};

type StageCues = {
  palette: StagePalette;
  stageWords: string[];
  sections: StageSection[];
};

type EmotionSegment = {
  id?: string;
  section?: string;
  start: number;
  end: number;
  energy?: number;
  motion?: number;
  tension?: number;
  brightness?: number;
  release?: number;
  vocalGesture?: string;
  focus?: string;
};

type EmotionMap = {
  segments?: EmotionSegment[];
};

type DisplayMode =
  | "open"
  | "motif"
  | "motif-warning"
  | "lock"
  | "reveal"
  | "chorus"
  | "afterimage"
  | "control"
  | "rebuild"
  | "peak"
  | "release";

type CompositionSegment = {
  id?: string;
  section?: string;
  start: number;
  end: number;
  mode?: DisplayMode;
  subject?: string;
  foreground?: number;
  stage?: number;
  display?: number;
  control?: number;
  lock?: number;
  wide?: number;
  empty?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  cameraX?: number;
  lookX?: number;
  lookY?: number;
  lookZ?: number;
  screenScale?: number;
  sideScreens?: number;
  audience?: number;
  motifScale?: number;
};

type CompositionMap = {
  segments?: CompositionSegment[];
};

type SceneControls = {
  segmentId: string;
  focus: string;
  vocalGesture: string;
  energy: number;
  motion: number;
  tension: number;
  brightness: number;
  release: number;
};

type CompositionControls = {
  segmentId: string;
  mode: DisplayMode;
  subject: string;
  foreground: number;
  stage: number;
  display: number;
  control: number;
  lock: number;
  wide: number;
  empty: number;
  cameraDistance: number;
  cameraHeight: number;
  cameraX: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  screenScale: number;
  sideScreens: number;
  audience: number;
  motifScale: number;
};

type Pointer = {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
};

type DisplaySurface = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
};

type VectorSpring = {
  value: THREE.Vector3;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
};

type VerseCard = {
  group: THREE.Group;
  bodyMaterial: THREE.MeshBasicMaterial;
  glowMaterial: THREE.MeshBasicMaterial;
  trimMaterials: THREE.MeshBasicMaterial[];
  position: VectorSpring;
  rotation: VectorSpring;
  scale: VectorSpring;
};

type ScanMotif = {
  group: THREE.Group;
  barMaterial: THREE.MeshBasicMaterial;
  glowMaterial: THREE.MeshBasicMaterial;
  trimMaterials: THREE.MeshBasicMaterial[];
  position: VectorSpring;
  rotation: VectorSpring;
  scale: VectorSpring;
};

const DEFAULT_PALETTE: StagePalette = {
  void: "#4AD8FF",
  floor: "#0B2033",
  wall: "#18DFFF",
  screen: "#FFFFFF",
  sky: "#4AD8FF",
  sun: "#FFF200",
  glass: "#00F0FF",
  ink: "#080817",
  cyan: "#00E5FF",
  pink: "#FF2DB2",
  acid: "#B6FF00",
  amber: "#FFD400",
  violet: "#4D32FF",
  haze: "#E8FBFF"
};

const DEFAULT_SECTIONS: StageSection[] = [
  { name: "intro", label: "OPEN", start: 0, end: 12.03, density: 0.34 },
  { name: "verse-a", label: "SIGNAL", start: 12.03, end: 22.4, density: 0.48 },
  { name: "verse-b", label: "TRACE", start: 22.4, end: 32.77, density: 0.58 },
  { name: "verse-lock", label: "LOCK", start: 32.77, end: 43.15, density: 0.68 },
  { name: "pre-chorus", label: "WAKE", start: 43.15, end: 45.41, density: 0.76 },
  { name: "chorus-a", label: "LIGHTS", start: 45.41, end: 70.37, density: 0.96 },
  { name: "post-chorus", label: "AFTER", start: 70.37, end: 79.68, density: 0.64 },
  { name: "interlude", label: "CONTROL", start: 79.68, end: 100.16, density: 0.7 },
  { name: "rebuild", label: "REBUILD", start: 100.16, end: 120.62, density: 0.78 },
  { name: "chorus-b", label: "STROBE", start: 120.62, end: 145.58, density: 1 },
  { name: "outro", label: "RELEASE", start: 145.58, end: 156.97, density: 0.46 }
];

const DEFAULT_WORDS = ["FOCUS", "SYNC", "WAIT", "RETRY", "SOS", "NO SIG", "LOCK", "000"];

const clampBetween = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clampBetween((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const sectionPresence = (time: number, section: StageSection, fadeSeconds = 0.7) =>
  Math.min(smoothstep(section.start, section.start + fadeSeconds, time), 1 - smoothstep(section.end - fadeSeconds, section.end, time));

const isVerseSection = (section: StageSection) =>
  section.name === "verse-a" || section.name === "verse-b" || section.name === "verse-lock" || section.name === "pre-chorus";

const verseStep = (section: StageSection) => {
  if (section.name === "verse-b") return 1;
  if (section.name === "verse-lock" || section.name === "pre-chorus") return 2;
  return 0;
};

const isChorusSection = (section: StageSection) => section.name === "chorus-a" || section.name === "chorus-b";

const makeSpring = (x = 0, y = 0, z = 0): VectorSpring => ({
  value: new THREE.Vector3(x, y, z),
  velocity: new THREE.Vector3(),
  target: new THREE.Vector3(x, y, z)
});

const advanceSpring = (spring: VectorSpring, dt: number, stiffness: number, damping: number, snap = false) => {
  if (snap) {
    spring.value.copy(spring.target);
    spring.velocity.set(0, 0, 0);
    return;
  }
  const acceleration = spring.target.clone().sub(spring.value).multiplyScalar(stiffness).addScaledVector(spring.velocity, -damping);
  spring.velocity.addScaledVector(acceleration, dt);
  spring.value.addScaledVector(spring.velocity, dt);
};

const resolveCues = (value: Partial<StageCues> | null): StageCues => ({
  palette: { ...DEFAULT_PALETTE, ...(value?.palette ?? {}) },
  stageWords: value?.stageWords?.length ? value.stageWords : DEFAULT_WORDS,
  sections: value?.sections?.length ? value.sections : DEFAULT_SECTIONS
});

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const resolveEmotionMap = (value: EmotionMap | null): EmotionMap => ({
  segments: (value?.segments ?? [])
    .filter((segment) => isFiniteNumber(segment.start) && isFiniteNumber(segment.end) && segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
});

const resolveCompositionMap = (value: CompositionMap | null): CompositionMap => ({
  segments: (value?.segments ?? [])
    .filter((segment) => isFiniteNumber(segment.start) && isFiniteNumber(segment.end) && segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
});

const sectionFocus = (section: StageSection) => {
  if (section.name === "verse-a") return "CENTER FOCUS";
  if (section.name === "verse-b") return "RIGHT SIGNAL";
  if (section.name === "verse-lock" || section.name === "pre-chorus") return "CENTER LOCK";
  if (section.name === "chorus-a" || section.name === "chorus-b") return "FOCUS LINE";
  if (section.name === "interlude") return "SCAN LOOP";
  if (section.name === "rebuild") return "SYNC RAMP";
  if (section.name === "outro") return "RELEASE LINE";
  return "SIGNAL WAVE";
};

const segmentToControls = (segment: EmotionSegment | null, section: StageSection): SceneControls => {
  const baseEnergy = clampBetween(section.density, 0, 1);
  return {
    segmentId: segment?.id ?? section.name,
    focus: segment?.focus ?? sectionFocus(section),
    vocalGesture: segment?.vocalGesture ?? section.name,
    energy: clampBetween(segment?.energy ?? baseEnergy, 0, 1),
    motion: clampBetween(segment?.motion ?? baseEnergy * 0.72, 0, 1),
    tension: clampBetween(segment?.tension ?? 0.36 + baseEnergy * 0.28, 0, 1),
    brightness: clampBetween(segment?.brightness ?? 0.78 + baseEnergy * 0.16, 0, 1),
    release: clampBetween(segment?.release ?? (section.name === "outro" ? 0.55 : 0.08), 0, 1)
  };
};

const blendControls = (from: SceneControls, to: SceneControls, amount: number): SceneControls => ({
  segmentId: amount > 0.5 ? to.segmentId : from.segmentId,
  focus: amount > 0.5 ? to.focus : from.focus,
  vocalGesture: amount > 0.5 ? to.vocalGesture : from.vocalGesture,
  energy: lerp(from.energy, to.energy, amount),
  motion: lerp(from.motion, to.motion, amount),
  tension: lerp(from.tension, to.tension, amount),
  brightness: lerp(from.brightness, to.brightness, amount),
  release: lerp(from.release, to.release, amount)
});

const sampleEmotionMap = (time: number, map: EmotionMap, section: StageSection): SceneControls => {
  const segments = map.segments ?? [];
  const activeIndex = segments.findIndex((segment) => time >= segment.start && time < segment.end);
  if (activeIndex < 0) return segmentToControls(null, section);

  const active = segments[activeIndex];
  let controls = segmentToControls(active, section);
  const edgeSeconds = 0.9;
  const previous = segments[activeIndex - 1];
  const next = segments[activeIndex + 1];

  if (previous && time < active.start + edgeSeconds) {
    controls = blendControls(segmentToControls(previous, section), controls, smoothstep(active.start, active.start + edgeSeconds, time));
  }
  if (next && time > active.end - edgeSeconds) {
    controls = blendControls(controls, segmentToControls(next, section), smoothstep(active.end - edgeSeconds, active.end, time));
  }
  return controls;
};

const defaultCompositionForSection = (section: StageSection): CompositionControls => {
  if (section.name === "verse-a" || section.name === "verse-b") {
    return {
      segmentId: section.name,
      mode: section.name === "verse-b" ? "motif-warning" : "motif",
      subject: "two foreground motifs",
      foreground: 0.78,
      stage: 0.26,
      display: 0.25,
      control: section.name === "verse-b" ? 0.2 : 0.08,
      lock: section.name === "verse-b" ? 0.26 : 0.18,
      wide: 0.12,
      empty: 0.02,
      cameraDistance: 5.85,
      cameraHeight: 3.08,
      cameraX: section.name === "verse-b" ? 0.12 : 0,
      lookX: 0,
      lookY: 2.78,
      lookZ: -1.9,
      screenScale: 0.78,
      sideScreens: 0.22,
      audience: 0.14,
      motifScale: 1.18
    };
  }
  if (section.name === "verse-lock") {
    return {
      segmentId: section.name,
      mode: "lock",
      subject: "central hypnotic lock",
      foreground: 0.44,
      stage: 0.2,
      display: 0.78,
      control: 0.18,
      lock: 0.86,
      wide: 0.06,
      empty: 0.02,
      cameraDistance: 6.35,
      cameraHeight: 3.28,
      cameraX: 0,
      lookX: 0,
      lookY: 3.22,
      lookZ: -4.3,
      screenScale: 1.28,
      sideScreens: 0.14,
      audience: 0.08,
      motifScale: 0.86
    };
  }
  if (section.name === "pre-chorus") {
    return {
      segmentId: section.name,
      mode: "reveal",
      subject: "pull from symbols to stage",
      foreground: 0.32,
      stage: 0.62,
      display: 0.62,
      control: 0.2,
      lock: 0.5,
      wide: 0.48,
      empty: 0,
      cameraDistance: 8.35,
      cameraHeight: 3.85,
      cameraX: 0,
      lookX: 0,
      lookY: 3,
      lookZ: -3.6,
      screenScale: 1.08,
      sideScreens: 0.48,
      audience: 0.36,
      motifScale: 0.84
    };
  }
  if (section.name === "chorus-a" || section.name === "chorus-b") {
    const peak = section.name === "chorus-b";
    return {
      segmentId: section.name,
      mode: peak ? "peak" : "chorus",
      subject: peak ? "maximum bright show" : "wide bright show",
      foreground: 0.02,
      stage: peak ? 1 : 0.92,
      display: peak ? 0.82 : 0.7,
      control: peak ? 0.26 : 0.1,
      lock: peak ? 0.54 : 0.34,
      wide: peak ? 1 : 0.96,
      empty: 0,
      cameraDistance: peak ? 9.25 : 9.55,
      cameraHeight: peak ? 4.35 : 4.25,
      cameraX: 0,
      lookX: 0,
      lookY: peak ? 3.02 : 2.95,
      lookZ: peak ? -2.58 : -2.65,
      screenScale: peak ? 1.1 : 1.04,
      sideScreens: peak ? 0.96 : 0.88,
      audience: peak ? 1 : 0.92,
      motifScale: 0.6
    };
  }
  if (section.name === "post-chorus") {
    return {
      segmentId: section.name,
      mode: "afterimage",
      subject: "afterimage and space",
      foreground: 0.08,
      stage: 0.38,
      display: 0.38,
      control: 0.12,
      lock: 0.28,
      wide: 0.7,
      empty: 0.72,
      cameraDistance: 11.15,
      cameraHeight: 4.5,
      cameraX: -0.15,
      lookX: 0,
      lookY: 2.65,
      lookZ: -2.85,
      screenScale: 0.82,
      sideScreens: 0.32,
      audience: 0.34,
      motifScale: 0.58
    };
  }
  if (section.name === "interlude") {
    return {
      segmentId: section.name,
      mode: "control",
      subject: "control and distress signal",
      foreground: 0.24,
      stage: 0.3,
      display: 0.86,
      control: 0.94,
      lock: 0.46,
      wide: 0.22,
      empty: 0.08,
      cameraDistance: 7.35,
      cameraHeight: 3.55,
      cameraX: 0,
      lookX: 0,
      lookY: 3.35,
      lookZ: -4.8,
      screenScale: 1.42,
      sideScreens: 0.7,
      audience: 0.18,
      motifScale: 0.78
    };
  }
  if (section.name === "rebuild") {
    return {
      segmentId: section.name,
      mode: "rebuild",
      subject: "show graphics reassembling",
      foreground: 0.12,
      stage: 0.62,
      display: 0.69,
      control: 0.36,
      lock: 0.39,
      wide: 0.56,
      empty: 0.04,
      cameraDistance: 8.9,
      cameraHeight: 4.02,
      cameraX: 0,
      lookX: 0,
      lookY: 3.02,
      lookZ: -3.35,
      screenScale: 1.06,
      sideScreens: 0.67,
      audience: 0.52,
      motifScale: 0.65
    };
  }
  if (section.name === "outro") {
    return {
      segmentId: section.name,
      mode: "release",
      subject: "far bright venue",
      foreground: 0.02,
      stage: 0.48,
      display: 0.38,
      control: 0.08,
      lock: 0.16,
      wide: 0.88,
      empty: 0.58,
      cameraDistance: 12.2,
      cameraHeight: 4.75,
      cameraX: 0.26,
      lookX: 0,
      lookY: 2.55,
      lookZ: -2.35,
      screenScale: 0.82,
      sideScreens: 0.28,
      audience: 0.26,
      motifScale: 0.52
    };
  }
  return {
    segmentId: section.name,
    mode: "open",
    subject: "daytime cyber venue",
    foreground: 0.04,
    stage: 0.72,
    display: 0.52,
    control: 0.04,
    lock: 0.12,
    wide: 0.86,
    empty: 0.12,
    cameraDistance: 10.7,
    cameraHeight: 4.1,
    cameraX: 0,
    lookX: 0,
    lookY: 2.7,
    lookZ: -2.4,
    screenScale: 1.02,
    sideScreens: 0.74,
    audience: 0.58,
    motifScale: 0.72
  };
};

const segmentToComposition = (segment: CompositionSegment | null, section: StageSection): CompositionControls => {
  const base = defaultCompositionForSection(section);
  return {
    ...base,
    segmentId: segment?.id ?? base.segmentId,
    mode: segment?.mode ?? base.mode,
    subject: segment?.subject ?? base.subject,
    foreground: clampBetween(segment?.foreground ?? base.foreground, 0, 1),
    stage: clampBetween(segment?.stage ?? base.stage, 0, 1),
    display: clampBetween(segment?.display ?? base.display, 0, 1),
    control: clampBetween(segment?.control ?? base.control, 0, 1),
    lock: clampBetween(segment?.lock ?? base.lock, 0, 1),
    wide: clampBetween(segment?.wide ?? base.wide, 0, 1),
    empty: clampBetween(segment?.empty ?? base.empty, 0, 1),
    cameraDistance: clampBetween(segment?.cameraDistance ?? base.cameraDistance, 4.6, 14),
    cameraHeight: clampBetween(segment?.cameraHeight ?? base.cameraHeight, 2.4, 5.8),
    cameraX: clampBetween(segment?.cameraX ?? base.cameraX, -2.4, 2.4),
    lookX: clampBetween(segment?.lookX ?? base.lookX, -2.4, 2.4),
    lookY: clampBetween(segment?.lookY ?? base.lookY, 1.6, 4.8),
    lookZ: clampBetween(segment?.lookZ ?? base.lookZ, -5.8, 0.8),
    screenScale: clampBetween(segment?.screenScale ?? base.screenScale, 0.56, 1.62),
    sideScreens: clampBetween(segment?.sideScreens ?? base.sideScreens, 0, 1),
    audience: clampBetween(segment?.audience ?? base.audience, 0, 1),
    motifScale: clampBetween(segment?.motifScale ?? base.motifScale, 0.46, 1.36)
  };
};

const blendComposition = (from: CompositionControls, to: CompositionControls, amount: number): CompositionControls => ({
  segmentId: amount > 0.5 ? to.segmentId : from.segmentId,
  mode: amount > 0.5 ? to.mode : from.mode,
  subject: amount > 0.5 ? to.subject : from.subject,
  foreground: lerp(from.foreground, to.foreground, amount),
  stage: lerp(from.stage, to.stage, amount),
  display: lerp(from.display, to.display, amount),
  control: lerp(from.control, to.control, amount),
  lock: lerp(from.lock, to.lock, amount),
  wide: lerp(from.wide, to.wide, amount),
  empty: lerp(from.empty, to.empty, amount),
  cameraDistance: lerp(from.cameraDistance, to.cameraDistance, amount),
  cameraHeight: lerp(from.cameraHeight, to.cameraHeight, amount),
  cameraX: lerp(from.cameraX, to.cameraX, amount),
  lookX: lerp(from.lookX, to.lookX, amount),
  lookY: lerp(from.lookY, to.lookY, amount),
  lookZ: lerp(from.lookZ, to.lookZ, amount),
  screenScale: lerp(from.screenScale, to.screenScale, amount),
  sideScreens: lerp(from.sideScreens, to.sideScreens, amount),
  audience: lerp(from.audience, to.audience, amount),
  motifScale: lerp(from.motifScale, to.motifScale, amount)
});

const sampleCompositionMap = (time: number, map: CompositionMap, section: StageSection): CompositionControls => {
  const segments = map.segments ?? [];
  const activeIndex = segments.findIndex((segment) => time >= segment.start && time < segment.end);
  if (activeIndex < 0) return segmentToComposition(null, section);

  const active = segments[activeIndex];
  let controls = segmentToComposition(active, section);
  const edgeSeconds = Math.min(1.2, Math.max(0.45, (active.end - active.start) * 0.18));
  const previous = segments[activeIndex - 1];
  const next = segments[activeIndex + 1];

  if (previous && time < active.start + edgeSeconds) {
    controls = blendComposition(segmentToComposition(previous, section), controls, smoothstep(active.start, active.start + edgeSeconds, time));
  }
  if (next && time > active.end - edgeSeconds) {
    controls = blendComposition(controls, segmentToComposition(next, section), smoothstep(active.end - edgeSeconds, active.end, time));
  }
  return controls;
};

const modeFooterWord = (composition: CompositionControls, controls: SceneControls) => {
  if (composition.mode === "control") return "SCAN";
  if (composition.mode === "rebuild") return "RETRY";
  if (composition.mode === "release") return "RELEASE";
  if (composition.mode === "lock" || composition.lock > 0.74) return "LOCK";
  if (composition.mode === "peak" && controls.tension > 0.72) return "NO SIG";
  if (composition.mode === "motif-warning" || controls.tension > 0.74) return "SOS";
  if (composition.mode === "motif") return "SYNC";
  return "FOCUS";
};

const findSection = (time: number, sections: StageSection[]) =>
  sections.find((section) => time >= section.start && time < section.end) ?? sections[sections.length - 1] ?? DEFAULT_SECTIONS[0];

const color = (value: string) => new THREE.Color(value);

const makeDisplaySurface = (width: number, height: number): DisplaySurface => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Display texture canvas is unavailable");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, context, texture };
};

const fill = (
  context: CanvasRenderingContext2D,
  fillStyle: string | CanvasGradient | CanvasPattern,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  context.fillStyle = fillStyle;
  context.fillRect(x, y, width, height);
};

const drawLabel = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fillStyle: string,
  align: CanvasTextAlign = "center",
  strokeStyle = "rgba(8,8,23,0.86)"
) => {
  context.save();
  context.fillStyle = fillStyle;
  context.strokeStyle = strokeStyle;
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, size * 0.09);
  context.textAlign = align;
  context.textBaseline = "middle";
  context.font = `800 ${size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.strokeText(text, x, y);
  context.fillText(text, x, y);
  context.restore();
};

const drawMainDisplay = (
  surface: DisplaySurface,
  time: number,
  beatIndex: number,
  pulse: number,
  chorus: number,
  interference: number,
  section: StageSection,
  controls: SceneControls,
  composition: CompositionControls,
  words: string[],
  palette: StagePalette
) => {
  const { canvas, context } = surface;
  const width = canvas.width;
  const height = canvas.height;
  const beatFlash = pulse * (0.18 + controls.energy * 0.42 + chorus * 0.28);
  const mode = composition.mode;
  const controlDisplay = mode === "control";
  const afterimageDisplay = mode === "afterimage" || mode === "release";
  const rebuildDisplay = mode === "rebuild";
  const lockDisplay = mode === "lock" || mode === "peak";

  if (controlDisplay) {
    fill(context, palette.ink, 0, 0, width, height);
    const controlWash = context.createLinearGradient(0, 0, width, height);
    controlWash.addColorStop(0, "rgba(0,229,255,0.94)");
    controlWash.addColorStop(0.34, "rgba(182,255,0,0.88)");
    controlWash.addColorStop(0.68, "rgba(255,45,178,0.82)");
    controlWash.addColorStop(1, "rgba(77,50,255,0.92)");
    context.globalAlpha = 0.8 + pulse * 0.12;
    fill(context, controlWash, 0, 0, width, height);
    context.globalAlpha = 0.86;
    fill(context, "rgba(8,8,23,0.92)", width * 0.08, height * 0.14, width * 0.84, height * 0.72);
    context.globalAlpha = 1;

    const scanY = (time * (74 + controls.motion * 48) + beatIndex * 13) % height;
    for (let row = 0; row < 12; row += 1) {
      const y = (row / 12) * height;
      context.globalAlpha = 0.18 + pulse * 0.06 + (row % 3 === beatIndex % 3 ? 0.22 : 0);
      fill(context, row % 2 === 0 ? palette.cyan : palette.pink, width * 0.12, y, width * 0.76, 8 + pulse * 8);
    }
    context.globalAlpha = 0.88;
    fill(context, palette.screen, width * 0.08, scanY - 4, width * 0.84, 8 + pulse * 10);
    context.globalAlpha = 1;

    drawLabel(context, "NO SIGNAL", width * 0.5, height * 0.26, 64 + pulse * 10, palette.screen);
    drawLabel(context, "SOS", width * 0.28, height * 0.52, 74 + controls.tension * 10, palette.sun);
    drawLabel(context, "HELP", width * 0.72, height * 0.52, 64 + pulse * 8, palette.acid);
    drawLabel(context, "SCAN LOOP", width * 0.5, height * 0.78, 32, palette.screen);

    for (let column = 0; column < 18; column += 1) {
      const x = width * 0.12 + column * (width * 0.76) / 18;
      const barHeight = height * (0.08 + ((column + beatIndex) % 5) * 0.03 + pulse * 0.08);
      context.globalAlpha = 0.66;
      fill(context, column % 2 === 0 ? palette.cyan : palette.pink, x, height * 0.86 - barHeight, width * 0.025, barHeight);
    }
    context.globalAlpha = 0.42;
    for (let y = 0; y < height; y += 9) fill(context, "rgba(255,255,255,0.28)", 0, y, width, 2);
    context.globalAlpha = 1;
    surface.texture.needsUpdate = true;
    return;
  }

  if (afterimageDisplay) {
    fill(context, palette.haze, 0, 0, width, height);
    const afterWash = context.createRadialGradient(width * 0.5, height * 0.42, 40, width * 0.5, height * 0.42, width * 0.72);
    afterWash.addColorStop(0, "rgba(255,255,255,0.92)");
    afterWash.addColorStop(0.38, "rgba(255,242,0,0.56)");
    afterWash.addColorStop(0.72, "rgba(0,229,255,0.32)");
    afterWash.addColorStop(1, "rgba(255,45,178,0.18)");
    fill(context, afterWash, 0, 0, width, height);
    context.globalAlpha = 0.58;
    fill(context, "rgba(255,255,255,0.72)", width * 0.12, height * 0.18, width * 0.76, height * 0.42);
    context.globalAlpha = 1;
    context.save();
    context.translate(width * 0.5, height * 0.38);
    context.strokeStyle = "rgba(8,8,23,0.32)";
    context.lineWidth = 10;
    for (let ring = 0; ring < 5; ring += 1) {
      context.globalAlpha = 0.28 - ring * 0.032 + pulse * 0.05;
      context.beginPath();
      context.ellipse(Math.sin(time * 0.5 + ring) * 12, 0, 80 + ring * 46, 34 + ring * 20, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
    context.globalAlpha = 1;
    drawLabel(context, mode === "release" ? "RELEASE" : "AFTERIMAGE", width * 0.5, height * 0.72, 44, palette.ink, "center", "rgba(255,255,255,0.82)");
    surface.texture.needsUpdate = true;
    return;
  }

  if (rebuildDisplay) {
    fill(context, palette.sun, 0, 0, width, height);
    const rebuildWash = context.createLinearGradient(0, 0, width, height);
    rebuildWash.addColorStop(0, palette.cyan);
    rebuildWash.addColorStop(0.42, palette.screen);
    rebuildWash.addColorStop(0.66, palette.pink);
    rebuildWash.addColorStop(1, palette.acid);
    fill(context, rebuildWash, 0, 0, width, height);
    for (let index = 0; index < 18; index += 1) {
      const phase = (index + beatIndex) % 6;
      const x = (index / 18) * width;
      const blockHeight = height * (0.16 + phase * 0.08 + pulse * 0.16);
      context.globalAlpha = 0.56 + pulse * 0.18;
      fill(context, index % 2 === 0 ? palette.ink : palette.violet, x, height - blockHeight, width * 0.052, blockHeight);
      context.globalAlpha = 0.72;
      fill(context, index % 3 === 0 ? palette.acid : palette.screen, x + width * 0.008, height - blockHeight + 18, width * 0.032, 7 + pulse * 9);
    }
    context.globalAlpha = 1;
    drawLabel(context, "SYNC RAMP", width * 0.5, height * 0.28, 56 + pulse * 9, palette.screen);
    drawLabel(context, "RETRY", width * 0.5, height * 0.62, 38, palette.screen);
    surface.texture.needsUpdate = true;
    return;
  }

  fill(context, palette.sun, 0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.cyan);
  gradient.addColorStop(0.28, palette.acid);
  gradient.addColorStop(0.54, palette.pink);
  gradient.addColorStop(0.78, palette.violet);
  gradient.addColorStop(1, palette.amber);
  context.globalAlpha = 0.72 + beatFlash * 0.24;
  fill(context, gradient, 0, 0, width, height);
  context.globalAlpha = 1;

  const horizon = context.createLinearGradient(0, height * 0.22, 0, height);
  horizon.addColorStop(0, "rgba(255,255,255,0.36)");
  horizon.addColorStop(0.48, "rgba(0,229,255,0.08)");
  horizon.addColorStop(1, "rgba(8,8,23,0.28)");
  fill(context, horizon, 0, 0, width, height);

  context.globalAlpha = 0.62;
  fill(context, palette.cyan, 0, 0, width * 0.28, height);
  fill(context, palette.pink, width * 0.72, 0, width * 0.28, height);
  fill(context, "rgba(8,8,23,0.9)", width * 0.485, 0, width * 0.03, height);
  context.globalAlpha = 1;

  const columns = 12 + Math.floor(section.density * 8 + controls.energy * 18 + controls.tension * 7 + composition.display * 6);
  const rows = 6 + Math.floor(controls.energy * 8 + controls.tension * 4 + composition.lock * 3);
  const cellW = width / columns;
  const cellH = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const code = row * 17 + column * 11 + beatIndex;
      const flickerStep = controls.energy > 0.88 ? 2 : controls.tension > 0.72 ? 3 : 5;
      const flicker = (code + Math.floor(time * (6 + controls.motion * 5))) % flickerStep === 0;
      if (!flicker) continue;
      const hue = code % 4;
      context.globalAlpha = 0.42 + pulse * 0.24 + controls.energy * 0.18 + controls.tension * 0.1;
      fill(context, [palette.cyan, palette.pink, palette.acid, palette.sun][hue], column * cellW, row * cellH, cellW * 0.86, cellH * 0.72);
      context.globalAlpha = 0.62;
      fill(context, "rgba(8,8,23,0.72)", column * cellW, row * cellH + cellH * 0.7, cellW * 0.86, Math.max(2, cellH * 0.08));
    }
  }
  context.globalAlpha = 1;

  const split = width * (0.5 + Math.sin(time * 1.7) * 0.04 + interference * 0.04);
  fill(context, "rgba(8,8,23,0.96)", split - 8, 26, 16, height - 52);
  fill(context, "rgba(8,8,23,0.9)", width * 0.1, height * 0.35, width * 0.31, 18 + pulse * 24);
  fill(context, "rgba(255,255,255,0.9)", width * 0.12, height * 0.35 + 5, width * 0.27, 5 + pulse * 7);
  fill(context, "rgba(8,8,23,0.9)", width * 0.58, height * 0.35 + pulse * 12, width * 0.31, 18 + pulse * 24);
  fill(context, "rgba(255,255,255,0.9)", width * 0.6, height * 0.35 + 5 + pulse * 12, width * 0.27, 5 + pulse * 7);

  const eyeX = width * (0.5 + Math.sin(time * 0.7) * 0.03 * controls.motion * (1 - composition.lock * 0.7));
  const eyeY = height * (0.43 - composition.lock * 0.02 + composition.wide * 0.015);
  context.save();
  context.translate(eyeX, eyeY);
  context.strokeStyle = "rgba(8,8,23,0.92)";
  context.lineWidth = 18 + composition.lock * 12;
  context.beginPath();
  context.ellipse(0, 0, width * (0.16 + composition.lock * 0.08 + composition.display * 0.03), height * (0.15 + composition.lock * 0.08), 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = palette.screen;
  context.lineWidth = 8;
  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 30 + ring * (30 + composition.lock * 8) + Math.sin(time * (1.8 + controls.motion) + ring) * (5 + controls.motion * 6 + composition.lock * 8);
    context.globalAlpha = 0.36 + controls.brightness * 0.17 + composition.lock * 0.12 - ring * 0.04;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
  context.fillStyle = palette.ink;
  context.beginPath();
  context.arc(0, 0, 20 + composition.lock * 10 + pulse * (10 + controls.motion * 10 + composition.lock * 8), 0, Math.PI * 2);
  context.fill();
  context.restore();

  const word =
    lockDisplay && composition.lock > 0.72
      ? "LOCK"
      : mode === "peak" && beatIndex % 3 === 0
        ? "000"
        : words[(beatIndex + Math.floor(time * (1 + controls.motion * 2))) % words.length] ?? "SYNC";
  const lowerWord =
    controls.tension > 0.74 || (mode === "peak" && composition.control > 0.22)
      ? "NO SIGNAL"
      : controls.release > 0.36
        ? "RELEASE"
        : modeFooterWord(composition, controls);
  drawLabel(context, word, width * 0.5, height * (0.18 - composition.lock * 0.02), 54 + controls.energy * 16 + composition.lock * 12, palette.screen);
  drawLabel(context, lowerWord, width * 0.5, height * (0.72 + composition.lock * 0.03), 34 + composition.lock * 6, palette.screen);
  drawLabel(context, modeFooterWord(composition, controls), width * 0.5, height - 42, 22, palette.screen);

  context.globalAlpha = 0.42;
  for (let y = 0; y < height; y += 10) {
    fill(context, "rgba(8,8,23,0.38)", 0, y, width, 3);
  }
  context.globalAlpha = 1;
  surface.texture.needsUpdate = true;
};

const drawWallDisplay = (
  surface: DisplaySurface,
  time: number,
  beatIndex: number,
  pulse: number,
  chorus: number,
  controls: SceneControls,
  composition: CompositionControls,
  side: -1 | 1,
  palette: StagePalette
) => {
  const { canvas, context } = surface;
  const width = canvas.width;
  const height = canvas.height;
  if (composition.mode === "control") {
    fill(context, palette.ink, 0, 0, width, height);
    context.globalAlpha = 0.86;
    fill(context, side < 0 ? palette.cyan : palette.pink, 0, 0, width, height);
    context.globalAlpha = 0.72;
    fill(context, "rgba(8,8,23,0.92)", width * 0.08, height * 0.12, width * 0.84, height * 0.76);
    context.globalAlpha = 1;
    for (let lane = 0; lane < 10; lane += 1) {
      const y = lane * (height / 10);
      const offset = (time * (42 + lane * 6 + controls.motion * 32) + beatIndex * 12 * side) % width;
      context.globalAlpha = 0.42 + pulse * 0.12;
      fill(context, lane % 2 === 0 ? palette.acid : palette.screen, offset - width * 0.8, y + 8, width * 0.7, 12 + pulse * 8);
      fill(context, lane % 2 === 0 ? palette.acid : palette.screen, offset, y + 8, width * 0.7, 12 + pulse * 8);
    }
    context.globalAlpha = 1;
    drawLabel(context, side < 0 ? "HELP" : "SOS", width * 0.5, height * 0.43, 56, palette.screen);
    drawLabel(context, "NO SIGNAL", width * 0.5, height * 0.68, 24, palette.screen);
    surface.texture.needsUpdate = true;
    return;
  }
  if (composition.mode === "afterimage" || composition.mode === "release") {
    fill(context, palette.haze, 0, 0, width, height);
    context.globalAlpha = 0.42;
    fill(context, side < 0 ? palette.cyan : palette.pink, 0, 0, width, height);
    context.globalAlpha = 0.64;
    drawLabel(context, "WAIT", width * 0.5, height * 0.45, 42, palette.ink, "center", "rgba(255,255,255,0.84)");
    context.globalAlpha = 1;
    surface.texture.needsUpdate = true;
    return;
  }
  fill(context, palette.cyan, 0, 0, width, height);
  const wash = context.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, "rgba(255,242,0,0.86)");
  wash.addColorStop(0.46, "rgba(255,45,178,0.48)");
  wash.addColorStop(1, "rgba(77,50,255,0.64)");
  fill(context, wash, 0, 0, width, height);
  context.globalAlpha = 0.82;
  fill(context, "rgba(8,8,23,0.86)", 0, height * 0.77, width, height * 0.1);
  fill(context, "rgba(8,8,23,0.86)", 0, height * 0.16, width, height * 0.08);
  context.globalAlpha = 1;
  const laneCount = 7 + Math.floor(controls.energy * 10 + controls.tension * 5 + chorus * 3);
  for (let lane = 0; lane < laneCount; lane += 1) {
    const y = (lane / laneCount) * height;
    const offset = ((time * (28 + controls.motion * 28 + lane * 4) + beatIndex * 6 * side) % width) - width;
    const laneColor = lane % 4 === 0 ? palette.acid : lane % 4 === 1 ? palette.pink : lane % 4 === 2 ? palette.sun : palette.cyan;
    context.globalAlpha = 0.48 + pulse * 0.18 + controls.energy * 0.18 + controls.tension * 0.08;
    fill(context, laneColor, offset, y + 6, width * 0.62, 18 + pulse * 18);
    fill(context, laneColor, offset + width * 0.82, y + 6, width * 0.5, 18 + pulse * 18);
  }
  context.globalAlpha = 1;
  const label = side < 0 ? "FOCUS ARRAY" : controls.tension > 0.62 ? "SOS BUFFER" : "SYNC ARRAY";
  drawLabel(context, label, width * 0.5, 34, 20, palette.screen);
  surface.texture.needsUpdate = true;
};

const makeBox = (
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
};

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose?.();
  });
};

export const createMesmerizerSignalLockApp = async (
  context: SongAdapterContext,
  services: SongAppServices
): Promise<SongApp> => {
  const { canvas } = services;
  const cues = resolveCues(await context.assets.readDesignCues<Partial<StageCues>>());
  const emotionMap = resolveEmotionMap(await context.assets.readJson<EmotionMap>("design/emotion-map.json"));
  const compositionMap = resolveCompositionMap(await context.assets.readJson<CompositionMap>("design/composition-map.json"));
  const pointer: Pointer = { x: 0.5, y: 0.5, active: false, down: false };
  let visualLayer: SongVisualLayer | null = null;
  let previousCanvasOpacity = "";
  let webglCanvas: HTMLCanvasElement;
  if (services.visualHost) {
    visualLayer = services.visualHost.createLayer({
      id: "mesmerizer-live-stage",
      kind: "canvas",
      canvasContext: "none",
      zIndex: 1,
      pointerEvents: "none",
      hideBaseCanvas: true
    });
    if (!visualLayer.canvas) throw new Error("3D live stage layer canvas is unavailable");
    webglCanvas = visualLayer.canvas;
  } else {
    const parent = canvas.parentElement ?? document.body;
    webglCanvas = document.createElement("canvas");
    Object.assign(webglCanvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      display: "block",
      zIndex: "1",
      pointerEvents: "none"
    });
    parent.appendChild(webglCanvas);
    previousCanvasOpacity = canvas.style.opacity;
    canvas.style.opacity = "0";
  }
  webglCanvas.id = "mesmerizer-live-stage";
  webglCanvas.setAttribute("aria-label", "3D live stage visualizer");

  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(color(cues.palette.sky), 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;

  const scene = new THREE.Scene();
  scene.background = color(cues.palette.sky);
  scene.fog = new THREE.FogExp2(color(cues.palette.sky), 0.013);

  const camera = new THREE.PerspectiveCamera(47, 16 / 9, 0.1, 90);
  camera.position.set(0, 4.4, 11);

  const mainDisplay = makeDisplaySurface(1024, 512);
  const leftDisplay = makeDisplaySurface(512, 512);
  const rightDisplay = makeDisplaySurface(512, 512);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.floor),
    emissive: color(cues.palette.cyan),
    emissiveIntensity: 0.04,
    roughness: 0.32,
    metalness: 0.26
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.wall),
    emissive: color(cues.palette.glass),
    emissiveIntensity: 0.26,
    roughness: 0.24,
    metalness: 0.05,
    transparent: true,
    opacity: 0.66,
    side: THREE.DoubleSide
  });
  const blackMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.ink),
    emissive: color(cues.palette.violet),
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.35
  });
  const stageTrimMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.violet),
    emissive: color(cues.palette.violet),
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.2
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.ink),
    emissive: color(cues.palette.cyan),
    emissiveIntensity: 0.34,
    roughness: 0.28,
    metalness: 0.58
  });
  const floorGridMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.cyan),
    emissive: color(cues.palette.cyan),
    emissiveIntensity: 0.22,
    roughness: 0.48,
    metalness: 0.42,
    transparent: true,
    opacity: 0.42
  });
  const speakerMaterial = new THREE.MeshStandardMaterial({
    color: color("#08263A"),
    emissive: color(cues.palette.cyan),
    emissiveIntensity: 0.22,
    roughness: 0.58,
    metalness: 0.16
  });
  const signalTowerMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.screen),
    emissive: color(cues.palette.acid),
    emissiveIntensity: 1.6,
    roughness: 0.28,
    metalness: 0.28,
    transparent: true,
    opacity: 0.68
  });
  const screenMaterial = new THREE.MeshBasicMaterial({ map: mainDisplay.texture, transparent: true, opacity: 1 });
  const leftWallScreenMaterial = new THREE.MeshBasicMaterial({ map: leftDisplay.texture, transparent: true, opacity: 1 });
  const rightWallScreenMaterial = new THREE.MeshBasicMaterial({ map: rightDisplay.texture, transparent: true, opacity: 1 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 22), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 1.6;
  floor.receiveShadow = true;
  scene.add(floor);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.88, 48),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.sun), transparent: true, opacity: 1, depthWrite: false })
  );
  sunDisc.position.set(5.65, 6.35, -5.85);
  scene.add(sunDisc);

  const skylineMaterial = new THREE.MeshStandardMaterial({
    color: color(cues.palette.ink),
    emissive: color(cues.palette.pink),
    emissiveIntensity: 0.48,
    roughness: 0.22,
    metalness: 0.12,
    transparent: true,
    opacity: 0.78
  });
  const skylineBlocks: THREE.Mesh[] = [];
  const skylineHeights = [1.4, 2.1, 1.7, 2.6, 1.9, 2.35, 1.55, 2.85];
  skylineHeights.forEach((blockHeight, index) => {
    const x = -7.5 + index * 2.14;
    if (Math.abs(x) < 4.8) return;
    const block = makeBox(0.86, blockHeight, 0.08, skylineMaterial, x, 1.0 + blockHeight * 0.5, -5.86);
    block.userData.baseY = block.position.y;
    scene.add(block);
    skylineBlocks.push(block);
  });

  const floorGridLines: THREE.Mesh[] = [];
  for (let z = -5.2; z <= 9.2; z += 1.2) {
    const line = makeBox(16.2, 0.018, 0.026, floorGridMaterial, 0, 0.035, z);
    scene.add(line);
    floorGridLines.push(line);
  }
  for (let x = -7.2; x <= 7.2; x += 1.2) {
    const line = makeBox(0.026, 0.018, 16.8, floorGridMaterial, x, 0.04, 1.6);
    scene.add(line);
    floorGridLines.push(line);
  }

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(17, 8), wallMaterial);
  backWall.position.set(0, 4, -6.2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.2), wallMaterial);
  leftWall.position.set(-8.2, 3.6, 1.2);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.2), wallMaterial);
  rightWall.position.set(8.2, 3.6, 1.2);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  const stage = makeBox(9.2, 0.42, 4.8, blackMaterial, 0, 0.22, -2.2);
  stage.castShadow = true;
  stage.receiveShadow = true;
  scene.add(stage);

  const runway = makeBox(2.2, 0.26, 8.8, blackMaterial, 0, 0.14, 2.4);
  runway.castShadow = true;
  runway.receiveShadow = true;
  scene.add(runway);

  const risers: THREE.Mesh[] = [];
  for (const x of [-3.15, 0, 3.15]) {
    const riser = makeBox(1.52, 0.32, 0.92, frameMaterial, x, 0.58, -3.6);
    riser.castShadow = true;
    riser.receiveShadow = true;
    scene.add(riser);
    risers.push(riser);
  }

  for (const x of [-5.65, 5.65]) {
    for (let level = 0; level < 3; level += 1) {
      const speaker = makeBox(0.78, 0.72, 0.58, speakerMaterial, x, 0.58 + level * 0.76, -3.25);
      speaker.castShadow = true;
      scene.add(speaker);
    }
  }

  const mainScreen = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 4.4), screenMaterial);
  mainScreen.position.set(0, 4.15, -5.94);
  scene.add(mainScreen);

  const screenAccents: THREE.Mesh[] = [];
  const addAccent = (mesh: THREE.Mesh) => {
    scene.add(mesh);
    screenAccents.push(mesh);
  };
  addAccent(makeBox(9.18, 0.08, 0.09, stageTrimMaterial, 0, 6.4, -5.88));
  addAccent(makeBox(9.18, 0.08, 0.09, stageTrimMaterial, 0, 1.9, -5.88));
  addAccent(makeBox(0.08, 4.55, 0.09, stageTrimMaterial, -4.62, 4.15, -5.88));
  addAccent(makeBox(0.08, 4.55, 0.09, stageTrimMaterial, 4.62, 4.15, -5.88));

  const leftScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.8), leftWallScreenMaterial);
  leftScreen.position.set(-8.05, 3.5, -0.5);
  leftScreen.rotation.y = Math.PI / 2;
  scene.add(leftScreen);

  const rightScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.8), rightWallScreenMaterial);
  rightScreen.position.set(8.05, 3.5, -0.5);
  rightScreen.rotation.y = -Math.PI / 2;
  scene.add(rightScreen);

  for (const side of [-1, 1] as const) {
    const x = side * 8.0;
    const top = makeBox(0.09, 0.07, 6.95, stageTrimMaterial, x, 5.45, -0.5);
    const bottom = makeBox(0.09, 0.07, 6.95, stageTrimMaterial, x, 1.55, -0.5);
    const front = makeBox(0.09, 3.92, 0.07, stageTrimMaterial, x, 3.5, 2.92);
    const back = makeBox(0.09, 3.92, 0.07, stageTrimMaterial, x, 3.5, -3.92);
    for (const accent of [top, bottom, front, back]) addAccent(accent);
  }

  const trussMaterial = new THREE.MeshStandardMaterial({
    color: color("#202533"),
    roughness: 0.35,
    metalness: 0.8
  });
  for (const y of [6.45, 5.85]) {
    const truss = makeBox(13.2, 0.14, 0.16, trussMaterial, 0, y, -3.1);
    scene.add(truss);
  }
  for (const x of [-5.8, -2.9, 0, 2.9, 5.8]) {
    const vertical = makeBox(0.12, 1.1, 0.12, trussMaterial, x, 6.15, -3.1);
    scene.add(vertical);
  }

  const canopyMaterial = new THREE.MeshBasicMaterial({
    color: color(cues.palette.pink),
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const canopyPanels: THREE.Mesh[] = [];
  for (const x of [-4.8, 0, 4.8]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 5.9), canopyMaterial);
    panel.position.set(x, 6.0, -0.6);
    panel.rotation.x = -Math.PI / 2.35;
    panel.rotation.z = x * 0.012;
    scene.add(panel);
    canopyPanels.push(panel);
  }

  const ledStripMaterials = [
    new THREE.MeshStandardMaterial({ color: color(cues.palette.cyan), emissive: color(cues.palette.cyan), emissiveIntensity: 1.8 }),
    new THREE.MeshStandardMaterial({ color: color(cues.palette.pink), emissive: color(cues.palette.pink), emissiveIntensity: 1.8 }),
    new THREE.MeshStandardMaterial({ color: color(cues.palette.acid), emissive: color(cues.palette.acid), emissiveIntensity: 1.8 }),
    new THREE.MeshStandardMaterial({ color: color(cues.palette.amber), emissive: color(cues.palette.amber), emissiveIntensity: 1.8 })
  ];
  const ledStrips: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i += 1) {
    const strip = makeBox(0.12, 0.04, 5.2, ledStripMaterials[i % ledStripMaterials.length], -4.2 + i * 1.2, 0.48, -2.2);
    scene.add(strip);
    ledStrips.push(strip);
  }
  for (let i = 0; i < 7; i += 1) {
    const strip = makeBox(1.0, 0.035, 0.08, ledStripMaterials[(i + 1) % ledStripMaterials.length], -3.6 + i * 1.2, 0.32, 2.8);
    scene.add(strip);
    ledStrips.push(strip);
  }

  const signalTowers: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    for (let level = 0; level < 5; level += 1) {
      const towerCell = makeBox(
        0.34,
        0.32,
        0.12,
        level % 2 === 0 ? signalTowerMaterial : ledStripMaterials[(level + (side > 0 ? 1 : 0)) % ledStripMaterials.length],
        side * 1.05,
        0.82 + level * 0.42,
        -2.92
      );
      scene.add(towerCell);
      signalTowers.push(towerCell);
    }
  }

  const makeTransparentBasicMaterial = (hex: string, opacity: number) =>
    new THREE.MeshBasicMaterial({
      color: color(hex),
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });

  const verseTextures: THREE.CanvasTexture[] = [];

  const makeTicketTexture = (accentColor: string, baseColor: string, label: string, ticketNo: string) => {
    const ticketCanvas = document.createElement("canvas");
    ticketCanvas.width = 640;
    ticketCanvas.height = 384;
    const ticketContext = ticketCanvas.getContext("2d");
    if (!ticketContext) throw new Error("Ticket texture canvas is unavailable");

    ticketContext.clearRect(0, 0, ticketCanvas.width, ticketCanvas.height);
    ticketContext.fillStyle = baseColor;
    ticketContext.fillRect(0, 0, ticketCanvas.width, ticketCanvas.height);
    ticketContext.globalAlpha = 0.92;
    ticketContext.fillStyle = "#FFFDF2";
    ticketContext.fillRect(30, 28, ticketCanvas.width - 60, ticketCanvas.height - 56);
    ticketContext.globalAlpha = 1;

    ticketContext.fillStyle = accentColor;
    ticketContext.fillRect(30, 28, ticketCanvas.width - 60, 44);
    ticketContext.fillStyle = cues.palette.ink;
    ticketContext.fillRect(30, 28, 22, ticketCanvas.height - 56);
    ticketContext.fillRect(ticketCanvas.width - 52, 28, 22, ticketCanvas.height - 56);

    ticketContext.fillStyle = cues.palette.ink;
    ticketContext.font = "900 76px ui-monospace, SFMono-Regular, Consolas, monospace";
    ticketContext.textAlign = "center";
    ticketContext.textBaseline = "middle";
    ticketContext.fillText(label, ticketCanvas.width * 0.5, 150);

    ticketContext.font = "700 28px ui-monospace, SFMono-Regular, Consolas, monospace";
    ticketContext.textAlign = "left";
    ticketContext.fillText(`ID.${ticketNo}`, 84, 96);
    ticketContext.textAlign = "right";
    ticketContext.fillText("SIGNAL", ticketCanvas.width - 84, 96);

    ticketContext.save();
    ticketContext.translate(ticketCanvas.width * 0.5, 254);
    ticketContext.strokeStyle = cues.palette.ink;
    ticketContext.lineWidth = 8;
    ticketContext.beginPath();
    ticketContext.ellipse(0, 0, 122, 54, 0, 0, Math.PI * 2);
    ticketContext.stroke();
    ticketContext.strokeStyle = accentColor;
    ticketContext.lineWidth = 5;
    for (let ring = 0; ring < 3; ring += 1) {
      ticketContext.beginPath();
      ticketContext.arc(0, 0, 18 + ring * 16, 0, Math.PI * 2);
      ticketContext.stroke();
    }
    ticketContext.fillStyle = cues.palette.ink;
    ticketContext.beginPath();
    ticketContext.arc(0, 0, 14, 0, Math.PI * 2);
    ticketContext.fill();
    ticketContext.restore();

    for (let index = 0; index < 4; index += 1) {
      const y = 218 + index * 34;
      ticketContext.fillStyle = index % 2 === 0 ? accentColor : cues.palette.ink;
      ticketContext.fillRect(88, y, 36, 18);
      ticketContext.fillStyle = cues.palette.ink;
      ticketContext.globalAlpha = index % 2 === 0 ? 0.64 : 0.36;
      ticketContext.fillRect(430, y + 5, 110 - index * 16, 8);
      ticketContext.globalAlpha = 1;
    }

    ticketContext.strokeStyle = cues.palette.ink;
    ticketContext.lineWidth = 8;
    ticketContext.strokeRect(30, 28, ticketCanvas.width - 60, ticketCanvas.height - 56);
    ticketContext.strokeStyle = accentColor;
    ticketContext.lineWidth = 5;
    ticketContext.strokeRect(70, 82, ticketCanvas.width - 140, ticketCanvas.height - 132);

    const texture = new THREE.CanvasTexture(ticketCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    verseTextures.push(texture);
    return texture;
  };

  const makeSignalTexture = () => {
    const signalCanvas = document.createElement("canvas");
    signalCanvas.width = 384;
    signalCanvas.height = 224;
    const signalContext = signalCanvas.getContext("2d");
    if (!signalContext) throw new Error("Signal texture canvas is unavailable");

    signalContext.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
    signalContext.fillStyle = cues.palette.ink;
    signalContext.fillRect(0, 0, signalCanvas.width, signalCanvas.height);
    signalContext.fillStyle = cues.palette.sun;
    signalContext.fillRect(18, 18, signalCanvas.width - 36, signalCanvas.height - 36);
    signalContext.fillStyle = cues.palette.pink;
    signalContext.fillRect(18, 18, signalCanvas.width - 36, 26);
    signalContext.fillStyle = cues.palette.ink;
    signalContext.font = "900 62px ui-monospace, SFMono-Regular, Consolas, monospace";
    signalContext.textAlign = "center";
    signalContext.textBaseline = "middle";
    signalContext.fillText("SOS", signalCanvas.width * 0.5, 95);
    signalContext.font = "800 24px ui-monospace, SFMono-Regular, Consolas, monospace";
    signalContext.fillText("NO SIGNAL", signalCanvas.width * 0.5, 148);
    for (let index = 0; index < 5; index += 1) {
      signalContext.fillRect(86 + index * 42, 176 - index * 8, 24, 18 + index * 8);
    }
    signalContext.lineWidth = 7;
    signalContext.strokeStyle = cues.palette.ink;
    signalContext.strokeRect(18, 18, signalCanvas.width - 36, signalCanvas.height - 36);

    const texture = new THREE.CanvasTexture(signalCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    verseTextures.push(texture);
    return texture;
  };

  const makeVerseCard = (accentColor: string, baseColor: string, initialX: number, label: string, ticketNo: string): VerseCard => {
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(initialX, 2.72, -1.92);

    const glowMaterial = makeTransparentBasicMaterial(accentColor, 0);
    const bodyMaterial = makeTransparentBasicMaterial(baseColor, 0);
    const trimMaterial = makeTransparentBasicMaterial(cues.palette.ink, 0);
    const edgeMaterial = makeTransparentBasicMaterial(accentColor, 0);
    const ticketMaterial = new THREE.MeshBasicMaterial({
      map: makeTicketTexture(accentColor, baseColor, label, ticketNo),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.25, 2.78), glowMaterial);
    glow.position.z = -0.012;
    group.add(glow);

    const body = new THREE.Mesh(new THREE.PlaneGeometry(3.44, 2.1), bodyMaterial);
    body.position.z = 0.018;
    group.add(body);

    const ticketFace = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.92), ticketMaterial);
    ticketFace.position.z = 0.065;
    group.add(ticketFace);

    group.add(makeBox(3.64, 0.06, 0.06, trimMaterial, 0, 1.1, 0.085));
    group.add(makeBox(3.64, 0.06, 0.06, trimMaterial, 0, -1.1, 0.085));
    group.add(makeBox(0.07, 2.24, 0.06, trimMaterial, -1.82, 0, 0.085));
    group.add(makeBox(0.07, 2.24, 0.06, trimMaterial, 1.82, 0, 0.085));
    group.add(makeBox(0.74, 0.16, 0.07, edgeMaterial, 0, 1.23, 0.12));
    group.add(makeBox(0.24, 0.24, 0.07, edgeMaterial, -1.32, 0.78, 0.12));
    group.add(makeBox(0.24, 0.24, 0.07, edgeMaterial, 1.32, -0.78, 0.12));

    scene.add(group);
    return {
      group,
      bodyMaterial,
      glowMaterial,
      trimMaterials: [trimMaterial, edgeMaterial, ticketMaterial],
      position: makeSpring(initialX, 2.72, -1.92),
      rotation: makeSpring(0.08, initialX * -0.06, initialX * -0.04),
      scale: makeSpring(0.9, 0.9, 0.9)
    };
  };

  const makeScanMotif = (): ScanMotif => {
    const group = new THREE.Group();
    group.visible = false;
    group.position.set(0, 3.02, -1.56);
    const glowMaterial = makeTransparentBasicMaterial(cues.palette.acid, 0);
    const barMaterial = new THREE.MeshBasicMaterial({
      map: makeSignalTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.85), glowMaterial);
    glow.position.z = -0.01;
    group.add(glow);

    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.88), barMaterial);
    bar.position.z = 0.035;
    group.add(bar);

    const edgeMaterial = makeTransparentBasicMaterial(cues.palette.pink, 0);
    const bellMaterial = makeTransparentBasicMaterial(cues.palette.sun, 0);
    group.add(makeBox(1.62, 0.07, 0.05, edgeMaterial, 0, 0.51, 0.07));
    group.add(makeBox(1.62, 0.07, 0.05, edgeMaterial, 0, -0.51, 0.07));
    group.add(makeBox(0.12, 0.62, 0.05, edgeMaterial, -0.82, 0, 0.07));
    group.add(makeBox(0.12, 0.62, 0.05, edgeMaterial, 0.82, 0, 0.07));
    const bell = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), bellMaterial);
    bell.position.set(0, -0.78, 0.09);
    group.add(bell);

    scene.add(group);
    return {
      group,
      barMaterial,
      glowMaterial,
      trimMaterials: [edgeMaterial, bellMaterial],
      position: makeSpring(0, 3.02, -1.56),
      rotation: makeSpring(0.02, 0, 0),
      scale: makeSpring(1, 1, 1)
    };
  };

  const verseCards: VerseCard[] = [
    makeVerseCard(cues.palette.cyan, cues.palette.sun, -0.75, "FOCUS", "00"),
    makeVerseCard(cues.palette.pink, cues.palette.acid, 0.75, "SYNC", "01")
  ];
  const scanMotif = makeScanMotif();

  const audienceGroup = new THREE.Group();
  const audienceHeadMaterial = new THREE.MeshStandardMaterial({
    color: color("#090A10"),
    roughness: 0.7,
    metalness: 0.05
  });
  const glowStickMaterials = [
    new THREE.MeshBasicMaterial({ color: color(cues.palette.cyan) }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.pink) }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.acid) }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.amber) })
  ];
  const glowSticks: THREE.Mesh[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 18; column += 1) {
      const x = -7.2 + column * 0.84 + (row % 2) * 0.22;
      const z = 4.6 + row * 0.62;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.16), audienceHeadMaterial);
      head.position.set(x, 0.32 + row * 0.04, z);
      audienceGroup.add(head);
      if ((row + column) % 2 === 0) {
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.045), glowStickMaterials[(row + column) % glowStickMaterials.length]);
        stick.position.set(x + 0.16, 0.72 + row * 0.04, z - 0.02);
        stick.rotation.z = (column % 3 - 1) * 0.28;
        audienceGroup.add(stick);
        glowSticks.push(stick);
      }
    }
  }
  scene.add(audienceGroup);

  const ambient = new THREE.AmbientLight(color(cues.palette.screen), 0.48);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(color(cues.palette.sun), 1.62);
  keyLight.position.set(4.4, 7.8, 5.8);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const spotTargets: THREE.Object3D[] = [];
  const spotLights: THREE.SpotLight[] = [];
  const movingHeads: THREE.Group[] = [];
  const beamMaterials = [
    new THREE.MeshBasicMaterial({ color: color(cues.palette.cyan), transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.pink), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.acid), transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: color(cues.palette.amber), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  ];
  const beams: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const target = new THREE.Object3D();
    target.position.set(-3 + i * 2, 0.25, -1.5);
    scene.add(target);
    spotTargets.push(target);

    const spot = new THREE.SpotLight(color([cues.palette.cyan, cues.palette.pink, cues.palette.acid, cues.palette.amber][i]), 3.2, 15, Math.PI / 7, 0.55, 1.1);
    spot.position.set(-4.8 + i * 3.2, 6.0, -2.6);
    spot.target = target;
    scene.add(spot);
    scene.add(spot.target);
    spotLights.push(spot);

    const head = new THREE.Group();
    head.position.copy(spot.position);
    head.add(makeBox(0.56, 0.18, 0.44, frameMaterial, 0, 0, 0));
    head.add(makeBox(0.12, 0.42, 0.12, trussMaterial, -0.26, -0.22, 0));
    head.add(makeBox(0.12, 0.42, 0.12, trussMaterial, 0.26, -0.22, 0));
    head.add(makeBox(0.5, 0.34, 0.56, blackMaterial, 0, -0.46, 0.12));
    scene.add(head);
    movingHeads.push(head);

    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.76, 6.5, 32, 1, true), beamMaterials[i]);
    beam.position.set(spot.position.x, 2.95, spot.position.z + 0.75);
    beam.rotation.z = (i - 1.5) * 0.09;
    scene.add(beam);
    beams.push(beam);
  }

  const hazePlanes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const hazeMaterial = new THREE.MeshBasicMaterial({
      color: color(i % 2 === 0 ? cues.palette.cyan : cues.palette.pink),
      transparent: true,
      opacity: 0.032,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 3.2), hazeMaterial);
    haze.position.set(0, 2.1 + i * 0.42, -4.6 + i * 2.1);
    haze.rotation.z = (i - 1.5) * 0.035;
    scene.add(haze);
    hazePlanes.push(haze);
  }

  let width = 1;
  let height = 1;
  let dpr = 1;

  const resize = () => {
    const hostRect = visualLayer?.resize();
    const rect = webglCanvas.getBoundingClientRect();
    dpr = hostRect?.dpr ?? Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    width = Math.max(1, rect.width || hostRect?.viewportWidth || window.innerWidth);
    height = Math.max(1, rect.height || hostRect?.viewportHeight || window.innerHeight);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  let lastRenderTime: number | null = null;

  const render = ({ time, userGlow }: SongAppFrame) => {
    const rawDt = lastRenderTime === null ? 1 / 60 : time - lastRenderTime;
    const snapMotion = lastRenderTime === null || rawDt < -0.05 || Math.abs(rawDt) > 0.35;
    const dt = snapMotion ? 1 / 60 : clampBetween(rawDt, 1 / 120, 0.05);
    lastRenderTime = time;

    const beat = beatAt(time, context.musicMap.beats);
    const currentBeat = context.musicMap.beats[beat.index];
    const section = findSection(time, cues.sections);
    const sceneControls = sampleEmotionMap(time, emotionMap, section);
    const composition = sampleCompositionMap(time, compositionMap, section);
    const sectionFade = sectionPresence(time, section, section.name === "pre-chorus" ? 0.28 : 0.72);
    const songleChorus = activeRange(time, context.musicMap.chorus);
    const sectionChorus = isChorusSection(section) ? (section.name === "chorus-b" ? 1.16 : 0.96) * sectionFade : 0;
    const chorus = clampBetween(songleChorus + sectionChorus * 0.28, 0, 1.35);
    const verseAmount = isVerseSection(section) ? sectionFade : 0;
    const motifAmount = clampBetween(Math.max(verseAmount, composition.foreground * (composition.mode === "control" ? 0.72 : 0.3)), 0, 1);
    const step = verseStep(section);
    const stepStrength = verseAmount * (0.54 + step * 0.16 + sceneControls.motion * 0.22);
    const interludeAmount = section.name === "interlude" ? sectionFade : 0;
    const rebuildAmount = section.name === "rebuild" ? sectionFade : 0;
    const outroAmount = section.name === "outro" ? sectionFade : 0;
    const pulse = beat.pulse;
    const downbeat = currentBeat?.position === 1 ? 1 : 0;
    const beatPosition = currentBeat?.position ?? ((beat.index % 4) + 1);
    const interference = clampBetween(
      userGlow * 0.62 +
        (pointer.down ? 0.28 : 0) +
        chorus * 0.24 +
        sceneControls.tension * 0.44 +
        interludeAmount * 0.12 +
        pulse * (0.12 + sceneControls.motion * 0.2),
      0,
      1.65
    );
    const stageEnergy = clampBetween(
      section.density * 0.3 +
        sceneControls.energy * 1.05 +
        chorus * 0.26 +
        rebuildAmount * 0.14 +
        downbeat * pulse * (0.16 + sceneControls.motion * 0.34) -
        sceneControls.release * 0.22,
      0.24,
      1.95
    );

    drawMainDisplay(mainDisplay, time, beat.index, pulse, chorus, interference, section, sceneControls, composition, cues.stageWords, cues.palette);
    drawWallDisplay(leftDisplay, time, beat.index, pulse, chorus, sceneControls, composition, -1, cues.palette);
    drawWallDisplay(rightDisplay, time, beat.index, pulse, chorus, sceneControls, composition, 1, cues.palette);

    const activeCardIndex = beat.index % 2;
    const primarySide = activeCardIndex === 0 ? -1 : 1;
    const beatLane = ((beatPosition - 1) - 1.5) / 1.5;
    const motifTravel = 0.76 + sceneControls.motion * 0.58 - sceneControls.release * 0.18;
    const primaryTarget = new THREE.Vector3(
      primarySide * (0.72 + stepStrength * 0.36) * motifTravel + beatLane * (0.12 + sceneControls.motion * 0.12),
      2.84 + stepStrength * 0.3 + downbeat * pulse * (0.14 + sceneControls.motion * 0.18) - (beatPosition === 4 ? 0.08 : 0),
      -1.78 - stepStrength * (0.24 + sceneControls.motion * 0.2)
    );

    verseCards.forEach((card, index) => {
      const active = verseAmount > 0 && index === activeCardIndex;
      const inactiveSide = index === 0 ? -1 : 1;
      const inactiveX = -primarySide * (1.34 + stepStrength * 0.18 + sceneControls.motion * 0.12) + inactiveSide * 0.08;
      const target = active ? primaryTarget : new THREE.Vector3(inactiveX, 2.44 + stepStrength * 0.12, -2.18 - stepStrength * 0.14);
      if (section.name === "pre-chorus" && active) {
        target.y += 0.22;
        target.z -= 0.32;
      }
      if (verseAmount <= 0 && motifAmount > 0) {
        target.set(index === 0 ? -1.08 : 1.08, 2.16 + composition.control * 0.34, -2.32 - composition.display * 0.18);
      }
      if (motifAmount <= 0) {
        target.set(index === 0 ? -1.12 : 1.12, 1.75, -2.7);
      }
      card.position.target.copy(target);
      card.rotation.target.set(
        0.06 + stepStrength * 0.08 + sceneControls.tension * 0.025,
        target.x * -0.06,
        (active ? primarySide : -primarySide) * (0.07 + stepStrength * 0.06 + sceneControls.motion * 0.05)
      );
      const scale =
        motifAmount <= 0
          ? 0.68
          : active
            ? (1.12 + stepStrength * 0.16 + downbeat * pulse * (0.06 + sceneControls.motion * 0.08)) * composition.motifScale
            : (0.88 + stepStrength * 0.05 + composition.control * 0.08) * composition.motifScale;
      card.scale.target.set(scale, scale, scale);

      advanceSpring(card.position, dt, 82 + sceneControls.motion * 42, 11.4, snapMotion && motifAmount > 0);
      advanceSpring(card.rotation, dt, 70 + sceneControls.motion * 34, 10.8, snapMotion && motifAmount > 0);
      advanceSpring(card.scale, dt, 108 + sceneControls.motion * 36, 12.8, snapMotion && motifAmount > 0);

      card.group.visible = motifAmount > 0.015;
      card.group.position.copy(card.position.value);
      card.group.rotation.set(card.rotation.value.x, card.rotation.value.y, card.rotation.value.z);
      card.group.scale.copy(card.scale.value);

      const opacity = motifAmount * (active ? 0.92 : 0.34 + composition.control * 0.28);
      card.bodyMaterial.opacity = opacity;
      card.glowMaterial.opacity = motifAmount * (active ? 0.22 + pulse * (0.16 + sceneControls.motion * 0.16) : 0.06 + composition.control * 0.08);
      card.trimMaterials.forEach((material) => {
        material.opacity = motifAmount * (active ? 0.94 : 0.42 + composition.control * 0.28);
      });
    });

    const scanTarget = primaryTarget.clone();
    const scanLead = primarySide * (beatPosition <= 2 ? 0.5 : -0.5);
    scanTarget.x += scanLead * (1.0 - stepStrength * 0.08 + sceneControls.motion * 0.18);
    scanTarget.y += 0.2 + Math.sin(time * (2.4 + sceneControls.motion * 2.2)) * (0.035 + sceneControls.motion * 0.035);
    scanTarget.z += 0.22;
    if (verseAmount <= 0 && motifAmount > 0) scanTarget.set(0, 2.62 + composition.control * 0.48, -2.16 - composition.display * 0.2);
    if (motifAmount <= 0) scanTarget.set(0, 1.7, -2.7);
    scanMotif.position.target.copy(scanTarget);
    scanMotif.rotation.target.set(0.03, scanLead * -0.06, scanLead * (0.26 + stepStrength * 0.14 + sceneControls.tension * 0.18));
    scanMotif.scale.target.set(
      1.02 + stepStrength * 0.18 + sceneControls.motion * 0.16,
      1.0 + stepStrength * 0.14 + downbeat * pulse * (0.12 + sceneControls.motion * 0.16),
      1
    );
    advanceSpring(scanMotif.position, dt, 112 + sceneControls.motion * 44, 8.9, snapMotion && motifAmount > 0);
    advanceSpring(scanMotif.rotation, dt, 98 + sceneControls.motion * 34, 8.6, snapMotion && motifAmount > 0);
    advanceSpring(scanMotif.scale, dt, 126 + sceneControls.motion * 38, 10.2, snapMotion && motifAmount > 0);
    scanMotif.group.visible = motifAmount > 0.025;
    scanMotif.group.position.copy(scanMotif.position.value);
    scanMotif.group.rotation.set(scanMotif.rotation.value.x, scanMotif.rotation.value.y, scanMotif.rotation.value.z);
    scanMotif.group.scale.copy(scanMotif.scale.value);
    scanMotif.barMaterial.opacity = motifAmount * (0.46 + stepStrength * 0.14 + composition.control * 0.22 + pulse * (0.1 + sceneControls.tension * 0.14));
    scanMotif.glowMaterial.opacity = motifAmount * (0.1 + stepStrength * 0.12 + composition.control * 0.1 + pulse * (0.08 + sceneControls.tension * 0.08));
    scanMotif.trimMaterials.forEach((material) => {
      material.opacity = motifAmount * (0.46 + stepStrength * 0.18 + composition.control * 0.18);
    });

    renderer.toneMappingExposure =
      0.82 +
      sceneControls.brightness * 0.2 +
      userGlow * 0.16 +
      stageEnergy * 0.08 +
      composition.wide * 0.08 +
      composition.empty * 0.08 -
      composition.control * 0.04 +
      pulse * (0.04 + sceneControls.motion * 0.04);
    ambient.intensity = 0.32 + sceneControls.brightness * 0.12 + composition.empty * 0.08 + interludeAmount * 0.04 + userGlow * 0.04;
    keyLight.intensity =
      1.12 +
      sceneControls.brightness * 0.42 +
      stageEnergy * 0.18 +
      composition.stage * 0.28 +
      pulse * (0.08 + sceneControls.motion * 0.14) -
      sceneControls.release * 0.12;
    stageTrimMaterial.emissiveIntensity = 0.48 + stageEnergy * (0.95 + composition.stage * 0.92) + pulse * (0.7 + sceneControls.motion * 1.1);
    floorGridMaterial.emissiveIntensity =
      0.28 + stageEnergy * (0.45 + composition.stage * 0.48) + pulse * (0.55 + sceneControls.motion * 1.0) + sceneControls.tension * 0.42 + userGlow * 0.28;
    floorGridMaterial.opacity =
      0.28 + composition.stage * 0.18 + sceneControls.energy * 0.18 + sceneControls.tension * 0.11 + pulse * 0.12 + userGlow * 0.08 - sceneControls.release * 0.14;
    frameMaterial.emissiveIntensity = 0.18 + stageEnergy * 0.42 + sceneControls.tension * 0.22 + composition.control * 0.22 + downbeat * pulse * (0.3 + sceneControls.motion * 0.42);
    speakerMaterial.emissiveIntensity = 0.18 + pulse * (0.22 + sceneControls.motion * 0.26) + stageEnergy * 0.28 + rebuildAmount * 0.12;
    skylineMaterial.emissiveIntensity = 0.28 + sceneControls.energy * 0.5 + composition.wide * 0.32 + sceneControls.tension * 0.24 + pulse * (0.12 + sceneControls.motion * 0.26);
    canopyMaterial.opacity = 0.1 + composition.stage * 0.1 + sceneControls.energy * 0.06 + rebuildAmount * 0.04 + pulse * 0.05 + userGlow * 0.03 - sceneControls.release * 0.08;

    ledStrips.forEach((strip, index) => {
      const material = strip.material as THREE.MeshStandardMaterial;
      const activeStep = sceneControls.tension > 0.78 ? 3 : sceneControls.energy > 0.84 ? 2 : 4;
      const active = (index + beat.index) % activeStep === 0;
      material.emissiveIntensity = active
        ? 3.3 + pulse * (3.8 + sceneControls.motion * 2.4) + sceneControls.energy * 3.2 + rebuildAmount * 1.1
        : 0.62 + userGlow * 0.4 + sceneControls.tension * 0.6;
      strip.scale.y = 1 + (active ? pulse * (2.1 + sceneControls.energy * 1.3 + sceneControls.motion * 0.8) : pulse * 0.35);
    });

    floorGridLines.forEach((line, index) => {
      const phase = Math.sin(time * (2.0 + sceneControls.motion * 2.0 + sceneControls.tension * 0.8) + index * 0.38);
      line.visible = phase > -0.72 || sceneControls.energy > 0.78;
      line.scale.y = 1 + pulse * (index % 4 === beat.index % 4 ? 1.5 + sceneControls.motion * 1.1 : 0.35);
    });

    screenAccents.forEach((accent, index) => {
      const hit = (index + beat.index) % 3 === 0;
      accent.scale.y = 1 + (hit ? pulse * (1.1 + sceneControls.energy * 1.1) : sceneControls.tension * 0.16);
      accent.scale.x = 1 + (hit ? pulse * 0.08 : 0);
    });

    risers.forEach((riser, index) => {
      riser.position.y = 0.58 + Math.sin(time * 2.4 + index * 0.8) * 0.018 + pulse * 0.025;
    });

    signalTowers.forEach((cell, index) => {
      const material = cell.material as THREE.MeshStandardMaterial;
      const hit = (index + beat.index) % (sceneControls.tension > 0.72 ? 3 : sceneControls.energy > 0.82 ? 2 : 5) === 0;
      material.emissiveIntensity = hit ? 2.5 + pulse * (3.6 + sceneControls.motion * 2.0) + sceneControls.energy * 1.5 + userGlow : 0.8 + stageEnergy * 0.55;
      cell.scale.set(1 + (hit ? pulse * 0.14 : 0), 1 + (hit ? pulse * (0.55 + sceneControls.energy * 0.45) : 0.08), 1);
    });

    skylineBlocks.forEach((block, index) => {
      block.position.y = (block.userData.baseY as number) + Math.sin(time * 0.9 + index) * 0.018;
      block.scale.y = 1 + sceneControls.energy * 0.06 + pulse * (index % 2 === 0 ? 0.025 + sceneControls.motion * 0.03 : 0.014);
    });

    canopyPanels.forEach((panel, index) => {
      panel.rotation.z = index * 0.025 + Math.sin(time * 0.38 + index) * 0.018;
    });

    glowSticks.forEach((stick, index) => {
      const sway =
        Math.sin(time * (4.4 + sceneControls.energy * 1.6 + sceneControls.motion * 1.2) + index * 0.7) *
        (0.14 + sceneControls.energy * 0.34 + pulse * (0.08 + sceneControls.motion * 0.1));
      stick.rotation.z = sway;
      stick.scale.y = 1 + pulse * (index % 3 === 0 ? 0.55 + sceneControls.energy * 0.72 : 0.24 + sceneControls.energy * 0.34);
    });

    spotLights.forEach((spot, index) => {
      const sweep = time * (0.62 + index * 0.07 + sceneControls.energy * 0.42 - sceneControls.release * 0.2) + index * 1.7;
      const targetX = Math.sin(sweep) * (3.1 + sceneControls.energy * 1.7 - interludeAmount * 0.45 + rebuildAmount * 0.35);
      const targetZ = -1.6 + Math.cos(sweep * 0.75) * (1.1 + sceneControls.energy * 1.0 - interludeAmount * 0.22);
      const pointerPush = pointer.active ? (pointer.x - 0.5) * 2.4 : 0;
      spotTargets[index].position.set(targetX + pointerPush, 0.2, targetZ);
      spot.intensity = 2.4 + userGlow * 1.4 + pulse * (2.8 + sceneControls.motion * 2.5) + sceneControls.energy * 3.8 + rebuildAmount * 1.1 - sceneControls.release * 1.1;
      spot.angle = Math.PI / (8.2 - sceneControls.energy * 2.2 + sceneControls.tension * 0.5);
      const head = movingHeads[index];
      head.rotation.y = (spotTargets[index].position.x - spot.position.x) * 0.055;
      head.rotation.x = 0.08 + (spotTargets[index].position.z - spot.position.z) * -0.03;
      const beam = beams[index];
      beam.position.x = spot.position.x * 0.72 + spotTargets[index].position.x * 0.28;
      beam.position.z = spot.position.z * 0.7 + spotTargets[index].position.z * 0.3;
      beam.rotation.z = (spotTargets[index].position.x - spot.position.x) * -0.08;
      beam.rotation.x = (spotTargets[index].position.z - spot.position.z) * 0.05;
      const material = beam.material as THREE.MeshBasicMaterial;
      material.opacity = 0.06 + sceneControls.energy * 0.18 + sceneControls.tension * 0.04 + pulse * (0.1 + sceneControls.motion * 0.12) + userGlow * 0.05 - sceneControls.release * 0.06;
      beam.scale.setScalar(1 + sceneControls.energy * 0.36 + rebuildAmount * 0.1 + pulse * 0.16);
    });

    hazePlanes.forEach((haze, index) => {
      const material = haze.material as THREE.MeshBasicMaterial;
      material.opacity = 0.02 + sceneControls.energy * 0.028 + sceneControls.tension * 0.018 + pulse * 0.014 + userGlow * 0.012;
      haze.position.x = Math.sin(time * (0.16 + index * 0.035) + index) * (0.24 + sceneControls.energy * 0.2);
      haze.rotation.z = (index - 1.5) * 0.035 + Math.sin(time * 0.16 + index) * 0.025;
    });

    const parallaxX = pointer.active ? (pointer.x - 0.5) * 1.8 : Math.sin(time * (0.13 + sceneControls.motion * 0.08)) * (0.2 + composition.wide * 0.28);
    const parallaxY = pointer.active ? (0.5 - pointer.y) * 0.72 : Math.sin(time * 0.13) * (0.08 + composition.wide * 0.1);
    const focusX = sceneControls.focus === "RIGHT SIGNAL" ? 0.22 : sceneControls.focus === "CENTER LOCK" ? 0 : primaryTarget.x * 0.16;
    const motifFocus = composition.foreground * (1 - composition.wide * 0.42);
    const cameraX =
      composition.cameraX +
      parallaxX * (0.18 + composition.wide * 0.72 - composition.control * 0.16) +
      primaryTarget.x * motifFocus * 0.16;
    const cameraY =
      composition.cameraHeight +
      parallaxY * (0.2 + composition.wide * 0.36) +
      stageEnergy * 0.05 +
      rebuildAmount * 0.08 -
      sceneControls.release * 0.08;
    const cameraZ =
      composition.cameraDistance -
      sceneControls.energy * (0.16 + composition.stage * 0.26) -
      pulse * (0.03 + sceneControls.motion * 0.08) +
      composition.empty * 0.24;
    const lookX = composition.lookX + focusX * motifFocus + parallaxX * 0.04;
    const lookY = composition.lookY + stepStrength * motifFocus * 0.18 + sceneControls.energy * composition.stage * 0.12;
    const lookZ = composition.lookZ - composition.lock * 0.1 + interludeAmount * -0.08;
    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(lookX, lookY, lookZ);

    const displayPulse = pulse * (0.008 + composition.display * 0.016 + composition.lock * 0.012);
    mainScreen.scale.set(
      composition.screenScale * (1 + displayPulse + sceneControls.energy * 0.018),
      composition.screenScale * (1 + displayPulse + sceneControls.energy * 0.022),
      1
    );
    mainScreen.position.y = 4.15 + composition.lock * 0.12 - composition.empty * 0.1;
    screenMaterial.opacity = 0.64 + composition.display * 0.36;
    leftWallScreenMaterial.opacity = composition.sideScreens;
    rightWallScreenMaterial.opacity = composition.sideScreens;
    leftScreen.visible = composition.sideScreens > 0.03;
    rightScreen.visible = composition.sideScreens > 0.03;
    leftScreen.material = leftWallScreenMaterial;
    rightScreen.material = rightWallScreenMaterial;
    audienceGroup.visible = composition.audience > 0.04;
    audienceGroup.position.y = Math.sin(time * (1.8 + sceneControls.energy * 0.5)) * 0.02 + pulse * (0.02 + sceneControls.energy * 0.025) - (1 - composition.audience) * 0.08;
    audienceGroup.position.z = (1 - composition.audience) * 0.42;
    audienceGroup.scale.setScalar(0.9 + composition.audience * 0.12 + pulse * composition.audience * 0.012);

    renderer.render(scene, camera);
  };

  const updatePointer = (event: PointerEvent) => {
    const rect = webglCanvas.getBoundingClientRect();
    pointer.x = clampBetween((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    pointer.y = clampBetween((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    pointer.active = true;
  };

  const dispose = () => {
    if (visualLayer) visualLayer.dispose();
    else {
      canvas.style.opacity = previousCanvasOpacity;
      webglCanvas.remove();
    }
    mainDisplay.texture.dispose();
    leftDisplay.texture.dispose();
    rightDisplay.texture.dispose();
    verseTextures.forEach((texture) => texture.dispose());
    disposeObject(scene);
    renderer.dispose();
  };

  return {
    id: `${context.manifest.id}:live-stage-3d`,
    status: "song-owned 3D live-stage adapter",
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
    },
    dispose
  };
};
