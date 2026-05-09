import "./styles.css";
import { loadMusicMap, findBundledAudio } from "./data/assets";
import type { Beat, LyricCue, LyricKeyframe, MusicMap, PointerState, Range } from "./types";
import { DampValue, clamp, decayPulse, smoothstep } from "./effects/damping";
import { ColorRamp } from "./effects/palette";
import { ParticleField } from "./effects/particles";
import { LightNetwork } from "./effects/lightNetwork";
import { buildLyricsFromKeyframes, makeTimingExport, normalizeKeyframes } from "./lyrics/manualTiming";

const canvas = document.querySelector<HTMLCanvasElement>("#visualizer");
const audio = document.querySelector<HTMLAudioElement>("#audio");
const lyricCurrent = document.querySelector<HTMLParagraphElement>("#lyric-current");
const lyricNext = document.querySelector<HTMLParagraphElement>("#lyric-next");
const playToggle = document.querySelector<HTMLButtonElement>("#play-toggle");
const playIconPath = document.querySelector<SVGPathElement>("#play-icon-path");
const audioInput = document.querySelector<HTMLInputElement>("#audio-input");
const progressBar = document.querySelector<HTMLDivElement>("#progress-bar");
const glowRange = document.querySelector<HTMLInputElement>("#glow-range");
const fullscreenToggle = document.querySelector<HTMLButtonElement>("#fullscreen-toggle");
const dataStatus = document.querySelector<HTMLDivElement>("#data-status");
const timingPanel = document.querySelector<HTMLElement>("#timing-panel");
const timingToggle = document.querySelector<HTMLButtonElement>("#timing-toggle");
const timingCount = document.querySelector<HTMLSpanElement>("#timing-count");
const timingLeft = document.querySelector<HTMLSpanElement>("#timing-left");
const timingRight = document.querySelector<HTMLSpanElement>("#timing-right");
const timingLast = document.querySelector<HTMLParagraphElement>("#timing-last");
const timingUndo = document.querySelector<HTMLButtonElement>("#timing-undo");
const timingClear = document.querySelector<HTMLButtonElement>("#timing-clear");
const timingExport = document.querySelector<HTMLButtonElement>("#timing-export");

if (
  !canvas ||
  !audio ||
  !lyricCurrent ||
  !lyricNext ||
  !playToggle ||
  !playIconPath ||
  !audioInput ||
  !progressBar ||
  !glowRange ||
  !fullscreenToggle ||
  !dataStatus ||
  !timingPanel ||
  !timingToggle ||
  !timingCount ||
  !timingLeft ||
  !timingRight ||
  !timingLast ||
  !timingUndo ||
  !timingClear ||
  !timingExport
) {
  throw new Error("Missing app element");
}

const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) throw new Error("Canvas 2D is unavailable");

const pointer: PointerState = { x: 0, y: 0, active: false, down: false };
const particles = new ParticleField(260);
const network = new LightNetwork(18);
const glow = new DampValue(0.55, 0.05, 0.8);
const warmth = new DampValue(0.45, 0.035, 0.86);
const density = new DampValue(0.55, 0.045, 0.82);
const rampShift = new DampValue(0, 0.03, 0.9);

let musicMap: MusicMap;
let ramp: ColorRamp;
let width = 1;
let height = 1;
let startedAt = 0;
let pausedAt = 0;
let clockPlaying = false;
let lastFrame = performance.now();
let lastBeatIndex = -1;
let clickRipples: Array<{ x: number; y: number; age: number }> = [];
let baseLyrics: LyricCue[] = [];
let workingLyrics: LyricCue[] = [];
let manualKeyframes: LyricKeyframe[] = [];
let timingHistory: LyricKeyframe[][] = [];
let timingCapture = false;

const storageKey = () => `music-effect:lyric-keyframes:v1:${musicMap.title}`;

const hasAudioSource = () => Boolean(audio.getAttribute("src"));

const resize = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(window.innerWidth * dpr);
  height = Math.floor(window.innerHeight * dpr);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  particles.resize(width, height);
};

const currentTime = () => {
  if (hasAudioSource()) return audio.currentTime;
  if (!clockPlaying) return pausedAt;
  return pausedAt + (performance.now() - startedAt) / 1000;
};

const isPlaying = () => (hasAudioSource() ? !audio.paused : clockPlaying);

const setPlayingIcon = () => {
  const playing = isPlaying();
  playToggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  playIconPath.setAttribute("d", playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z");
};

const play = async () => {
  if (hasAudioSource()) {
    try {
      await audio.play();
    } catch {
      audio.removeAttribute("src");
      clockPlaying = true;
      startedAt = performance.now();
    }
  } else {
    clockPlaying = true;
    startedAt = performance.now();
  }
  setPlayingIcon();
};

const pause = () => {
  if (hasAudioSource()) {
    audio.pause();
  } else {
    pausedAt = currentTime();
    clockPlaying = false;
  }
  setPlayingIcon();
};

const activeRange = (time: number, ranges: Range[]) => {
  let value = 0;
  for (const range of ranges) {
    if (time >= range.start && time <= range.end) {
      const fadeIn = smoothstep(range.start, range.start + 2, time);
      const fadeOut = 1 - smoothstep(range.end - 2, range.end, time);
      value = Math.max(value, fadeIn * fadeOut * (range.intensity ?? 1));
    }
  }
  return clamp(value);
};

const emphasisAt = (time: number) => {
  let value = 0;
  for (const marker of musicMap.markers.lineEmphasis ?? []) {
    const age = time - marker.time;
    if (age >= 0 && age <= marker.duration) {
      value = Math.max(value, (1 - age / marker.duration) * (marker.intensity ?? 1));
    }
  }
  return value;
};

const beatAt = (time: number, beats: Beat[]) => {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (beats[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  const index = Math.max(0, hi);
  const beat = beats[index];
  return {
    index,
    pulse: beat ? decayPulse(time - beat.time, Math.max(0.24, beat.duration * 1.2)) : 0
  };
};

const lyricAt = (time: number, lyrics: LyricCue[]) => {
  const index = lyrics.findIndex((cue) => time >= cue.time && time < cue.end);
  return {
    index,
    current: index >= 0 ? lyrics[index] : null,
    next: lyrics[index + 1] ?? null
  };
};

const lyricIndexAt = (time: number, lyrics: LyricCue[]) => {
  if (!lyrics.length) return -1;
  if (time < lyrics[0].time) return -1;
  let lo = 0;
  let hi = lyrics.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (lyrics[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.max(-1, hi);
};

const saveManualKeyframes = () => {
  localStorage.setItem(storageKey(), JSON.stringify(manualKeyframes));
};

const readManualKeyframes = () => {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { keyframes?: unknown }).keyframes)
        ? (parsed as { keyframes: unknown[] }).keyframes
        : [];
    return normalizeKeyframes(
      source.map((item) => {
        const object = item as Record<string, unknown>;
        return {
          index: typeof object.index === "number" ? object.index : -1,
          time: typeof object.time === "number" ? object.time : typeof object.at === "number" ? object.at : Number.NaN,
          text: typeof object.text === "string" ? object.text : ""
        };
      }),
      musicMap.lyricLines,
      musicMap.duration
    );
  } catch {
    return [];
  }
};

const rebuildWorkingLyrics = () => {
  workingLyrics = buildLyricsFromKeyframes(musicMap.lyricLines, manualKeyframes, musicMap.duration, baseLyrics);
  musicMap.lyrics = workingLyrics;
};

const updateTimingPanel = (time = currentTime() % (musicMap?.duration ?? 1)) => {
  if (!musicMap) return;
  timingPanel.classList.toggle("is-active", timingCapture);
  timingToggle.textContent = timingCapture ? "On" : "Off";
  timingToggle.setAttribute("aria-pressed", String(timingCapture));
  timingCount.textContent = `${manualKeyframes.length} / ${musicMap.lyricLines.length}`;

  const index = lyricIndexAt(time, workingLyrics);
  const currentIndex = Math.max(0, index);
  const nextIndex = Math.min(musicMap.lyricLines.length - 1, currentIndex + 1);
  const currentText = musicMap.lyricLines[currentIndex] ?? "";
  const nextText = musicMap.lyricLines[nextIndex] ?? "";
  timingLeft.textContent = `A: #${currentIndex + 1} ${currentText}`;
  timingRight.textContent = `D: #${nextIndex + 1} ${nextText}`;
};

const setTimingCapture = (enabled: boolean) => {
  timingCapture = enabled;
  timingLast.textContent = enabled
    ? "On: Aで現在行、Dで次行を打刻"
    : "Off: A/D打刻は無効です";
  updateTimingPanel();
};

const pushTimingHistory = () => {
  timingHistory.push(manualKeyframes.map((keyframe) => ({ ...keyframe })));
  if (timingHistory.length > 80) timingHistory = timingHistory.slice(-80);
};

const formatTime = (time: number) => `${time.toFixed(3)}s`;

const recordLyricKeyframe = (direction: "current" | "next") => {
  if (!musicMap.lyricLines.length) return;
  const time = currentTime() % musicMap.duration;
  const activeIndex = lyricIndexAt(time, workingLyrics);
  const baseIndex = activeIndex >= 0 ? activeIndex : 0;
  const targetIndex =
    direction === "current"
      ? Math.max(0, baseIndex)
      : Math.min(musicMap.lyricLines.length - 1, baseIndex + 1);

  pushTimingHistory();
  const nextKeyframe: LyricKeyframe = {
    index: targetIndex,
    time,
    text: musicMap.lyricLines[targetIndex] ?? ""
  };
  manualKeyframes = normalizeKeyframes(
    [...manualKeyframes.filter((keyframe) => keyframe.index !== targetIndex), nextKeyframe],
    musicMap.lyricLines,
    musicMap.duration
  );
  rebuildWorkingLyrics();
  saveManualKeyframes();
  timingLast.textContent = `${direction === "current" ? "A" : "D"}: #${targetIndex + 1} ${formatTime(time)}`;
  updateTimingPanel(time);
};

const undoLyricKeyframe = () => {
  const previous = timingHistory.pop();
  if (!previous) {
    timingLast.textContent = "Undoできる打刻がありません";
    return;
  }
  manualKeyframes = previous;
  rebuildWorkingLyrics();
  saveManualKeyframes();
  timingLast.textContent = "1つ前の打刻に戻しました";
  updateTimingPanel();
};

const clearLyricKeyframes = () => {
  if (!manualKeyframes.length) {
    timingLast.textContent = "消去する打刻がありません";
    return;
  }
  pushTimingHistory();
  manualKeyframes = [];
  rebuildWorkingLyrics();
  saveManualKeyframes();
  timingLast.textContent = "手動キーフレームを消去しました";
  updateTimingPanel();
};

const exportLyricTiming = () => {
  const payload = makeTimingExport(musicMap, manualKeyframes);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lyrics_timing.manual.json";
  link.click();
  URL.revokeObjectURL(link.href);
  timingLast.textContent = "lyrics_timing.manual.jsonを書き出しました";
};

const drawBackground = (time: number, beatPulse: number, chorus: number, userGlow: number) => {
  ctx.globalCompositeOperation = "source-over";
  const shadow = ctx.createLinearGradient(0, 0, width, height);
  shadow.addColorStop(0, "#141520");
  shadow.addColorStop(0.52, "#202033");
  shadow.addColorStop(1, "#10131e");
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, width, height);

  const main = ctx.createRadialGradient(width * 0.5, height * 0.45, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.82);
  const warm = warmth.value;
  main.addColorStop(0, ramp.sample(rampShift.value + 0.08, (0.28 + beatPulse * 0.22 + chorus * 0.16) * userGlow));
  main.addColorStop(0.36, ramp.sample(rampShift.value + 0.28 + warm * 0.2, (0.18 + chorus * 0.14) * userGlow));
  main.addColorStop(0.74, "rgba(60, 69, 99, 0.24)");
  main.addColorStop(1, "rgba(8, 10, 16, 0)");
  ctx.fillStyle = main;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let index = 0; index < 3; index++) {
    const offset = time * (0.018 + index * 0.006) + index * 0.24;
    const x = width * (0.22 + Math.sin(offset) * 0.12 + index * 0.22);
    const gradient = ctx.createLinearGradient(x - width * 0.24, 0, x + width * 0.2, height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.48, ramp.sample(rampShift.value + offset + index * 0.12, (0.05 + chorus * 0.04 + beatPulse * 0.03) * userGlow));
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
};

const drawRipples = (dt: number, userGlow: number) => {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  clickRipples = clickRipples
    .map((ripple) => ({ ...ripple, age: ripple.age + dt }))
    .filter((ripple) => ripple.age < 1.8);
  for (const ripple of clickRipples) {
    const t = ripple.age / 1.8;
    const radius = Math.min(width, height) * (0.05 + t * 0.42);
    ctx.lineWidth = (10 - t * 8) * userGlow;
    ctx.strokeStyle = ramp.sample(rampShift.value + t * 0.18, (1 - t) * 0.32 * userGlow);
    ctx.shadowBlur = 32 * (1 - t) * userGlow;
    ctx.shadowColor = ramp.sample(rampShift.value + 0.2, (1 - t) * 0.85);
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

const updateLyrics = (time: number) => {
  const lyric = lyricAt(time, musicMap.lyrics);
  lyricCurrent.textContent = lyric.current?.text ?? "";
  lyricNext.textContent = lyric.next?.text ?? "";
  if (timingCapture) updateTimingPanel(time);
};

const tick = (now: number) => {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  const time = currentTime() % musicMap.duration;
  const userGlow = Number.parseFloat(glowRange.value);
  const beat = beatAt(time, musicMap.beats);
  const chorus = activeRange(time, musicMap.chorus);
  const warm = activeRange(time, musicMap.markers.warmSections ?? []);
  const emphasis = emphasisAt(time);

  if (beat.index !== lastBeatIndex && beat.pulse > 0.35) {
    lastBeatIndex = beat.index;
    network.trigger(beat.index, chorus, emphasis);
  }

  glow.target = 0.44 + beat.pulse * 0.42 + chorus * 0.34 + emphasis * 0.14;
  warmth.target = 0.35 + warm * 0.38 + chorus * 0.16;
  density.target = 0.44 + chorus * 0.38 + emphasis * 0.18;
  rampShift.target = (time / musicMap.duration) * 1.4 + chorus * 0.12 + beat.pulse * 0.04;
  glow.update(dt);
  warmth.update(dt);
  density.update(dt);
  rampShift.update(dt);

  drawBackground(time, beat.pulse, chorus, userGlow);
  network.draw(ctx, width, height, dt, time, pointer, ramp, glow.value * userGlow);
  particles.draw(ctx, width, height, dt, time, pointer, ramp, density.value + chorus * 0.25);
  drawRipples(dt, userGlow);
  updateLyrics(time);

  const duration = audio.duration && Number.isFinite(audio.duration) ? audio.duration : musicMap.duration;
  progressBar.style.transform = `scaleX(${clamp(time / duration)})`;
  requestAnimationFrame(tick);
};

const setupInput = () => {
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    pointer.x = (event.clientX - rect.left) * scaleX;
    pointer.y = (event.clientY - rect.top) * scaleY;
    pointer.active = true;
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
    pointer.down = false;
  });
  window.addEventListener("pointerdown", (event) => {
    pointer.down = true;
    clickRipples.push({ x: pointer.x || event.clientX, y: pointer.y || event.clientY, age: 0 });
  });
  window.addEventListener("pointerup", () => {
    pointer.down = false;
  });

  playToggle.addEventListener("click", () => {
    if (isPlaying()) pause();
    else void play();
  });

  fullscreenToggle.addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });

  timingToggle.addEventListener("click", () => {
    setTimingCapture(!timingCapture);
  });

  timingUndo.addEventListener("click", undoLyricKeyframe);
  timingClear.addEventListener("click", clearLyricKeyframes);
  timingExport.addEventListener("click", exportLyricTiming);

  window.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;
    if (isTyping || event.repeat) return;

    if (event.code === "KeyT") {
      event.preventDefault();
      setTimingCapture(!timingCapture);
      return;
    }

    if (!timingCapture) return;

    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      event.preventDefault();
      recordLyricKeyframe("current");
    } else if (event.code === "KeyD" || event.code === "ArrowRight") {
      event.preventDefault();
      recordLyricKeyframe("next");
    } else if ((event.code === "KeyZ" && event.ctrlKey) || event.code === "Backspace") {
      event.preventDefault();
      undoLyricKeyframe();
    }
  });

  audioInput.addEventListener("change", () => {
    const file = audioInput.files?.[0];
    if (!file) return;
    if (audio.src?.startsWith("blob:")) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(file);
    pausedAt = 0;
    clockPlaying = false;
    setPlayingIcon();
  });

  audio.addEventListener("pause", setPlayingIcon);
  audio.addEventListener("play", setPlayingIcon);
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    setPlayingIcon();
  });
};

const boot = async () => {
  resize();
  setupInput();
  musicMap = await loadMusicMap();
  baseLyrics = musicMap.lyrics.map((cue) => ({ ...cue }));
  manualKeyframes = readManualKeyframes();
  rebuildWorkingLyrics();
  ramp = new ColorRamp(musicMap.palette);
  const audioPath = await findBundledAudio();
  if (audioPath) audio.src = audioPath;
  dataStatus.textContent = musicMap.warnings.length ? musicMap.warnings.join(" / ") : "Songle ready";
  timingLast.textContent = manualKeyframes.length
    ? "保存済みの手動キーフレームを読み込みました"
    : "Off: ボタンまたはTで調整モード";
  updateTimingPanel(0);
  requestAnimationFrame((now) => {
    lastFrame = now;
    requestAnimationFrame(tick);
  });
};

void boot();
