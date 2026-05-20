import type { LyricCue, LyricKeyframe, LyricTimingAdjustments, LyricTimingExport, MusicMap } from "./types";

export const clampTime = (time: number, duration: number) => Math.min(Math.max(time, 0), duration);

const MIN_GAP = 0.12;

export const normalizeKeyframes = (keyframes: LyricKeyframe[], lyricLines: string[], duration: number) => {
  const byIndex = new Map<number, LyricKeyframe>();
  for (const keyframe of keyframes) {
    if (!Number.isFinite(keyframe.time)) continue;
    if (keyframe.index < 0 || keyframe.index >= lyricLines.length) continue;
    byIndex.set(keyframe.index, {
      index: keyframe.index,
      time: clampTime(keyframe.time, duration),
      text: lyricLines[keyframe.index] ?? keyframe.text
    });
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
};

export const buildLyricsFromKeyframes = (
  lyricLines: string[],
  keyframes: LyricKeyframe[],
  duration: number,
  fallbackLyrics: LyricCue[]
) => {
  const normalized = normalizeKeyframes(keyframes, lyricLines, duration);
  if (!normalized.length) return fallbackLyrics;

  const keyframeByIndex = new Map(normalized.map((keyframe) => [keyframe.index, keyframe]));
  const fallbackByIndex = new Map(fallbackLyrics.map((cue, index) => [cue.index ?? index, cue]));
  const cues = lyricLines.map<LyricCue>((line, index) => {
    const keyframe = keyframeByIndex.get(index);
    const fallback = fallbackByIndex.get(index);
    return {
      index,
      time: keyframe?.time ?? fallback?.time ?? (duration / Math.max(1, lyricLines.length)) * index,
      end: fallback?.end ?? duration,
      text: line
    };
  });

  for (let index = 1; index < cues.length; index++) {
    const previous = cues[index - 1];
    const current = cues[index];
    if (current.time <= previous.time + MIN_GAP && !keyframeByIndex.has(current.index ?? index)) {
      current.time = previous.time + MIN_GAP;
    }
  }

  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    const next = cues[index + 1];
    cue.end = next ? Math.max(next.time, cue.time + MIN_GAP) : Math.max(duration, cue.time + 0.8);
  }

  return cues;
};

export const normalizeAdjustments = (
  adjustments: Partial<LyricTimingAdjustments> | null | undefined,
  lyricLineCount: number
): LyricTimingAdjustments => {
  const globalOffset = clampOffset(typeof adjustments?.globalOffset === "number" ? adjustments.globalOffset : 0);
  const ranges =
    adjustments?.ranges
      ?.map((range) => ({
        startIndex: Math.trunc(range.startIndex),
        endIndex: typeof range.endIndex === "number" ? Math.trunc(range.endIndex) : undefined,
        offset: clampOffset(range.offset)
      }))
      .filter((range) => {
        if (!Number.isFinite(range.offset) || Math.abs(range.offset) < 0.001) return false;
        if (range.startIndex < 0 || range.startIndex >= lyricLineCount) return false;
        return range.endIndex === undefined || range.endIndex >= range.startIndex;
      }) ?? [];

  return { globalOffset, ranges };
};

export const applyLyricAdjustments = (
  lyrics: LyricCue[],
  adjustments: LyricTimingAdjustments,
  duration: number
): LyricCue[] => {
  const normalized = normalizeAdjustments(adjustments, lyrics.length);
  const adjusted = lyrics.map<LyricCue>((cue, fallbackIndex) => {
    const index = cue.index ?? fallbackIndex;
    const rangeOffset = normalized.ranges.reduce((sum, range) => {
      const rangeEnd = range.endIndex ?? lyrics.length - 1;
      return index >= range.startIndex && index <= rangeEnd ? sum + range.offset : sum;
    }, 0);
    return {
      ...cue,
      time: clampTime(cue.time + normalized.globalOffset + rangeOffset, duration)
    };
  });

  adjusted.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (let index = 1; index < adjusted.length; index++) {
    const previous = adjusted[index - 1];
    const current = adjusted[index];
    if (current.time <= previous.time + MIN_GAP) {
      current.time = Math.min(duration, previous.time + MIN_GAP);
    }
  }
  for (let index = 0; index < adjusted.length; index++) {
    const cue = adjusted[index];
    const next = adjusted[index + 1];
    cue.end = next ? Math.max(next.time, cue.time + MIN_GAP) : Math.max(duration, cue.time + 0.8);
  }
  return adjusted;
};

export const makeTimingExport = (
  musicMap: MusicMap,
  keyframes: LyricKeyframe[],
  adjustments: LyricTimingAdjustments = { globalOffset: 0, ranges: [] },
  exportedLyrics?: LyricCue[]
): LyricTimingExport => {
  const normalized = normalizeKeyframes(keyframes, musicMap.lyricLines, musicMap.duration);
  const normalizedAdjustments = normalizeAdjustments(adjustments, musicMap.lyricLines.length);
  const lyrics = (exportedLyrics ?? applyLyricAdjustments(
    buildLyricsFromKeyframes(musicMap.lyricLines, normalized, musicMap.duration, musicMap.lyrics),
    normalizedAdjustments,
    musicMap.duration
  )).map((cue) => ({
      index: cue.index ?? 0,
      start: roundTime(cue.time),
      end: roundTime(cue.end),
      text: cue.text
    }));

  return {
    schema: "music-effect.lyrics-timing.v1",
    title: musicMap.title,
    artist: musicMap.artist,
    duration: roundTime(musicMap.duration),
    generatedAt: new Date().toISOString(),
    note: "Manual lyric keyframes and display offsets recorded from UI input. This file contains no audio analysis or AI training data.",
    adjustments: {
      globalOffset: roundTime(normalizedAdjustments.globalOffset),
      ranges: normalizedAdjustments.ranges.map((range) => ({
        startIndex: range.startIndex,
        endIndex: range.endIndex,
        offset: roundTime(range.offset)
      }))
    },
    keyframes: normalized.map((keyframe) => ({
      index: keyframe.index,
      at: roundTime(keyframe.time),
      text: keyframe.text
    })),
    lyrics
  };
};

const clampOffset = (offset: number) => {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(-30, Math.min(30, offset));
};

const roundTime = (time: number) => Math.round(time * 1000) / 1000;
