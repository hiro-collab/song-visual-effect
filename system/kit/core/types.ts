export type Range = {
  start: number;
  end: number;
  intensity?: number;
};

export type Beat = {
  time: number;
  duration: number;
  position?: number;
  bpm?: number;
};

export type LyricCue = {
  id?: string;
  index?: number;
  sourceLine?: number;
  time: number;
  end: number;
  text: string;
};

export type LyricKeyframe = {
  index: number;
  time: number;
  text: string;
};

export type LyricOffsetRange = {
  startIndex: number;
  endIndex?: number;
  offset: number;
};

export type LyricTimingAdjustments = {
  globalOffset: number;
  ranges: LyricOffsetRange[];
};

export type LyricTimingExport = {
  schema: "music-effect.lyrics-timing.v1";
  timeUnit: "seconds";
  title: string;
  artist: string;
  duration: number;
  durationSec: number;
  generatedAt: string;
  note: string;
  adjustments: LyricTimingAdjustments;
  keyframes: Array<{ index: number; at: number; atSec: number; text: string }>;
  lyrics: Array<{ index: number; start: number; end: number; startSec: number; endSec: number; text: string }>;
};

export type Palette = {
  base: string[];
  accent: string[];
  shadow: string[];
};

export type Markers = {
  estimatedDuration?: number;
  warmSections?: Range[];
  lineEmphasis?: Array<{ time: number; duration: number; intensity?: number }>;
};

export type SongManifest = {
  schema?: "music-effect.song-manifest.v1" | string;
  id: string;
  title: string;
  artist: string;
  duration?: number;
  credits?: string | null;
  references?: string | null;
  lyrics?: string | null;
  analysis?: {
    song?: string | null;
    beat?: string | null;
    chord?: string | null;
    melody?: string | null;
    chorus?: string | null;
    timing?: string | null;
    markers?: string | null;
    palette?: string | null;
  };
  audio?: string | null;
  design?: {
    effect?: string | null;
    cues?: string | null;
  };
  webAdapter?: string | null;
};

export type MusicSource = {
  manifestUrl: string;
  baseUrl: string;
  manifest: SongManifest;
  audioUrl?: string;
  creditsUrl?: string;
  effectDesignUrl?: string;
  designCuesUrl?: string;
};

export type MusicMap = {
  title: string;
  artist: string;
  duration: number;
  beats: Beat[];
  chorus: Range[];
  lyrics: LyricCue[];
  lyricLines: string[];
  markers: Markers;
  palette: Palette;
  warnings: string[];
  source: MusicSource;
};

export type PointerState = {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
};
