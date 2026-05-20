import "./styles.css";
import { loadMusicMap, findBundledAudio } from "./data/assets";
import type { MusicMap } from "./types";
import { clamp } from "./effects/damping";
import { getAppElements } from "./runtime/dom";
import { Transport } from "./runtime/transport";
import { startFrameLoop } from "./runtime/frameLoop";
import { createSongAdapterContext, type SongAdapterContext } from "./runtime/songAdapterContext";
import { createSongApp } from "./adapters/registry";
import type { SongApp } from "./adapters/types";
import { lyricAt } from "./music/timing";
import { LyricTimingTool } from "./tools/lyricTimingTool";

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
let timingTool: LyricTimingTool;
let songContext: SongAdapterContext;
let songApp: SongApp;

const setPlayingIcon = () => {
  const playing = transport?.isPlaying() ?? false;
  playToggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  playIconPath.setAttribute("d", playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z");
};

const currentTime = () => transport.currentTime();

const updateLyrics = (time: number) => {
  const lyric = lyricAt(time, musicMap.lyrics);
  lyricCurrent.textContent = lyric.current?.text ?? "";
  lyricNext.textContent = lyric.next?.text ?? "";
  timingTool.update(time);
};

const tick = (_now: number, dt: number) => {
  const time = currentTime() % musicMap.duration;
  const userGlow = Number.parseFloat(glowRange.value);
  songApp.render({ time, dt, userGlow });
  updateLyrics(time);

  const duration = transport.duration(musicMap.duration);
  progressBar.style.transform = `scaleX(${clamp(time / duration)})`;
};

const setupInput = () => {
  window.addEventListener("resize", () => songApp.resize());
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
    timingTool.handleKeydown(event);
  });

  audioInput.addEventListener("change", () => {
    const file = audioInput.files?.[0];
    if (!file) return;
    transport.setLocalAudio(file);
  });
};

const reportBootError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  dataStatus.textContent = `起動エラー: ${message}`;
  console.error(error);
};

const boot = async () => {
  try {
    transport = new Transport(audio, setPlayingIcon);
    musicMap = await loadMusicMap();
    songContext = createSongAdapterContext(musicMap);
    songApp = await createSongApp(songContext, { canvas, ctx });
    document.title = `${musicMap.title} - Music Effect`;
    songTitle.textContent = musicMap.title;
    songArtist.textContent = musicMap.artist;
    timingTool = new LyricTimingTool({
      elements,
      musicMap,
      transport,
      onSeek: updateLyrics,
      resetVisualTiming: () => songApp.resetVisualTiming?.()
    });
    songApp.resize();
    setupInput();
    timingTool.bindControls();
    timingTool.initialize();
    const audioPath = await findBundledAudio(musicMap);
    if (audioPath) transport.setAudioPath(audioPath);
    const adapterStatus = songApp.status ? ` / ${songApp.status}` : "";
    dataStatus.textContent = musicMap.warnings.length
      ? `${musicMap.title}: ${musicMap.warnings.join(" / ")}${adapterStatus}`
      : `${musicMap.title}: song pack ready${adapterStatus}`;
    startFrameLoop(tick);
  } catch (error) {
    reportBootError(error);
  }
};

void boot();
