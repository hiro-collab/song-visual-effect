import type { LyricCue } from "../core/types";

export const LYRIC_ADJUSTMENT_SCHEMA_V1 = "music-effect.lyric-adjustment.v1";
export const LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1 = "music-effect.lyric-adjustment-bundle.v1";
export const DEFAULT_LYRIC_ADJUSTMENT_MIN_CUE_DURATION_SEC = 0.05;

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
  encoding?: "utf-8" | string;
  messageLanguage?: "en" | string;
  createdAt?: string;
  createdBy?: string;
  target: LyricAdjustmentTarget;
  summary?: LyricAdjustmentSummary;
  adjustments: LyricCueAdjustment[];
};

export type LyricAdjustmentBundle = {
  schema: typeof LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1;
  encoding?: "utf-8" | string;
  messageLanguage?: "en" | string;
  createdAt?: string;
  createdBy?: string;
  items: Array<Omit<LyricAdjustmentDocument, "schema">>;
};

export type LyricAdjustmentIssueLevel = "info" | "warning" | "error";

export type LyricAdjustmentIssue = {
  level: LyricAdjustmentIssueLevel;
  code: string;
  message: string;
  cueId?: string;
  index?: number;
  details?: Record<string, string | number | boolean | null>;
};

export type LyricAdjustmentDiagnostics = {
  status: "ok" | "warning" | "error";
  sourceFingerprint: string | null;
  targetFingerprint: string | null;
  fingerprintMatched: boolean | null;
  matchedBy: "cueId" | "index" | "mixed" | "none";
  appliedCount: number;
  skippedCount: number;
  fallbackCount: number;
  clampedCount: number;
  issues: LyricAdjustmentIssue[];
};

export type ApplyLyricAdjustmentOptions = {
  songPackId?: string;
  visualId?: string;
  slug?: string;
  duration?: number;
  minCueDurationSec?: number;
};

export type ApplyLyricAdjustmentResult = {
  lyrics: LyricCue[];
  diagnostics: LyricAdjustmentDiagnostics;
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

const issue = (
  issues: LyricAdjustmentIssue[],
  level: LyricAdjustmentIssueLevel,
  code: string,
  message: string,
  extra: Omit<LyricAdjustmentIssue, "level" | "code" | "message"> = {}
) => {
  issues.push({ level, code, message, ...extra });
};

const diagnosticsStatus = (issues: readonly LyricAdjustmentIssue[]): LyricAdjustmentDiagnostics["status"] => {
  if (issues.some((item) => item.level === "error")) return "error";
  if (issues.some((item) => item.level === "warning")) return "warning";
  return "ok";
};

const createDiagnostics = (
  lyrics: readonly LyricCue[],
  targetFingerprint: string | null,
  fingerprintMatched: boolean | null,
  appliedCount: number,
  skippedCount: number,
  fallbackCount: number,
  clampedCount: number,
  matchedBy: LyricAdjustmentDiagnostics["matchedBy"],
  issues: LyricAdjustmentIssue[]
): LyricAdjustmentDiagnostics => ({
  status: diagnosticsStatus(issues),
  sourceFingerprint: lyrics.length ? createLyricCueFingerprint(lyrics) : null,
  targetFingerprint,
  fingerprintMatched,
  matchedBy,
  appliedCount,
  skippedCount,
  fallbackCount,
  clampedCount,
  issues
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asFiniteNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const asString = (value: unknown) => (typeof value === "string" ? value : undefined);

const asTarget = (value: unknown): LyricAdjustmentTarget => {
  if (!isRecord(value)) return {};
  return {
    songPackId: asString(value.songPackId),
    visualId: asString(value.visualId),
    slug: asString(value.slug),
    timingSchema: asString(value.timingSchema),
    sourceFingerprint: asString(value.sourceFingerprint)
  };
};

const asAdjustment = (value: unknown, issues: LyricAdjustmentIssue[], arrayIndex: number): LyricCueAdjustment | null => {
  if (!isRecord(value)) {
    issue(
      issues,
      "warning",
      "invalid-adjustment",
      "Adjustment entry is not an object.",
      { index: arrayIndex }
    );
    return null;
  }

  const startOffsetMs = value.startOffsetMs === undefined ? undefined : asFiniteNumber(value.startOffsetMs);
  const endOffsetMs = value.endOffsetMs === undefined ? undefined : asFiniteNumber(value.endOffsetMs);
  if (value.startOffsetMs !== undefined && startOffsetMs === null) {
    issue(issues, "warning", "invalid-start-offset", "startOffsetMs must be a finite number.", { index: arrayIndex });
  }
  if (value.endOffsetMs !== undefined && endOffsetMs === null) {
    issue(issues, "warning", "invalid-end-offset", "endOffsetMs must be a finite number.", { index: arrayIndex });
  }

  return {
    cueId: asString(value.cueId),
    index: asFiniteNumber(value.index) ?? undefined,
    startOffsetMs: startOffsetMs ?? undefined,
    endOffsetMs: endOffsetMs ?? undefined
  };
};

const normalizeDocument = (value: unknown, issues: LyricAdjustmentIssue[]): LyricAdjustmentDocument | null => {
  if (!isRecord(value)) {
    issue(issues, "error", "invalid-document", "Adjustment document is not an object.");
    return null;
  }
  if (value.schema !== LYRIC_ADJUSTMENT_SCHEMA_V1) {
    issue(issues, "error", "unsupported-schema", "Unsupported lyric adjustment schema.");
    return null;
  }

  const adjustments = Array.isArray(value.adjustments)
    ? value.adjustments
        .map((adjustment, index) => asAdjustment(adjustment, issues, index))
        .filter((adjustment): adjustment is LyricCueAdjustment => adjustment !== null)
    : [];
  if (!Array.isArray(value.adjustments)) {
    issue(issues, "warning", "missing-adjustments", "Adjustment document has no adjustments array.");
  }

  return {
    schema: LYRIC_ADJUSTMENT_SCHEMA_V1,
    encoding: asString(value.encoding),
    messageLanguage: asString(value.messageLanguage),
    createdAt: asString(value.createdAt),
    createdBy: asString(value.createdBy),
    target: asTarget(value.target),
    adjustments
  };
};

const targetMatches = (target: LyricAdjustmentTarget, options: ApplyLyricAdjustmentOptions) => {
  if (target.songPackId && (target.songPackId === options.songPackId || target.songPackId === options.visualId)) return true;
  if (target.visualId && (target.visualId === options.visualId || target.visualId === options.songPackId)) return true;
  if (target.slug && target.slug === options.slug) return true;
  return false;
};

const normalizeFromBundle = (
  value: Record<string, unknown>,
  options: ApplyLyricAdjustmentOptions,
  issues: LyricAdjustmentIssue[]
): LyricAdjustmentDocument | null => {
  if (!Array.isArray(value.items)) {
    issue(issues, "error", "invalid-bundle", "Adjustment bundle has no items array.");
    return null;
  }

  const candidates = value.items.filter(isRecord);
  const selected = candidates.find((item) => targetMatches(asTarget(item.target), options));
  if (!selected) {
    issue(issues, "warning", "bundle-target-not-found", "No bundle item matches this song target.");
    return null;
  }

  const adjustments = Array.isArray(selected.adjustments)
    ? selected.adjustments
        .map((adjustment, index) => asAdjustment(adjustment, issues, index))
        .filter((adjustment): adjustment is LyricCueAdjustment => adjustment !== null)
    : [];

  return {
    schema: LYRIC_ADJUSTMENT_SCHEMA_V1,
    encoding: asString(value.encoding),
    messageLanguage: asString(value.messageLanguage),
    createdAt: asString(value.createdAt),
    createdBy: asString(value.createdBy),
    target: asTarget(selected.target),
    adjustments
  };
};

const normalizeAdjustmentInput = (
  value: unknown,
  options: ApplyLyricAdjustmentOptions,
  issues: LyricAdjustmentIssue[]
): LyricAdjustmentDocument | null => {
  if (!isRecord(value)) {
    issue(issues, "error", "invalid-document", "Adjustment input is not an object.");
    return null;
  }
  if (value.schema === LYRIC_ADJUSTMENT_SCHEMA_V1) return normalizeDocument(value, issues);
  if (value.schema === LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1) return normalizeFromBundle(value, options, issues);
  issue(issues, "error", "unsupported-schema", "Unsupported lyric adjustment schema.");
  return null;
};

const cloneCue = (cue: LyricCue): LyricCue => ({ ...cue });

const issueForCue = (
  issues: LyricAdjustmentIssue[],
  level: LyricAdjustmentIssueLevel,
  code: string,
  message: string,
  cue: LyricCue,
  details?: LyricAdjustmentIssue["details"]
) => {
  issue(issues, level, code, message, { cueId: cue.id, index: cue.index, details });
};

export const applyLyricAdjustment = (
  lyrics: readonly LyricCue[],
  input: unknown,
  options: ApplyLyricAdjustmentOptions = {}
): ApplyLyricAdjustmentResult => {
  const issues: LyricAdjustmentIssue[] = [];
  const sourceFingerprint = lyrics.length ? createLyricCueFingerprint(lyrics) : null;
  const document = normalizeAdjustmentInput(input, options, issues);
  const emptyLyrics = lyrics.map(cloneCue);
  if (!document) {
    return {
      lyrics: emptyLyrics,
      diagnostics: createDiagnostics(lyrics, null, null, 0, 0, 0, 0, "none", issues)
    };
  }

  const targetFingerprint = document.target.sourceFingerprint ?? null;
  const fingerprintMatched =
    targetFingerprint && sourceFingerprint ? targetFingerprint === sourceFingerprint : null;
  if (fingerprintMatched === false) {
    issue(issues, "warning", "fingerprint-mismatch", "Fingerprint mismatch. The adjustment may target another timing file.", {
      details: { expectedFingerprint: targetFingerprint, actualFingerprint: sourceFingerprint }
    });
  }

  if (document.encoding && document.encoding.toLowerCase() !== "utf-8") {
    issue(issues, "warning", "non-utf8-encoding", "Adjustment metadata encoding is not utf-8.", {
      details: { encoding: document.encoding }
    });
  }
  if (document.messageLanguage && document.messageLanguage.toLowerCase() !== "en") {
    issue(issues, "warning", "non-english-message-language", "Adjustment metadata messageLanguage is not en.", {
      details: { messageLanguage: document.messageLanguage }
    });
  }

  const indexByCueId = new Map<string, number>();
  lyrics.forEach((cue, cueIndex) => {
    if (cue.id && !indexByCueId.has(cue.id)) indexByCueId.set(cue.id, cueIndex);
  });

  const offsets = new Map<number, { startOffsetMs: number; endOffsetMs: number; by: "cueId" | "index" }>();
  let fallbackCount = 0;
  let skippedCount = 0;
  let cueIdMatched = false;
  let indexMatched = false;

  for (const adjustment of document.adjustments) {
    let targetIndex: number | null = null;
    let matchedBy: "cueId" | "index" | null = null;
    if (adjustment.cueId && indexByCueId.has(adjustment.cueId)) {
      targetIndex = indexByCueId.get(adjustment.cueId) ?? null;
      matchedBy = "cueId";
      cueIdMatched = true;
    } else if (
      adjustment.index !== undefined &&
      Number.isInteger(adjustment.index) &&
      adjustment.index >= 0 &&
      adjustment.index < lyrics.length
    ) {
      targetIndex = adjustment.index;
      matchedBy = "index";
      indexMatched = true;
      if (adjustment.cueId) {
        fallbackCount += 1;
        issue(issues, "warning", "cue-id-fallback-to-index", "cueId did not match; index fallback was used.", {
          cueId: adjustment.cueId,
          index: adjustment.index
        });
      }
    }

    if (targetIndex === null || matchedBy === null) {
      skippedCount += 1;
      issue(issues, "warning", "adjustment-target-not-found", "Adjustment target was not found.", {
        cueId: adjustment.cueId,
        index: adjustment.index
      });
      continue;
    }

    if (offsets.has(targetIndex)) {
      issueForCue(
        issues,
        "warning",
        "duplicate-adjustment-overwrite",
        "Duplicate adjustment target; later entry overwrote earlier entry.",
        lyrics[targetIndex]
      );
    }
    offsets.set(targetIndex, {
      startOffsetMs: adjustment.startOffsetMs ?? 0,
      endOffsetMs: adjustment.endOffsetMs ?? adjustment.startOffsetMs ?? 0,
      by: matchedBy
    });
  }

  const minCueDurationSec = Math.max(0.001, options.minCueDurationSec ?? DEFAULT_LYRIC_ADJUSTMENT_MIN_CUE_DURATION_SEC);
  const duration = typeof options.duration === "number" && Number.isFinite(options.duration) ? options.duration : null;
  let clampedCount = 0;

  const adjustedLyrics = lyrics.map((cue, index): LyricCue => {
    const offset = offsets.get(index);
    if (!offset) return cloneCue(cue);

    let time = cue.time + offset.startOffsetMs / 1000;
    let end = cue.end + offset.endOffsetMs / 1000;

    if (time < 0) {
      issueForCue(issues, "warning", "start-before-zero-clamped", "Adjusted cue start was before zero and was clamped.", cue, {
        adjustedStartSec: time
      });
      time = 0;
      clampedCount += 1;
    }
    if (end < 0) {
      issueForCue(issues, "warning", "end-before-zero-clamped", "Adjusted cue end was before zero and was clamped.", cue, {
        adjustedEndSec: end
      });
      end = minCueDurationSec;
      clampedCount += 1;
    }
    if (duration !== null && end > duration) {
      issueForCue(issues, "warning", "end-after-duration-clamped", "Adjusted cue end exceeded duration and was clamped.", cue, {
        adjustedEndSec: end,
        durationSec: duration
      });
      end = duration;
      clampedCount += 1;
    }
    if (duration !== null && time > duration - minCueDurationSec) {
      issueForCue(issues, "warning", "start-after-duration-clamped", "Adjusted cue start exceeded duration and was clamped.", cue, {
        adjustedStartSec: time,
        durationSec: duration
      });
      time = Math.max(0, duration - minCueDurationSec);
      end = duration;
      clampedCount += 1;
    }
    if (time >= end) {
      issueForCue(issues, "warning", "cue-min-duration-clamped", "Adjusted cue duration was too short and was clamped.", cue, {
        adjustedStartSec: time,
        adjustedEndSec: end,
        minCueDurationSec
      });
      if (duration !== null && time + minCueDurationSec > duration) {
        end = duration;
        time = Math.max(0, duration - minCueDurationSec);
      } else {
        end = time + minCueDurationSec;
      }
      clampedCount += 1;
    }

    return { ...cue, time, end };
  });

  const matchedBy =
    cueIdMatched && indexMatched
      ? "mixed"
      : cueIdMatched
        ? "cueId"
        : indexMatched
          ? "index"
          : "none";

  return {
    lyrics: adjustedLyrics,
    diagnostics: createDiagnostics(
      lyrics,
      targetFingerprint,
      fingerprintMatched,
      offsets.size,
      skippedCount,
      fallbackCount,
      clampedCount,
      matchedBy,
      issues
    )
  };
};
