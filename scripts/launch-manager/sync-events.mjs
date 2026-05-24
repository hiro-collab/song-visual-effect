import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const defaultLimit = 160;
const maxLimit = 400;
const maxEventsBytes = 2 * 1024 * 1024;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/i;
const REF_NAME_PATTERN = /^(?!-)(?!.*(?:\.\.|@\{|[\\\x00-\x1f\x7f]))[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;

const git = (root, args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();

const gitMaybe = (root, args) => {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim()
  };
};

const cleanText = (value, max = 2000) => {
  const text = String(value ?? "").replace(/\0/g, "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const isSafeCommit = (value) => COMMIT_PATTERN.test(String(value ?? ""));

const isSafeRefName = (value) => {
  const ref = String(value ?? "");
  return (
    REF_NAME_PATTERN.test(ref) &&
    !ref.includes("//") &&
    !ref.endsWith("/") &&
    !ref.endsWith(".") &&
    ref.split("/").every((part) => part && part !== "." && part !== ".." && !part.endsWith(".lock"))
  );
};

const eventId = (event) => {
  if (event.id) return String(event.id);
  const stable = {
    type: event.type,
    time: event.time,
    branch: event.branch,
    commit: event.commit,
    from: event.from,
    to: event.to,
    topic: event.topic,
    level: event.level,
    message: event.message,
    source: event.source,
    intoBranch: event.intoBranch
  };
  return createHash("sha1").update(JSON.stringify(stable)).digest("hex").slice(0, 10);
};

const branchName = (root) => {
  const name = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!name || name === "HEAD") throw new Error("Detached HEAD is not supported for sync event viewing.");
  return name;
};

const headCommit = (root) => git(root, ["rev-parse", "HEAD"]);

const branchTip = (root, branch) => {
  if (!isSafeRefName(branch)) return "";
  const result = gitMaybe(root, ["rev-parse", "--verify", "--end-of-options", `${branch}^{commit}`]);
  return result.ok ? result.stdout : "";
};

const commonSyncDir = (root) => {
  const raw = git(root, ["rev-parse", "--git-common-dir"]);
  return path.join(path.resolve(root, raw), "codex-sync");
};

const eventsPath = (root) => path.join(commonSyncDir(root), "events.jsonl");

const readUtf8Tail = (file, maxBytes) => {
  const stat = fs.statSync(file);
  if (stat.size <= maxBytes) return fs.readFileSync(file, "utf8");

  const start = stat.size - maxBytes;
  const buffer = Buffer.alloc(maxBytes);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, buffer, 0, maxBytes, start);
  } finally {
    fs.closeSync(fd);
  }
  const text = buffer.toString("utf8");
  const firstNewline = text.indexOf("\n");
  return firstNewline === -1 ? "" : text.slice(firstNewline + 1);
};

const readEvents = (root) => {
  const file = eventsPath(root);
  if (!fs.existsSync(file)) return [];
  return readUtf8Tail(file, maxEventsBytes)
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
};

const isAncestor = (root, older, newer) =>
  isSafeCommit(older) && isSafeCommit(newer) && gitMaybe(root, ["merge-base", "--is-ancestor", older, newer]).ok;

const commitExists = (root, commit) =>
  isSafeCommit(commit) && gitMaybe(root, ["cat-file", "-e", `${commit}^{commit}`]).ok;

const branchShortName = (branch) => {
  const parts = String(branch || "").split("/");
  return parts[parts.length - 1] || branch || "";
};

const splitTargets = (value) =>
  String(value || "all")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);

const currentLabels = (currentBranch) => {
  const labels = new Set(["*", "all", currentBranch, branchShortName(currentBranch)]);
  const short = branchShortName(currentBranch);
  const branch = currentBranch.toLowerCase();
  const lowerShort = short.toLowerCase();
  if (lowerShort.includes("system")) labels.add("system");
  if (lowerShort.includes("security") || branch.includes("download-security")) labels.add("security");
  if (lowerShort.includes("beat-sync")) labels.add("beat-sync");
  if (lowerShort.includes("traffic-jam")) {
    labels.add("traffic-jam");
    labels.add("traffic-jam-redo");
  }
  if (lowerShort.includes("mesmerizer")) {
    labels.add("mesmerizer");
    labels.add("mesmerizer-signal-lock");
  }
  if (lowerShort.includes("launch-manager")) labels.add("launch-manager");
  if (lowerShort.includes("message-viewer")) labels.add("message-viewer");
  return labels;
};

const isNoteForCurrentBranch = (event, currentBranch, labels) => {
  const targets = splitTargets(event.to);
  if (targets.length === 0) return true;
  return targets.some(
    (target) =>
      labels.has(target) ||
      currentBranch.endsWith(`/${target}`)
  );
};

const ackedIdsForCurrentBranch = (events, currentBranch, labels) =>
  new Set(
    events
      .filter((event) => event.type === "ack" && event.ackId)
      .filter((event) => event.branch === currentBranch || labels.has(event.from) || labels.has(branchShortName(event.branch ?? "")))
      .map((event) => String(event.ackId))
  );

const isActionLevel = (event) => event.level === "question" || event.level === "blocker";

const actorForEvent = (event) => {
  if (event.type === "ready") return branchShortName(event.branch) || event.branch || "unknown";
  if (event.type === "ack") return event.from || branchShortName(event.branch) || event.branch || "unknown";
  return event.from || branchShortName(event.branch) || event.branch || "unknown";
};

const targetForEvent = (event) => {
  if (event.type === "ready") return "all";
  if (event.type === "ack") return event.ackId ? `#${event.ackId}` : "ack";
  return event.to || "all";
};

const normalizeEvent = (event) => {
  const normalized = {
    id: eventId(event),
    type: cleanText(event.type, 40),
    time: cleanText(event.time, 80),
    branch: cleanText(event.branch, 160),
    commit: cleanText(event.commit, 80),
    short: cleanText(event.short ?? event.commit ?? "", 24),
    subject: cleanText(event.subject, 260),
    message: cleanText(event.message),
    from: cleanText(event.from, 120),
    to: cleanText(event.to || "all", 160),
    topic: cleanText(event.topic, 160),
    level: cleanText(event.level || "info", 40),
    dirty: Boolean(event.dirty),
    ackId: cleanText(event.ackId, 40),
    ackType: cleanText(event.ackType, 40),
    ackFrom: cleanText(event.ackFrom, 160)
  };
  normalized.actor = actorForEvent(normalized);
  normalized.target = targetForEvent(normalized);
  return normalized;
};

const latestReadyByBranch = (events) => {
  const map = new Map();
  for (const event of events) {
    if (event.type === "ready" && event.branch && event.commit) {
      map.set(event.branch, event);
    }
  }
  return map;
};

const describeReady = ({ root, event, currentBranch, currentHead, acked }) => {
  const exists = event.commit ? commitExists(root, event.commit) : false;
  const branch = isSafeRefName(event.branch) ? event.branch : "";
  let status = "announced commit is not available locally";
  let included = false;
  let fastForward = false;

  if (exists) {
    included = isAncestor(root, event.commit, currentHead);
    fastForward = !included && isAncestor(root, currentHead, event.commit);
    status = included ? "already included" : fastForward ? "fast-forward possible" : "merge commit may be needed";
  }

  const tip = branch ? branchTip(root, branch) : "";
  const hasNewerTip = Boolean(tip && event.commit && tip !== event.commit);
  const pending = Boolean(branch) && exists && !included && !acked && branch !== currentBranch;
  const mergeHint = !pending
    ? ""
    : fastForward
      ? `npm run sync:merge -- --from ${branch}`
      : `npm run sync:merge -- --from ${branch} --allow-merge-commit`;

  return {
    status,
    included,
    fastForward,
    pending,
    hasNewerTip,
    mergeHint
  };
};

const timeValue = (event) => {
  const value = Date.parse(event.time);
  return Number.isFinite(value) ? value : 0;
};

const buildParticipants = (events) => {
  const map = new Map();
  for (const event of events) {
    const name = event.actor || "unknown";
    const item = map.get(name) || {
      name,
      total: 0,
      notes: 0,
      ready: 0,
      ack: 0,
      open: 0,
      lastTime: "",
      lastMessage: ""
    };
    item.total += 1;
    if (event.type === "note") item.notes += 1;
    if (event.type === "ready") item.ready += 1;
    if (event.type === "ack") item.ack += 1;
    if (event.openForCurrent) item.open += 1;
    if (timeValue(event) >= timeValue({ time: item.lastTime })) {
      item.lastTime = event.time;
      item.lastMessage = event.message || event.subject || event.status || "";
    }
    map.set(name, item);
  }
  return [...map.values()].sort((a, b) => timeValue({ time: b.lastTime }) - timeValue({ time: a.lastTime }));
};

export const readSyncEvents = ({ root, limit = defaultLimit } = {}) => {
  const resolvedRoot = path.resolve(root ?? process.cwd());
  const currentBranch = branchName(resolvedRoot);
  const currentHead = headCommit(resolvedRoot);
  const labels = currentLabels(currentBranch);
  const rawEvents = readEvents(resolvedRoot);
  const events = rawEvents.map(normalizeEvent);
  const ackedIds = ackedIdsForCurrentBranch(events, currentBranch, labels);
  const latestReady = latestReadyByBranch(events);
  const readyDetails = new Map();

  for (const event of latestReady.values()) {
    readyDetails.set(
      event.id,
      describeReady({
        root: resolvedRoot,
        event,
        currentBranch,
        currentHead,
        acked: ackedIds.has(event.id)
      })
    );
  }

  const enriched = events.map((event) => {
    const ackedByCurrent = ackedIds.has(event.id);
    const isLatestReady = event.type === "ready" && latestReady.get(event.branch)?.id === event.id;
    const ready = isLatestReady
      ? readyDetails.get(event.id)
      : event.type === "ready"
        ? { status: "superseded by a newer ready notice", included: false, fastForward: false, pending: false, hasNewerTip: false, mergeHint: "" }
        : {};
    const isForCurrent = event.type === "note" ? isNoteForCurrentBranch(event, currentBranch, labels) : event.type === "ready" && event.branch !== currentBranch;
    const openForCurrent =
      (event.type === "note" && isForCurrent && isActionLevel(event) && !ackedByCurrent) ||
      (event.type === "ready" && Boolean(ready.pending));

    return {
      ...event,
      ...ready,
      isForCurrent,
      ackedByCurrent,
      openForCurrent
    };
  });

  const boundedLimit = Math.max(1, Math.min(maxLimit, Number(limit) || defaultLimit));
  const recentEvents = [...enriched]
    .sort((a, b) => timeValue(b) - timeValue(a))
    .slice(0, boundedLimit);
  const openActionNotes = enriched
    .filter((event) => event.type === "note" && event.openForCurrent)
    .sort((a, b) => timeValue(b) - timeValue(a));
  const actionNotes = openActionNotes
    .slice(0, 20);
  const readyUpdates = [...latestReady.values()]
    .map((event) => enriched.find((item) => item.id === event.id))
    .filter(Boolean)
    .filter((event) => event.branch !== currentBranch)
    .sort((a, b) => timeValue(b) - timeValue(a));
  const pendingReady = readyUpdates.filter((event) => event.openForCurrent);
  const participants = buildParticipants(enriched);

  return {
    updatedAt: new Date().toISOString(),
    currentBranch,
    currentHead,
    labels: [...labels].filter((label) => label !== "*" && label !== "all"),
    syncDir: commonSyncDir(resolvedRoot),
    eventsPath: eventsPath(resolvedRoot),
    summary: {
      totalEvents: enriched.length,
      shownEvents: recentEvents.length,
      participants: participants.length,
      openItems: openActionNotes.length + pendingReady.length,
      openActionNotes: openActionNotes.length,
      pendingReady: pendingReady.length
    },
    participants,
    actionNotes,
    readyUpdates,
    recentEvents
  };
};
