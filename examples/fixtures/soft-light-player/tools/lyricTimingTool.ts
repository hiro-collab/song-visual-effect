import type { AppElements } from "../dom";
import {
  Transport,
  applyLyricAdjustments,
  buildLyricsFromKeyframes,
  clampTime,
  clamp,
  createLyricCueFingerprint,
  lyricIndexAt,
  LYRIC_ADJUSTMENT_SCHEMA_V1,
  makeTimingExport,
  normalizeAdjustments,
  normalizeKeyframes,
  summarizeLyricAdjustments,
  type LyricCue,
  type LyricCueAdjustment,
  type LyricKeyframe,
  type LyricTimingAdjustments,
  type MusicMap
} from "../../../../system/kit";

type TimingSnapshot = {
  keyframes: LyricKeyframe[];
  adjustments: LyricTimingAdjustments;
};

type SequenceStoneElement = {
  ghost: HTMLDivElement;
  link: HTMLDivElement;
  stone: HTMLDivElement;
};

type LyricTimingToolOptions = {
  elements: AppElements;
  musicMap: MusicMap;
  transport: Transport;
  onSeek: (time: number) => void;
  resetVisualTiming: () => void;
};

const formatOffset = (offset: number) => `${offset >= 0 ? "+" : ""}${offset.toFixed(3)}s`;
const formatTime = (time: number) => `${time.toFixed(3)}s`;

export class LyricTimingTool {
  private baseLyrics: LyricCue[] = [];
  private rawLyrics: LyricCue[] = [];
  private workingLyrics: LyricCue[] = [];
  private manualKeyframes: LyricKeyframe[] = [];
  private lyricAdjustments: LyricTimingAdjustments = { globalOffset: 0, ranges: [] };
  private timingHistory: TimingSnapshot[] = [];
  private timingCapture = false;
  private sequenceSeeking = false;
  private sequenceStoneElements: SequenceStoneElement[] = [];

  constructor(private readonly options: LyricTimingToolOptions) {}

  initialize() {
    this.baseLyrics = this.options.musicMap.lyrics.map((cue) => ({ ...cue }));
    this.manualKeyframes = this.readManualKeyframes();
    this.lyricAdjustments = this.readAdjustments();
    this.rebuildWorkingLyrics();
    this.last.textContent = this.manualKeyframes.length
      ? "保存済みの手動キーフレームを読み込みました"
      : "Off: ボタンまたはTで調整モード";
    this.update(0);
  }

  bindControls() {
    const elements = this.options.elements;
    elements.sequenceBar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.sequenceSeeking = true;
      elements.sequenceBar.classList.add("is-seeking");
      elements.sequenceBar.setPointerCapture(event.pointerId);
      this.seekFromSequencePointer(event);
    });

    elements.sequenceBar.addEventListener("pointermove", (event) => {
      if (!this.sequenceSeeking) return;
      event.preventDefault();
      event.stopPropagation();
      this.seekFromSequencePointer(event, false);
    });

    elements.sequenceBar.addEventListener("pointerup", (event) => {
      if (!this.sequenceSeeking) return;
      event.preventDefault();
      event.stopPropagation();
      this.sequenceSeeking = false;
      elements.sequenceBar.classList.remove("is-seeking");
      this.seekFromSequencePointer(event);
      elements.sequenceBar.releasePointerCapture(event.pointerId);
    });

    elements.sequenceBar.addEventListener("pointercancel", (event) => {
      this.sequenceSeeking = false;
      elements.sequenceBar.classList.remove("is-seeking");
      if (elements.sequenceBar.hasPointerCapture(event.pointerId)) {
        elements.sequenceBar.releasePointerCapture(event.pointerId);
      }
    });

    elements.timingToggle.addEventListener("click", () => this.setCapture(!this.timingCapture));
    elements.timingUndo.addEventListener("click", () => this.undo());
    elements.timingClear.addEventListener("click", () => this.clearKeyframes());
    elements.timingExport.addEventListener("click", () => this.exportTiming());
    elements.timingExportAdjustment.addEventListener("click", () => this.exportAdjustmentWrapper());
    elements.offsetAllEarlierBig.addEventListener("click", () => this.shiftAll(-1));
    elements.offsetAllEarlier.addEventListener("click", () => this.shiftAll(-0.1));
    elements.offsetAllReset.addEventListener("click", () => this.resetAllShift());
    elements.offsetAllLater.addEventListener("click", () => this.shiftAll(0.1));
    elements.offsetAllLaterBig.addEventListener("click", () => this.shiftAll(1));
    elements.offsetFromEarlierBig.addEventListener("click", () => this.shiftFromCurrent(-1));
    elements.offsetFromEarlier.addEventListener("click", () => this.shiftFromCurrent(-0.1));
    elements.offsetFromReset.addEventListener("click", () => this.resetFromCurrentShift());
    elements.offsetFromLater.addEventListener("click", () => this.shiftFromCurrent(0.1));
    elements.offsetFromLaterBig.addEventListener("click", () => this.shiftFromCurrent(1));
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.code === "KeyT") {
      event.preventDefault();
      this.setCapture(!this.timingCapture);
      return true;
    }

    if (!this.timingCapture) return false;

    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      event.preventDefault();
      this.recordKeyframe("current");
      return true;
    }
    if (event.code === "KeyD" || event.code === "ArrowRight") {
      event.preventDefault();
      this.recordKeyframe("next");
      return true;
    }
    if ((event.code === "KeyZ" && event.ctrlKey) || event.code === "Backspace") {
      event.preventDefault();
      this.undo();
      return true;
    }
    return false;
  }

  update(time = this.currentSongTime()) {
    const musicMap = this.options.musicMap;
    const elements = this.options.elements;
    elements.timingPanel.classList.toggle("is-active", this.timingCapture);
    elements.timingToggle.textContent = this.timingCapture ? "On" : "Off";
    elements.timingToggle.setAttribute("aria-pressed", String(this.timingCapture));
    elements.timingCount.textContent = `${this.manualKeyframes.length} / ${musicMap.lyricLines.length}`;

    const index = lyricIndexAt(time, this.workingLyrics);
    const currentIndex = Math.max(0, index);
    const nextIndex = Math.min(musicMap.lyricLines.length - 1, currentIndex + 1);
    const currentText = musicMap.lyricLines[currentIndex] ?? "";
    const nextText = musicMap.lyricLines[nextIndex] ?? "";
    const fromOffset = this.fromRangeForIndex(currentIndex)?.offset ?? 0;
    elements.timingLeft.textContent = `A: #${currentIndex + 1} ${currentText}`;
    elements.timingRight.textContent = `D: #${nextIndex + 1} ${nextText}`;
    elements.timingFromLabel.textContent = `From #${currentIndex + 1}`;
    elements.timingOffsetReadout.textContent = `All ${formatOffset(this.lyricAdjustments.globalOffset)} / From #${currentIndex + 1} ${formatOffset(fromOffset)}`;
    const activeCue = this.workingLyrics[currentIndex];
    elements.sequenceReadout.textContent = activeCue ? `#${currentIndex + 1} / ${formatTime(activeCue.time)}` : "#1 / 0.000s";
    this.updateSequenceStones(time);
  }

  reloadBaseLyrics(message = "補正JSONを基準タイミングへ反映しました") {
    this.baseLyrics = this.options.musicMap.lyrics.map((cue) => ({ ...cue }));
    this.rebuildWorkingLyrics();
    this.last.textContent = message;
    this.update();
  }

  private get last() {
    return this.options.elements.timingLast;
  }

  private currentSongTime() {
    return this.options.transport.currentTime() % this.options.musicMap.duration;
  }

  private storageKey() {
    return `music-effect:lyric-keyframes:v1:${this.options.musicMap.title}`;
  }

  private adjustmentStorageKey() {
    return `music-effect:lyric-adjustments:v1:${this.options.musicMap.title}`;
  }

  private saveManualKeyframes() {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.manualKeyframes));
  }

  private saveAdjustments() {
    localStorage.setItem(this.adjustmentStorageKey(), JSON.stringify(this.lyricAdjustments));
  }

  private readManualKeyframes() {
    const musicMap = this.options.musicMap;
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      const source = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { keyframes?: unknown }).keyframes)
          ? (parsed as { keyframes: unknown[] }).keyframes
          : [];
      return normalizeKeyframes(
        source.map((item) => {
          const object = item as Record<string, unknown>;
          return {
            index: typeof object.index === "number" ? object.index : -1,
            time: typeof object.time === "number" ? object.time : typeof object.at === "number" ? object.at : Number.NaN,
            text: typeof object.text === "string" ? object.text : ""
          };
        }),
        musicMap.lyricLines,
        musicMap.duration
      );
    } catch {
      return [];
    }
  }

  private readAdjustments() {
    try {
      const raw = localStorage.getItem(this.adjustmentStorageKey());
      if (!raw) return { globalOffset: 0, ranges: [] };
      return normalizeAdjustments(JSON.parse(raw) as Partial<LyricTimingAdjustments>, this.options.musicMap.lyricLines.length);
    } catch {
      return { globalOffset: 0, ranges: [] };
    }
  }

  private rebuildWorkingLyrics() {
    const musicMap = this.options.musicMap;
    this.rawLyrics = buildLyricsFromKeyframes(musicMap.lyricLines, this.manualKeyframes, musicMap.duration, this.baseLyrics);
    this.workingLyrics = applyLyricAdjustments(this.rawLyrics, this.lyricAdjustments, musicMap.duration);
    musicMap.lyrics = this.workingLyrics;
    this.updateSequenceStones(this.currentSongTime());
  }

  private applyState(message: string, time = this.currentSongTime()) {
    this.lyricAdjustments = normalizeAdjustments(this.lyricAdjustments, this.options.musicMap.lyricLines.length);
    this.rebuildWorkingLyrics();
    this.saveManualKeyframes();
    this.saveAdjustments();
    this.last.textContent = message;
    this.update(time);
  }

  private offsetForLyricIndex(index: number) {
    const musicMap = this.options.musicMap;
    return this.lyricAdjustments.globalOffset +
      this.lyricAdjustments.ranges.reduce((sum, range) => {
        const rangeEnd = range.endIndex ?? musicMap.lyricLines.length - 1;
        return index >= range.startIndex && index <= rangeEnd ? sum + range.offset : sum;
      }, 0);
  }

  private currentLyricIndex(time = this.currentSongTime()) {
    const index = lyricIndexAt(time, this.workingLyrics);
    return Math.min(Math.max(0, index), Math.max(0, this.options.musicMap.lyricLines.length - 1));
  }

  private fromRangeForIndex(startIndex: number) {
    return this.lyricAdjustments.ranges.find((range) => range.startIndex === startIndex && range.endIndex === undefined);
  }

  private setCapture(enabled: boolean) {
    this.timingCapture = enabled;
    this.last.textContent = enabled
      ? "On: Aで現在行、Dで次行を打刻"
      : "Off: A/D打刻は無効です";
    this.update();
  }

  private pushHistory() {
    this.timingHistory.push({
      keyframes: this.manualKeyframes.map((keyframe) => ({ ...keyframe })),
      adjustments: {
        globalOffset: this.lyricAdjustments.globalOffset,
        ranges: this.lyricAdjustments.ranges.map((range) => ({ ...range }))
      }
    });
    if (this.timingHistory.length > 80) this.timingHistory = this.timingHistory.slice(-80);
  }

  private seekTo(time: number, announce = true) {
    const target = clampTime(time, this.options.musicMap.duration);
    const progress = this.options.transport.seek(target, this.options.musicMap.duration);
    this.options.resetVisualTiming();
    this.options.onSeek(target);
    this.options.elements.progressBar.style.transform = `scaleX(${progress})`;
    if (announce) this.last.textContent = `Seek ${formatTime(target)}`;
    this.update(target);
  }

  private seekFromSequencePointer(event: PointerEvent, announce = true) {
    const rect = this.options.elements.sequenceBar.getBoundingClientRect();
    const ratio = rect.width > 0 ? clamp((event.clientX - rect.left) / rect.width) : 0;
    this.seekTo(ratio * this.options.musicMap.duration, announce);
  }

  private ensureSequenceElements() {
    const elements = this.options.elements;
    if (this.sequenceStoneElements.length === this.workingLyrics.length) return;
    elements.sequenceStones.replaceChildren();
    this.sequenceStoneElements = this.workingLyrics.map((cue, index) => {
      const ghost = document.createElement("div");
      const link = document.createElement("div");
      const stone = document.createElement("div");
      ghost.className = "lyric-ghost";
      link.className = "lyric-shift-link";
      stone.className = "lyric-stone";
      stone.title = `#${index + 1} ${cue.text}`;
      elements.sequenceStones.append(ghost, link, stone);
      return { ghost, link, stone };
    });
  }

  private updateSequenceStones(time: number) {
    const musicMap = this.options.musicMap;
    const elements = this.options.elements;
    if (!this.rawLyrics.length || !this.workingLyrics.length) return;
    this.ensureSequenceElements();
    const activeIndex = lyricIndexAt(time, this.workingLyrics);
    const manualIndexes = new Set(this.manualKeyframes.map((keyframe) => keyframe.index));
    const duration = Math.max(1, musicMap.duration);
    elements.sequenceProgress.style.transform = `translateX(${clamp(time / duration) * elements.sequenceBar.clientWidth}px)`;

    for (let index = 0; index < this.sequenceStoneElements.length; index++) {
      const rawCue = this.rawLyrics[index];
      const workingCue = this.workingLyrics[index];
      const stoneElements = this.sequenceStoneElements[index];
      if (!rawCue || !workingCue) continue;

      const rawPercent = clamp(rawCue.time / duration) * 100;
      const adjustedPercent = clamp(workingCue.time / duration) * 100;
      const left = Math.min(rawPercent, adjustedPercent);
      const widthPercent = Math.abs(adjustedPercent - rawPercent);
      const affected = Math.abs(this.offsetForLyricIndex(index)) > 0.001 || Math.abs(adjustedPercent - rawPercent) > 0.02;

      stoneElements.ghost.style.left = `${rawPercent}%`;
      stoneElements.link.style.left = `${left}%`;
      stoneElements.link.style.width = `${widthPercent}%`;
      stoneElements.stone.style.left = `${adjustedPercent}%`;
      stoneElements.link.classList.toggle("is-shifted", affected);
      stoneElements.stone.classList.toggle("is-manual", manualIndexes.has(index));
      stoneElements.stone.classList.toggle("is-affected", affected);
      stoneElements.stone.classList.toggle("is-active", index === activeIndex);
      stoneElements.stone.title = `#${index + 1} ${formatTime(workingCue.time)} ${workingCue.text}`;
    }
  }

  private shiftAll(delta: number) {
    this.pushHistory();
    this.lyricAdjustments = normalizeAdjustments(
      { ...this.lyricAdjustments, globalOffset: this.lyricAdjustments.globalOffset + delta },
      this.options.musicMap.lyricLines.length
    );
    this.applyState(`All ${formatOffset(this.lyricAdjustments.globalOffset)}: 全ストーンを補正しました`);
  }

  private resetAllShift() {
    this.pushHistory();
    this.lyricAdjustments = normalizeAdjustments({ ...this.lyricAdjustments, globalOffset: 0 }, this.options.musicMap.lyricLines.length);
    this.applyState("All offsetを0に戻しました");
  }

  private shiftFromCurrent(delta: number) {
    const musicMap = this.options.musicMap;
    const startIndex = this.currentLyricIndex();
    this.pushHistory();
    const existing = this.fromRangeForIndex(startIndex);
    const ranges = this.lyricAdjustments.ranges.filter((range) => !(range.startIndex === startIndex && range.endIndex === undefined));
    const nextOffset = (existing?.offset ?? 0) + delta;
    this.lyricAdjustments = normalizeAdjustments(
      {
        ...this.lyricAdjustments,
        ranges: [...ranges, { startIndex, offset: nextOffset }]
      },
      musicMap.lyricLines.length
    );
    this.applyState(`From #${startIndex + 1} ${formatOffset(nextOffset)}: 以降のストーンを補正しました`);
  }

  private resetFromCurrentShift() {
    const startIndex = this.currentLyricIndex();
    const existing = this.fromRangeForIndex(startIndex);
    if (!existing) {
      this.last.textContent = `From #${startIndex + 1} の補正はありません`;
      this.update();
      return;
    }
    this.pushHistory();
    this.lyricAdjustments = normalizeAdjustments(
      {
        ...this.lyricAdjustments,
        ranges: this.lyricAdjustments.ranges.filter((range) => !(range.startIndex === startIndex && range.endIndex === undefined))
      },
      this.options.musicMap.lyricLines.length
    );
    this.applyState(`From #${startIndex + 1} offsetを0に戻しました`);
  }

  private recordKeyframe(direction: "current" | "next") {
    const musicMap = this.options.musicMap;
    if (!musicMap.lyricLines.length) return;
    const time = this.currentSongTime();
    const activeIndex = lyricIndexAt(time, this.workingLyrics);
    const baseIndex = activeIndex >= 0 ? activeIndex : 0;
    const targetIndex =
      direction === "current"
        ? Math.max(0, baseIndex)
        : Math.min(musicMap.lyricLines.length - 1, baseIndex + 1);

    this.pushHistory();
    const storedTime = clampTime(time - this.offsetForLyricIndex(targetIndex), musicMap.duration);
    const nextKeyframe: LyricKeyframe = {
      index: targetIndex,
      time: storedTime,
      text: musicMap.lyricLines[targetIndex] ?? ""
    };
    this.manualKeyframes = normalizeKeyframes(
      [...this.manualKeyframes.filter((keyframe) => keyframe.index !== targetIndex), nextKeyframe],
      musicMap.lyricLines,
      musicMap.duration
    );
    this.rebuildWorkingLyrics();
    this.saveManualKeyframes();
    this.last.textContent = `${direction === "current" ? "A" : "D"}: #${targetIndex + 1} ${formatTime(time)}`;
    this.update(time);
  }

  private undo() {
    const previous = this.timingHistory.pop();
    if (!previous) {
      this.last.textContent = "Undoできる打刻がありません";
      return;
    }
    this.manualKeyframes = previous.keyframes;
    this.lyricAdjustments = previous.adjustments;
    this.rebuildWorkingLyrics();
    this.saveManualKeyframes();
    this.saveAdjustments();
    this.last.textContent = "1つ前の調整に戻しました";
    this.update();
  }

  private clearKeyframes() {
    if (!this.manualKeyframes.length) {
      this.last.textContent = "消去する打刻がありません";
      return;
    }
    this.pushHistory();
    this.manualKeyframes = [];
    this.applyState("手動キーフレームを消去しました");
  }

  private downloadJson(payload: unknown, filename: string) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private exportTiming() {
    const payload = makeTimingExport(this.options.musicMap, this.manualKeyframes, this.lyricAdjustments, this.workingLyrics);
    this.downloadJson(payload, "lyrics_timing.manual.json");
    this.last.textContent = "lyrics_timing.manual.jsonを書き出しました";
  }

  private adjustmentRows(): LyricCueAdjustment[] {
    const rows: LyricCueAdjustment[] = [];
    for (let index = 0; index < this.workingLyrics.length; index += 1) {
      const baseCue = this.baseLyrics[index];
      const workingCue = this.workingLyrics[index];
      if (!baseCue || !workingCue) continue;
      const startOffsetMs = Math.round((workingCue.time - baseCue.time) * 1000);
      const endOffsetMs = Math.round((workingCue.end - baseCue.end) * 1000);
      if (startOffsetMs === 0 && endOffsetMs === 0) continue;
      rows.push({
        cueId: baseCue.id ?? workingCue.id,
        index: baseCue.index ?? workingCue.index ?? index,
        startOffsetMs,
        endOffsetMs
      });
    }
    return rows;
  }

  private exportAdjustmentWrapper() {
    const musicMap = this.options.musicMap;
    const songPackId = musicMap.source.manifest.id;
    const safeId = songPackId.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "song";
    const adjustments = this.adjustmentRows();
    const payload = {
      schema: LYRIC_ADJUSTMENT_SCHEMA_V1,
      encoding: "utf-8",
      messageLanguage: "en",
      createdAt: new Date().toISOString(),
      createdBy: "music-effect rehearsal helper",
      target: {
        songPackId,
        visualId: songPackId,
        slug: songPackId,
        timingSchema: "music-effect.lyrics-timing.v2",
        sourceFingerprint: createLyricCueFingerprint(this.baseLyrics)
      },
      summary: summarizeLyricAdjustments(adjustments),
      adjustments
    };
    const filename = `lyric-adjustment.${safeId}.json`;
    this.downloadJson(payload, filename);
    this.last.textContent = `${filename}を書き出しました`;
  }
}
