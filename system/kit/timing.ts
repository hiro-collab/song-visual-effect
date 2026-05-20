import type { Beat, LyricCue, MusicMap, Range } from "./types";
import { clamp, decayPulse, smoothstep } from "./damping";

export const activeRange = (time: number, ranges: Range[]) => {
  let value = 0;
  for (const range of ranges) {
    if (time >= range.start && time <= range.end) {
      const fadeIn = smoothstep(range.start, range.start + 2, time);
      const fadeOut = 1 - smoothstep(range.end - 2, range.end, time);
      value = Math.max(value, fadeIn * fadeOut * (range.intensity ?? 1));
    }
  }
  return clamp(value);
};

export const emphasisAt = (time: number, musicMap: MusicMap) => {
  let value = 0;
  for (const marker of musicMap.markers.lineEmphasis ?? []) {
    const age = time - marker.time;
    if (age >= 0 && age <= marker.duration) {
      value = Math.max(value, (1 - age / marker.duration) * (marker.intensity ?? 1));
    }
  }
  return value;
};

export const beatAt = (time: number, beats: Beat[]) => {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (beats[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  const index = Math.max(0, hi);
  const beat = beats[index];
  return {
    index,
    pulse: beat ? decayPulse(time - beat.time, Math.max(0.24, beat.duration * 1.2)) : 0
  };
};

export const lyricAt = (time: number, lyrics: LyricCue[]) => {
  const index = lyrics.findIndex((cue) => time >= cue.time && time < cue.end);
  return {
    index,
    current: index >= 0 ? lyrics[index] : null,
    next: lyrics[index + 1] ?? null
  };
};

export const lyricIndexAt = (time: number, lyrics: LyricCue[]) => {
  if (!lyrics.length) return -1;
  if (time < lyrics[0].time) return -1;
  let lo = 0;
  let hi = lyrics.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (lyrics[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.max(-1, hi);
};
