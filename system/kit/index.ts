export type {
  Beat,
  LyricCue,
  LyricKeyframe,
  LyricOffsetRange,
  LyricTimingAdjustments,
  LyricTimingExport,
  Markers,
  MusicMap,
  MusicSource,
  Palette,
  PointerState,
  Range,
  SongManifest
} from "./types";
export { findBundledAudio, getSongManifestUrl, loadMusicMap, resolveSourcePath } from "./assets";
export {
  DEFAULT_MAX_JSON_BYTES,
  DEFAULT_MAX_TEXT_BYTES,
  JSON_HEADERS,
  fetchBoundedJson,
  fetchBoundedText,
  isWithinBaseUrl,
  resolveHttpUrl,
  resolveWithinBaseUrl
} from "./safeFetch";
export type { SongAdapterContext, SongAssetReader } from "./songAdapterContext";
export { createSongAdapterContext } from "./songAdapterContext";
export type {
  SongApp,
  SongAppContentRect,
  SongAppFactory,
  SongAppFrame,
  SongAppServices,
  SongAppThreeServices,
  SongVisualHost,
  SongVisualLayer,
  SongVisualLayerOptions
} from "./songApp";
export { createVisualHost } from "./visualHost";
export type { CanvasScene, CanvasSceneOptions, CanvasScenePointer, TextFitOptions, TextFitResult } from "./contentRect";
export { createCanvasScene, fitTextToRect, resizeCanvasToDisplaySize, withContentRect } from "./contentRect";
export { Transport } from "./transport";
export { startFrameLoop } from "./frameLoop";
export { activeRange, beatAt, emphasisAt, lyricAt, lyricIndexAt } from "./timing";
export type { BeatSyncFrameInput, BeatSyncReaderOptions, BeatSyncSource, BeatSyncState } from "./beatSync";
export {
  createBeatSyncReader,
  estimateBeatBpm,
  getBeatSyncState,
  normalizeBeatGrid,
  normalizeBeatSyncSource
} from "./beatSync";
export {
  applyLyricAdjustments,
  buildLyricsFromKeyframes,
  clampTime,
  makeTimingExport,
  normalizeAdjustments,
  normalizeKeyframes
} from "./manualTiming";
export { ColorRamp, DEFAULT_PALETTE } from "./palette";
export { DampValue, clamp, decayPulse, smoothstep } from "./damping";
