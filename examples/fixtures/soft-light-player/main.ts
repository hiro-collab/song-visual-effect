import "./styles.css";
import { getAppElements } from "./dom";
import { createSongApp } from "./adapters/registry";
import { LyricTimingTool } from "./tools/lyricTimingTool";
import { BeatStateTool } from "./tools/beatStateTool";
import { isVisualSequencerToolEnabled, VisualSequencerTool } from "./tools/visualSequencerTool";
import {
  Transport,
  applyLyricAdjustment,
  clamp,
  createSongAdapterContext,
  createVisualHost,
  findBundledAudio,
  loadMusicMap,
  lyricAt,
  startFrameLoop,
  type MusicMap,
  type SongAdapterContext,
  type SongApp,
  type SongVisualHost
} from "../../../system/kit";

const elements = getAppElements();
const {
  canvas,
  ctx,
  audio,
  lyricCurrent,
  lyricNext,
  songTitle,
  songArtist,
  playToggle,
  playIconPath,
  audioInput,
  progressBar,
  glowRange,
  fullscreenToggle,
  dataStatus
} = elements;

let musicMap: MusicMap;
let transport: Transport;
let timingTool: LyricTimingTool | null = null;
let beatStateTool: BeatStateTool | null = null;
let visualSequencerTool: VisualSequencerTool | null = null;
let songContext: SongAdapterContext;
let songApp: SongApp;
let visualHost: SongVisualHost;
let lastSongTime = 0;
let lyricDisplayOffsetSec = 0;

const adjustmentStatusText = () => {
  const diagnostics = musicMap?.lyricAdjustmentDiagnostics;
  if (!diagnostics) return "補正なし";
  const issues = diagnostics.issues.length ? ` / issues ${diagnostics.issues.length}` : "";
  return `補正 ${diagnostics.status}: applied ${diagnostics.appliedCount}${issues}`;
};

const updateLyricAdjustmentStatus = () => {
  elements.lyricAdjustmentStatus.textContent = adjustmentStatusText();
};

const updateDataStatus = () => {
  const adapterStatus = songApp?.status ? ` / ${songApp.status}` : "";
  dataStatus.textContent = musicMap.warnings.length
    ? `${musicMap.title}: ${musicMap.warnings.join(" / ")}${adapterStatus}`
    : `${musicMap.title}: song pack ready${adapterStatus}`;
};

const isBeatStateToolEnabled = () => {
  const value = new URLSearchParams(window.location.search).get("beatState")?.toLowerCase();
  return value === "1" || value === "true" || value === "on" || value === "show";
};

const lyricOffsetFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("lyricOffsetMs") ?? params.get("lyricDisplayOffsetMs") ?? params.get("captionOffsetMs");
  if (!raw) return 0;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return clamp(value, -30000, 30000) / 1000;
};

const setPlayingIcon = () => {
  const playing = transport?.isPlaying() ?? false;
  playToggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  playIconPath.setAttribute("d", playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z");
};

const currentTime = () => transport.currentTime();

const wrapTime = (time: number, duration: number) => {
  const safeDuration = Math.max(0.001, duration);
  return ((time % safeDuration) + safeDuration) % safeDuration;
};

const resolveVisualSongTime = (rawTime: number, now: number) => {
  const state = visualSequencerTool?.update(rawTime, now);
  return wrapTime(state?.visualTime ?? rawTime, musicMap.duration);
};

const loadThree = async () => {
  const [THREE, loaderModule] = await Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js")
  ]);
  return { THREE, GLTFLoader: loaderModule.GLTFLoader };
};

const updateLyrics = (time: number) => {
  const lyricTime = wrapTime(time - lyricDisplayOffsetSec, musicMap.duration);
  const lyric = lyricAt(lyricTime, musicMap.lyrics);
  lyricCurrent.textContent = lyric.current?.text ?? "";
  lyricNext.textContent = lyric.next?.text ?? "";
  timingTool?.update(lyricTime);
};

const tick = (now: number, dt: number) => {
  const time = resolveVisualSongTime(currentTime(), now);
  lastSongTime = time;
  const userGlow = Number.parseFloat(glowRange.value);
  const safeArea = visualHost.safeArea();
  songApp.render({ time, dt, userGlow, safeArea, contentRect: safeArea });
  beatStateTool?.update();
  updateLyrics(time);

  const duration = transport.duration(musicMap.duration);
  progressBar.style.transform = `scaleX(${clamp(time / duration)})`;
};

const setupInput = () => {
  window.addEventListener("resize", () => {
    visualHost.resizeLayers();
    songApp.resize();
  });
  window.addEventListener("pointermove", (event) => songApp.pointerMove?.(event));
  window.addEventListener("pointerleave", () => songApp.pointerLeave?.());
  window.addEventListener("pointerdown", (event) => songApp.pointerDown?.(event));
  window.addEventListener("pointerup", () => songApp.pointerUp?.());

  playToggle.addEventListener("click", () => {
    transport.toggle();
  });

  fullscreenToggle.addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;
    if (isTyping || event.repeat) return;

    if (event.code === "Space") {
      event.preventDefault();
      transport.toggle();
      return;
    }
    timingTool?.handleKeydown(event);
  });

  audioInput.addEventListener("change", () => {
    const file = audioInput.files?.[0];
    if (!file) return;
    transport.setLocalAudio(file);
  });

  elements.lyricAdjustmentInput.addEventListener("change", async () => {
    const file = elements.lyricAdjustmentInput.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text()) as unknown;
      const baseLyrics = musicMap.rawLyrics ?? musicMap.lyrics;
      const result = applyLyricAdjustment(baseLyrics, json, {
        songPackId: musicMap.source.manifest.id,
        visualId: musicMap.source.manifest.id,
        slug: musicMap.source.manifest.id,
        duration: musicMap.duration
      });
      musicMap.rawLyrics = baseLyrics.map((cue) => ({ ...cue }));
      musicMap.lyrics = result.lyrics;
      musicMap.lyricAdjustmentDiagnostics = result.diagnostics;
      timingTool?.reloadBaseLyrics("手動読み込みした補正JSONを反映しました");
      updateLyricAdjustmentStatus();
      updateLyrics(lastSongTime);
      updateDataStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elements.lyricAdjustmentStatus.textContent = `補正JSONエラー: ${message}`;
      console.warn(error);
    } finally {
      elements.lyricAdjustmentInput.value = "";
    }
  });
};

const reportBootError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  dataStatus.textContent = `起動エラー: ${message}`;
  console.error(error);
};

const previewTimeFromUrl = () => {
  const raw = new URLSearchParams(window.location.search).get("previewTime");
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
};

const boot = async () => {
  try {
    transport = new Transport(audio, setPlayingIcon);
    musicMap = await loadMusicMap();
    lyricDisplayOffsetSec = lyricOffsetFromUrl();
    songContext = createSongAdapterContext(musicMap);
    visualHost = createVisualHost(canvas, {
      root: document.querySelector<HTMLElement>("#app") ?? document.body,
      overlaySelectors: [
        ".topbar",
        ".controlbar",
        ".timing-panel:not([hidden])",
        ".beat-state-panel",
        ".visual-sequencer-panel"
      ]
    });
    songApp = await createSongApp(songContext, {
      canvas,
      ctx,
      loadThree,
      safeArea: visualHost.safeArea,
      visualHost
    });
    document.title = `${musicMap.title} - Music Effect`;
    songTitle.textContent = musicMap.title;
    songArtist.textContent = musicMap.artist;
    const hasLyricTiming = musicMap.lyricLines.length > 0;
    elements.timingPanel.hidden = !hasLyricTiming;
    if (hasLyricTiming) {
      timingTool = new LyricTimingTool({
        elements,
        musicMap,
        transport,
        onSeek: updateLyrics,
        resetVisualTiming: () => songApp.resetVisualTiming?.()
      });
    }
    songApp.resize();
    setupInput();
    if (isBeatStateToolEnabled()) {
      beatStateTool = new BeatStateTool({
        musicMap,
        getTime: () => lastSongTime
      });
      beatStateTool.mount(document.querySelector("#app") ?? document.body);
    }
    if (isVisualSequencerToolEnabled()) {
      visualSequencerTool = new VisualSequencerTool({
        duration: musicMap.duration,
        seekRawTime: (time) => {
          transport.seek(time, musicMap.duration);
        }
      });
      visualSequencerTool.mount(document.querySelector("#app") ?? document.body);
    }
    timingTool?.bindControls();
    timingTool?.initialize();
    updateLyricAdjustmentStatus();
    const audioPath = await findBundledAudio(musicMap);
    if (audioPath) transport.setAudioPath(audioPath);
    const previewTime = previewTimeFromUrl();
    if (previewTime !== null) {
      transport.seek(previewTime, musicMap.duration);
      updateLyrics(previewTime);
    }
    updateDataStatus();
    startFrameLoop(tick);
  } catch (error) {
    reportBootError(error);
  }
};

void boot();
