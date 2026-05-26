import type { LyricCue } from "../core/types";

export const LYRIC_ADJUSTMENT_SCHEMA_V1 = "music-effect.lyric-adjustment.v1";
export const LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1 = "music-effect.lyric-adjustment-bundle.v1";

export type LyricAdjustmentTarget = {
  songPackId?: string;
  visualId?: string;
  slug?: string;
  timingSchema?: string;
  sourceFingerprint?: string;
};

export type LyricCueAdjustment = {
  cueId?: string;
  index?: number;
  startOffsetMs?: number;
  endOffsetMs?: number;
};

export type LyricAdjustmentSummary = {
  adjustedCueCount: number;
  maxAbsOffsetMs: number;
  hasEndOffsets: boolean;
};

export type LyricAdjustmentDocument = {
  schema: typeof LYRIC_ADJUSTMENT_SCHEMA_V1;
  createdAt?: string;
  createdBy?: string;
  target: LyricAdjustmentTarget;
  summary?: LyricAdjustmentSummary;
  adjustments: LyricCueAdjustment[];
};

export type LyricAdjustmentBundle = {
  schema: typeof LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1;
  createdAt?: string;
  createdBy?: string;
  items: Array<Omit<LyricAdjustmentDocument, "schema">>;
};

export type LyricCueFingerprintItem = [
  cueId: string | null,
  index: number | null,
  startTimeMs: number,
  endTimeMs: number,
  sourceLine: number | null
];

const toStableMs = (seconds: number): number => Math.round(seconds * 1000);

export const normalizeLyricCueFingerprintItems = (lyrics: readonly LyricCue[]): LyricCueFingerprintItem[] =>
  lyrics.map((cue, fallbackIndex) => [
    cue.id ?? null,
    cue.index ?? fallbackIndex,
    toStableMs(cue.time),
    toStableMs(cue.end),
    cue.sourceLine ?? null
  ]);

const fnv1a32 = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const createLyricCueFingerprint = (lyrics: readonly LyricCue[]): string => {
  const source = JSON.stringify(normalizeLyricCueFingerprintItems(lyrics));
  return `fnv1a32:${fnv1a32(source)}`;
};

export const summarizeLyricAdjustments = (adjustments: readonly LyricCueAdjustment[]): LyricAdjustmentSummary => {
  let adjustedCueCount = 0;
  let maxAbsOffsetMs = 0;
  let hasEndOffsets = false;

  for (const adjustment of adjustments) {
    const startOffsetMs = adjustment.startOffsetMs ?? 0;
    const endOffsetMs = adjustment.endOffsetMs ?? 0;
    if (startOffsetMs !== 0 || endOffsetMs !== 0) {
      adjustedCueCount += 1;
    }
    if (endOffsetMs !== 0) {
      hasEndOffsets = true;
    }
    maxAbsOffsetMs = Math.max(maxAbsOffsetMs, Math.abs(startOffsetMs), Math.abs(endOffsetMs));
  }

  return { adjustedCueCount, maxAbsOffsetMs, hasEndOffsets };
};
