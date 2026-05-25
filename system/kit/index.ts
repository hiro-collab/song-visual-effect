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
  LyricTextParseMode,
  LyricTimingAudioRef,
  LyricTimingCharacter,
  LyricTimingExportV2,
  LyricTimingExportPhrase,
  LyricTimingIssue,
  LyricTimingIssueLevel,
  LyricTimingPhrase,
  LyricTimingProject,
  LyricTimingProjectLine,
  LyricTimingProjectLineKind,
  LyricTimingWord
} from "./lyrics";
export {
  LYRIC_TIMING_EXPORT_SCHEMA,
  LYRIC_TIMING_PROJECT_SCHEMA,
  LYRIC_TIMING_RIGHTS_NOTICE,
  createLyricTimingProject,
  lyricTimingExportToLyricCues,
  makeLyricTimingExport,
  parseLyricText,
  updateLyricTimingProjectMetadata,
  validateLyricTimingProject
} from "./lyrics";
export { ColorRamp, DEFAULT_PALETTE } from "./render/palette";
export { DampValue, clamp, decayPulse, smoothstep } from "./render/damping";
