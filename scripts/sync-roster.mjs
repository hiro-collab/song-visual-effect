import fs from "node:fs";
import path from "node:path";

const ROSTER_PATH = path.join("config", "sync-participants.json");

export function loadSyncRoster(root = process.cwd()) {
  const file = path.join(root, ROSTER_PATH);
  if (!fs.existsSync(file)) {
    return { version: 0, participants: [] };
  }

  try {
    const roster = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      version: roster.version ?? 0,
      updatedAt: roster.updatedAt ?? "",
      participants: Array.isArray(roster.participants) ? roster.participants : [],
    };
  } catch {
    return { version: 0, participants: [] };
  }
}

export function branchShortName(branch) {
  const parts = String(branch || "").split("/");
  return parts[parts.length - 1] || branch || "";
}

const normalize = (value) => String(value || "").trim();

export function participantMatches(participant, value) {
  const target = normalize(value);
  if (!target) return false;

  const names = [
    participant.label,
    participant.branch,
    participant.worktree,
    participant.songId,
    branchShortName(participant.branch),
    ...(Array.isArray(participant.aliases) ? participant.aliases : []),
  ]
    .filter(Boolean)
    .map(String);

  return names.includes(target);
}

export function participantForBranch(branch, root = process.cwd()) {
  const roster = loadSyncRoster(root);
  return roster.participants.find((participant) => participantMatches(participant, branch)) ?? null;
}

function addParticipantLabels(labels, participant) {
  if (!participant) return;
  labels.add(participant.label);
  if (participant.branch) labels.add(participant.branch);
  if (participant.songId) labels.add(participant.songId);
  for (const alias of participant.aliases ?? []) labels.add(alias);
}

export function labelsForBranch(branch, options = {}) {
  const root = options.root ?? process.cwd();
  const extra = Array.isArray(options.extra) ? options.extra : [];
  const labels = new Set(["*", "all", branch, branchShortName(branch), ...extra.filter(Boolean)]);
  const participant = participantForBranch(branch, root);
  addParticipantLabels(labels, participant);

  for (const value of extra) {
    const extraParticipant = participantForBranch(value, root);
    if (extraParticipant) {
      addParticipantLabels(labels, extraParticipant);
    }
  }

  return labels;
}

export function rosterRows(root = process.cwd()) {
  return loadSyncRoster(root).participants.map((participant) => ({
    label: participant.label ?? "",
    role: participant.role ?? "",
    songId: participant.songId ?? "",
    branch: participant.branch ?? "",
    worktree: participant.worktree ?? "",
    status: participant.status ?? "",
    aliases: (participant.aliases ?? []).join(", "),
    note: participant.note ?? "",
  }));
}
