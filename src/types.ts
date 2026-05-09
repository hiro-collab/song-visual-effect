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
  index?: number;
  time: number;
  end: number;
  text: string;
};

export type LyricKeyframe = {
  index: number;
  time: number;
  text: string;
};

export type LyricTimingExport = {
  schema: "music-effect.lyrics-timing.v1";
  title: string;
  artist: string;
  duration: number;
  generatedAt: string;
  note: string;
  keyframes: Array<{ index: number; at: number; text: string }>;
  lyrics: Array<{ index: number; start: number; end: number; text: string }>;
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
};

export type PointerState = {
  x: number;
  y: number;
  active: boolean;
  down: boolean;
};
