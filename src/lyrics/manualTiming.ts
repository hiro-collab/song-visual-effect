import type { LyricCue, LyricKeyframe, LyricTimingExport, MusicMap } from "../types";

export const clampTime = (time: number, duration: number) => Math.min(Math.max(time, 0), duration);

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
    if (current.time <= previous.time + 0.12 && !keyframeByIndex.has(current.index ?? index)) {
      current.time = previous.time + 0.12;
    }
  }

  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index];
    const next = cues[index + 1];
    cue.end = next ? Math.max(next.time, cue.time + 0.12) : Math.max(duration, cue.time + 0.8);
  }

  return cues;
};

export const makeTimingExport = (musicMap: MusicMap, keyframes: LyricKeyframe[]): LyricTimingExport => {
  const normalized = normalizeKeyframes(keyframes, musicMap.lyricLines, musicMap.duration);
  const lyrics = buildLyricsFromKeyframes(musicMap.lyricLines, normalized, musicMap.duration, musicMap.lyrics).map((cue) => ({
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
    note: "Manual lyric keyframes recorded from keyboard input. This file contains no audio analysis or AI training data.",
    keyframes: normalized.map((keyframe) => ({
      index: keyframe.index,
      at: roundTime(keyframe.time),
      text: keyframe.text
    })),
    lyrics
  };
};

const roundTime = (time: number) => Math.round(time * 1000) / 1000;
