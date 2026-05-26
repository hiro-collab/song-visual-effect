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
} from "./core/types";
export { findBundledAudio, getSongManifestUrl, loadMusicMap, resolveSourcePath } from "./core/assets";
export {
  DEFAULT_MAX_JSON_BYTES,
  DEFAULT_MAX_TEXT_BYTES,
  JSON_HEADERS,
  fetchBoundedJson,
  fetchBoundedText,
  isWithinBaseUrl,
  resolveHttpUrl,
  resolveWithinBaseUrl
} from "./core/safeFetch";
export type { SongAdapterContext, SongAssetReader } from "./song-app/songAdapterContext";
export { createSongAdapterContext } from "./song-app/songAdapterContext";
export type {
  SongApp,
  SongAppContentRect,
  SongAppFactory,
  SongAppFrame,
  SongAppServices,
  SongVisualHost,
  SongVisualLayer,
  SongVisualLayerOptions
} from "./song-app/songApp";
export { createVisualHost } from "./render/visualHost";
export type { CanvasScene, CanvasSceneOptions, CanvasScenePointer, TextFitOptions, TextFitResult } from "./render/contentRect";
export { createCanvasScene, fitTextToRect, resizeCanvasToDisplaySize, withContentRect } from "./render/contentRect";
export type { SongAppThreeServices } from "./render/threeServices";
export { Transport } from "./core/transport";
export { startFrameLoop } from "./core/frameLoop";
export type {
  VisualSequencer,
  VisualSequencerMode,
  VisualSequencerOptions,
  VisualSequencerSnapshot,
  VisualSequencerState
} from "./core/visualSequencer";
export { createVisualSequencer } from "./core/visualSequencer";
export { activeRange, beatAt, emphasisAt, lyricAt, lyricIndexAt } from "./timing/timing";
export type { BeatSyncFrameInput, BeatSyncReaderOptions, BeatSyncSource, BeatSyncState } from "./timing/beatSync";
export {
  createBeatSyncReader,
  estimateBeatBpm,
  getBeatSyncState,
  normalizeBeatGrid,
  normalizeBeatSyncSource
} from "./timing/beatSync";
export {
  applyLyricAdjustments,
  buildLyricsFromKeyframes,
  clampTime,
  makeTimingExport,
  normalizeAdjustments,
  normalizeKeyframes
} from "./timing/manualTiming";
export type {
  ApplyLyricAdjustmentOptions,
  ApplyLyricAdjustmentResult,
  LyricAdjustmentBundle,
  LyricAdjustmentDocument,
  LyricAdjustmentDiagnostics,
  LyricAdjustmentIssue,
  LyricAdjustmentIssueLevel,
  LyricAdjustmentSummary,
  LyricAdjustmentTarget,
  LyricCueAdjustment,
  LyricCueFingerprintItem
} from "./timing/lyricAdjustment";
export {
  applyLyricAdjustment,
  createLyricCueFingerprint,
  DEFAULT_LYRIC_ADJUSTMENT_MIN_CUE_DURATION_SEC,
  LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1,
  LYRIC_ADJUSTMENT_SCHEMA_V1,
  normalizeLyricCueFingerprintItems,
  summarizeLyricAdjustments
} from "./timing/lyricAdjustment";
export { ColorRamp, DEFAULT_PALETTE } from "./render/palette";
export { DampValue, clamp, decayPulse, smoothstep } from "./render/damping";
