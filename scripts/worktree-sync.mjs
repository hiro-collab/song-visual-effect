import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { branchShortName, labelsForBranch, participantForBranch, rosterRows } from "./sync-roster.mjs";

const cwd = process.cwd();

function git(args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitMaybe(args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    status: result.status ?? 1,
  };
}

function gitPassthrough(args) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  }).status ?? 1;
}

function parseArgs(args) {
  const opts = {
    positionals: [],
    allowMergeCommit: false,
    interval: 20,
    tip: false,
    all: false,
    open: false,
    limit: 20,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--message" || arg === "-m") {
      opts.message = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--from") {
      opts.from = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--sender") {
      opts.from = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--commit") {
      opts.commit = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--allow-merge-commit") {
      opts.allowMergeCommit = true;
    } else if (arg === "--tip") {
      opts.tip = true;
    } else if (arg === "--all") {
      opts.all = true;
    } else if (arg === "--open") {
      opts.open = true;
    } else if (arg === "--id" || arg === "--note" || arg === "--ack-id") {
      opts.id = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--for" || arg === "--as") {
      opts.for = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--to") {
      opts.to = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--topic") {
      opts.topic = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--level") {
      opts.level = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--limit") {
      opts.limit = Math.max(1, Number(args[i + 1] ?? "20") || 20);
      i += 1;
    } else if (arg === "--interval") {
      opts.interval = Math.max(5, Number(args[i + 1] ?? "20") || 20);
      i += 1;
    } else {
      opts.positionals.push(arg);
    }
  }

  return opts;
}

function branchName() {
  const name = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!name || name === "HEAD") {
    throw new Error("Detached HEAD is not supported for worktree sync.");
  }
  return name;
}

function headCommit() {
  return git(["rev-parse", "HEAD"]);
}

function shortSha(commit) {
  return git(["rev-parse", "--short", commit]);
}

function subject(commit) {
  return git(["log", "-1", "--pretty=%s", commit]);
}

function commonSyncDir() {
  const raw = git(["rev-parse", "--git-common-dir"]);
  return path.join(path.resolve(cwd, raw), "codex-sync");
}

function eventsPath() {
  return path.join(commonSyncDir(), "events.jsonl");
}

function readEvents() {
  const file = eventsPath();
  if (!fs.existsSync(file)) {
    return [];
  }

  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function appendEvent(event) {
  const dir = commonSyncDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(eventsPath(), `${JSON.stringify(event)}\n`, "utf8");
}

function isClean() {
  return git(["status", "--porcelain"]) === "";
}

function ensureClean() {
  if (!isClean()) {
    console.error("This worktree has uncommitted changes. Commit or stash them first.");
    process.exit(1);
  }
}

function isAncestor(older, newer) {
  return gitMaybe(["merge-base", "--is-ancestor", older, newer]).ok;
}

function commitExists(commit) {
  return gitMaybe(["cat-file", "-e", `${commit}^{commit}`]).ok;
}

function branchTip(branch) {
  const result = gitMaybe(["rev-parse", "--verify", `${branch}^{commit}`]);
  return result.ok ? result.stdout : "";
}

function latestReadyByBranch() {
  const map = new Map();
  for (const event of readEvents()) {
    if (event.type === "ready" && event.branch && event.commit) {
      map.set(event.branch, event);
    }
  }
  return map;
}

function splitTargets(value) {
  return String(value || "all")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);
}

function messageText(opts) {
  return (opts.message || opts.positionals.join(" ")).trim();
}

function eventId(event) {
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
    intoBranch: event.intoBranch,
  };
  return createHash("sha1").update(JSON.stringify(stable)).digest("hex").slice(0, 10);
}

function currentLabels(currentBranch, opts = {}) {
  return labelsForBranch(currentBranch, { root: cwd, extra: splitTargets(opts.for) });
}

function commandNote(args) {
  const opts = parseArgs(args);
  const message = messageText(opts);
  if (!message) {
    console.error('Specify a message with -m "message" or as positional text.');
    process.exit(1);
  }

  const allowedLevels = new Set(["info", "question", "blocker", "done"]);
  const level = (opts.level || "info").trim();
  if (!allowedLevels.has(level)) {
    console.error("Invalid --level. Use one of: info, question, blocker, done.");
    process.exit(1);
  }

  const branch = branchName();
  const commit = headCommit();
  const event = {
    type: "note",
    time: new Date().toISOString(),
    branch,
    from: (opts.from || branch).trim(),
    commit,
    short: shortSha(commit),
    subject: subject(commit),
    message,
    to: (opts.to || "all").trim(),
    topic: (opts.topic || "").trim(),
    level,
    dirty: !isClean(),
    worktree: cwd,
  };
  event.id = eventId(event);

  appendEvent(event);
  console.log(`Note recorded: ${event.from} -> ${event.to} #${event.id}`);
  console.log(`[${event.level}] ${event.message}`);
  if (event.dirty) {
    console.log("Note: this worktree had uncommitted changes when the note was recorded.");
  }
}

function commandReady(args) {
  const opts = parseArgs(args);
  ensureClean();

  const branch = branchName();
  const commit = headCommit();
  const message = messageText(opts);
  const event = {
    type: "ready",
    time: new Date().toISOString(),
    branch,
    commit,
    short: shortSha(commit),
    subject: subject(commit),
    message,
    worktree: cwd,
  };
  event.id = eventId(event);

  appendEvent(event);
  console.log(`Ready notice recorded: ${branch} ${event.short} #${event.id}`);
  if (message) {
    console.log(`Message: ${message}`);
  }
}

function isNoteForCurrentBranch(event, currentBranch, opts = {}) {
  const targets = splitTargets(event.to);
  if (targets.length === 0) return true;

  const labels = currentLabels(currentBranch, opts);
  return targets.some(
    (target) =>
      labels.has(target) ||
      currentBranch.endsWith(`/${target}`),
  );
}

function ackedIdsForCurrentBranch(events, currentBranch, opts = {}) {
  const labels = currentLabels(currentBranch, opts);
  return new Set(
    events
      .filter((event) => event.type === "ack" && event.ackId)
      .filter((event) => event.branch === currentBranch || labels.has(event.from) || labels.has(branchShortName(event.branch ?? "")))
      .map((event) => String(event.ackId)),
  );
}

function isActionLevel(event) {
  return event.level === "question" || event.level === "blocker";
}

function formatNote(event, opts = {}) {
  const topic = event.topic ? ` (${event.topic})` : "";
  const dirty = event.dirty ? " dirty" : "";
  const acked = opts.acked ? " acked" : "";
  const from = event.from ?? event.branch ?? "(unknown)";
  const branch = event.branch && event.branch !== from ? ` / branch ${event.branch}` : "";
  const message = String(event.message ?? "")
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");

  return [
    `- ${event.time ?? "(unknown time)"} #${eventId(event)} [${event.level ?? "info"}]${acked} ${from} -> ${event.to ?? "all"}${topic}${branch}`,
    message,
    `  commit: ${event.short ?? event.commit ?? "(unknown)"}${dirty}`,
  ].join("\n");
}

function commandInbox(args) {
  const opts = parseArgs(args);
  const currentBranch = branchName();
  const events = readEvents();
  const ackedIds = ackedIdsForCurrentBranch(events, currentBranch, opts);
  const levelFilter = opts.level ? new Set(String(opts.level).split(",").map((level) => level.trim()).filter(Boolean)) : null;
  const notes = events
    .filter((event) => event.type === "note")
    .filter((event) => opts.all || isNoteForCurrentBranch(event, currentBranch, opts))
    .filter((event) => !levelFilter || levelFilter.has(event.level ?? "info"))
    .filter((event) => !opts.open || (isActionLevel(event) && !ackedIds.has(eventId(event))))
    .slice(-opts.limit);

  if (notes.length === 0) {
    console.log(opts.all ? "No notes recorded yet." : `No notes for ${currentBranch}.`);
    return;
  }

  console.log(opts.all ? `Recent notes:` : `Notes for ${currentBranch}:`);
  console.log(notes.map((event) => formatNote(event, { acked: ackedIds.has(eventId(event)) })).join("\n"));
}

function findEventById(events, id) {
  return events.find((event) => eventId(event) === id || event.id === id);
}

function commandAck(args) {
  const opts = parseArgs(args);
  const id = (opts.id || opts.positionals[0] || "").trim();
  if (!id) {
    console.error("Specify the event id to acknowledge, e.g. npm run sync:ack -- --id abc123.");
    process.exit(1);
  }

  const events = readEvents();
  const target = findEventById(events, id);
  if (!target) {
    console.error(`Event not found: ${id}`);
    process.exit(1);
  }

  const branch = branchName();
  const commit = headCommit();
  const event = {
    type: "ack",
    time: new Date().toISOString(),
    branch,
    from: (opts.from || branch).trim(),
    commit,
    short: shortSha(commit),
    ackId: eventId(target),
    ackType: target.type,
    ackFrom: target.from ?? target.branch ?? "",
    ackTopic: target.topic ?? "",
    message: messageText(opts),
    dirty: !isClean(),
    worktree: cwd,
  };
  event.id = eventId(event);

  appendEvent(event);
  console.log(`Ack recorded: ${event.from} acknowledged #${event.ackId}`);
  if (event.message) console.log(`Message: ${event.message}`);
}

function formatReady(event, currentBranch, currentHead) {
  const commit = event.commit;
  const tip = branchTip(event.branch);
  const exists = commitExists(commit);

  if (!exists) {
    return [
      `- ${event.branch} ${event.short ?? commit}`,
      "  status: announced commit is not available locally",
    ].join("\n");
  }

  const included = isAncestor(commit, currentHead);
  if (included) {
    return "";
  }

  const fastForward = isAncestor(currentHead, commit);
  const mode = fastForward ? "fast-forward possible" : "merge commit may be needed";
  const tipNote =
    tip && tip !== commit
      ? "\n  note: source branch has newer commits; merge command uses the announced commit"
      : "";
  const message = event.message ? `\n  message: ${event.message}` : "";
  const mergeHint = fastForward
    ? `npm run sync:merge -- --from ${event.branch}`
    : `npm run sync:merge -- --from ${event.branch} --allow-merge-commit`;

  return [
    `- ${event.branch} ${event.short ?? shortSha(commit)} #${eventId(event)} -> ${currentBranch}`,
    `  status: ${mode}`,
    `  subject: ${event.subject ?? subject(commit)}`,
    `  time: ${event.time ?? "(unknown)"}`,
    `  merge: ${mergeHint}${message}${tipNote}`,
  ].join("\n");
}

function commandCheck(args = []) {
  const opts = parseArgs(args);
  const currentBranch = branchName();
  const currentHead = headCommit();
  const ackedIds = ackedIdsForCurrentBranch(readEvents(), currentBranch, opts);
  const events = [...latestReadyByBranch().values()].filter(
    (event) => event.branch !== currentBranch,
  );

  const lines = events
    .filter((event) => opts.all || !ackedIds.has(eventId(event)))
    .map((event) => formatReady(event, currentBranch, currentHead))
    .filter(Boolean);

  if (lines.length === 0) {
    console.log("No ready updates need to be merged into this worktree.");
    return;
  }

  console.log(`Ready updates for ${currentBranch}:`);
  console.log(lines.join("\n"));
}

function commandBrief(args) {
  const opts = parseArgs(args);
  const currentBranch = branchName();
  const currentHead = headCommit();
  const events = readEvents();
  const labels = [...currentLabels(currentBranch, opts)].filter((label) => label !== "*" && label !== "all");
  const ackedIds = ackedIdsForCurrentBranch(events, currentBranch, opts);

  const readyEvents = [...latestReadyByBranch().values()]
    .filter((event) => event.branch !== currentBranch)
    .filter((event) => !ackedIds.has(eventId(event)))
    .map((event) => formatReady(event, currentBranch, currentHead))
    .filter(Boolean);

  const targetedNotes = events
    .filter((event) => event.type === "note")
    .filter((event) => opts.all || isNoteForCurrentBranch(event, currentBranch, opts));
  const actionNotes = targetedNotes
    .filter(isActionLevel)
    .filter((event) => !ackedIds.has(eventId(event)))
    .slice(-opts.limit);
  const recentInfo = targetedNotes
    .filter((event) => !isActionLevel(event))
    .slice(-Math.min(opts.limit, 5));

  console.log(`Sync brief for ${currentBranch}`);
  console.log(`Recipient labels: ${labels.join(", ")}`);
  console.log("");

  if (actionNotes.length) {
    console.log("Action notes (question/blocker, unacked):");
    console.log(actionNotes.map((event) => formatNote(event)).join("\n"));
    console.log("");
  } else {
    console.log("Action notes: none");
    console.log("");
  }

  if (readyEvents.length) {
    console.log("Ready updates not yet merged or acked:");
    console.log(readyEvents.join("\n"));
    console.log("");
  } else {
    console.log("Ready updates: none");
    console.log("");
  }

  if (recentInfo.length) {
    console.log("Recent info/done notes:");
    console.log(recentInfo.map((event) => formatNote(event, { acked: ackedIds.has(eventId(event)) })).join("\n"));
    console.log("");
  }

  console.log("Tip: use npm run sync:ack -- --id <id> --from <担当名> to hide an item from this brief for your worktree.");
}

function resolveMergeCommit(opts) {
  if (opts.commit) {
    return { sourceLabel: opts.commit, commit: opts.commit };
  }

  if (!opts.from) {
    console.error("Specify --from <branch> or --commit <sha>.");
    process.exit(1);
  }

  if (opts.tip) {
    const tip = branchTip(opts.from);
    if (!tip) {
      console.error(`Branch not found: ${opts.from}`);
      process.exit(1);
    }
    return { sourceLabel: opts.from, commit: tip };
  }

  const event = latestReadyByBranch().get(opts.from);
  if (!event) {
    console.error(`No ready notice found for ${opts.from}. Use --tip to merge its branch tip.`);
    process.exit(1);
  }
  return { sourceLabel: opts.from, commit: event.commit };
}

function commandMerge(args) {
  const opts = parseArgs(args);
  ensureClean();

  const currentBranch = branchName();
  const currentHead = headCommit();
  const { sourceLabel, commit } = resolveMergeCommit(opts);

  if (!commitExists(commit)) {
    console.error(`Commit not found: ${commit}`);
    process.exit(1);
  }

  if (isAncestor(commit, currentHead)) {
    console.log(`Already included: ${sourceLabel} ${shortSha(commit)}`);
    return;
  }

  let status = 0;
  if (isAncestor(currentHead, commit)) {
    console.log(`Fast-forwarding ${currentBranch} to ${sourceLabel} ${shortSha(commit)}.`);
    status = gitPassthrough(["merge", "--ff-only", commit]);
  } else if (opts.allowMergeCommit) {
    console.log(`Merging ${sourceLabel} ${shortSha(commit)} into ${currentBranch}.`);
    status = gitPassthrough(["merge", "--no-edit", commit]);
  } else {
    console.error("Branches have diverged. Re-run with --allow-merge-commit after reviewing.");
    process.exit(1);
  }

  if (status !== 0) {
    console.error("Merge did not complete cleanly. Resolve conflicts before continuing.");
    process.exit(status);
  }

  appendEvent({
    type: "merged",
    time: new Date().toISOString(),
    intoBranch: currentBranch,
    source: sourceLabel,
    commit,
    resultHead: headCommit(),
    worktree: cwd,
  });
}

function commandList() {
  const events = readEvents();
  if (events.length === 0) {
    console.log("No worktree sync events recorded yet.");
    return;
  }
  for (const event of events.slice(-30)) {
    if (event.type === "ready") {
      console.log(
        `${event.time} ready  ${event.branch} ${event.short ?? event.commit} ${event.message ?? ""}`.trim(),
      );
    } else if (event.type === "merged") {
      console.log(
        `${event.time} merged ${event.source} -> ${event.intoBranch} ${event.commit}`.trim(),
      );
    } else if (event.type === "note") {
      const topic = event.topic ? ` (${event.topic})` : "";
      const from = event.from ?? event.branch ?? "(unknown)";
      console.log(
        `${event.time} note   ${from} -> ${event.to ?? "all"} [${event.level ?? "info"}]${
          topic
        } ${event.message ?? ""}`.trim(),
      );
    } else if (event.type === "ack") {
      console.log(
        `${event.time} ack    ${event.from ?? event.branch} -> #${event.ackId} ${event.message ?? ""}`.trim(),
      );
    }
  }
}

function commandOnboard(args) {
  const opts = parseArgs(args);
  const currentBranch = branchName();
  const currentHead = headCommit();
  const labels = [...currentLabels(currentBranch, opts)].filter((label) => label !== "*" && label !== "all");

  console.log("Music Effect onboarding");
  console.log("=======================");
  console.log(`Worktree: ${cwd}`);
  console.log(`Branch: ${currentBranch}`);
  console.log(`HEAD: ${shortSha(currentHead)} ${subject(currentHead)}`);
  console.log(`Clean: ${isClean() ? "yes" : "no - commit/stash before merge or ready"}`);
  console.log(`Recipient labels: ${labels.join(", ")}`);
  const branchParticipant = participantForBranch(currentBranch, cwd);
  const actingParticipants = splitTargets(opts.for)
    .map((label) => participantForBranch(label, cwd))
    .filter(Boolean);
  if (branchParticipant) {
    console.log(`Current branch participant: ${branchParticipant.label} (${branchParticipant.role ?? "unknown"})`);
    console.log(`Current branch status: ${branchParticipant.status ?? "unknown"}`);
  } else {
    console.log("Current branch participant: not listed in config/sync-participants.json");
  }
  if (actingParticipants.length) {
    console.log(
      `Acting as: ${actingParticipants
        .map((participant) => `${participant.label}${participant.songId ? ` / song:${participant.songId}` : ""}`)
        .join(", ")}`
    );
  }
  console.log("");
  console.log("Read first:");
  console.log("- docs/README.md");
  console.log("- docs/sync-onboarding.md");
  console.log("- docs/thread-start.md");
  console.log("- docs/worktree-sync.md");
  console.log("- docs/preview-lab.md when doing central preview checks");
  console.log("");
  console.log("If you are creating a new song:");
  console.log("- Read docs/system-overview.md, docs/song-authoring.md, docs/song-visual-independence.md.");
  console.log("- Do not use existing song-packs/* or fixture renderers as templates unless the user explicitly asks.");
  console.log("- Share reusable know-how with --topic knowledge-candidate before treating it as a common rule.");
  console.log("");
  console.log("Useful commands:");
  console.log("  npm run sync:roster");
  console.log("  npm run sync:brief -- --for <your-label>");
  console.log("  npm run sync:check");
  console.log("  npm run sync:inbox -- --open");
  console.log('  npm run sync:note -- --from <you> --to system --level question --topic knowledge-candidate -m "candidate: ... scope: ... source: ... risk: ... suggested home: ..."');
  console.log('  npm run sync:note -- --from <you> --to system --level info --topic visual-authoring-feedback -m "song: ...; apply: ...; no-apply: ...; need-system-help: ...; checks: ..."');
  console.log('  npm run sync:ready -- -m "what is ready, checks run, assets/deps, knowledge-candidates"');
  console.log("");
  console.log("Current brief:");
  commandBrief(args);
}

function commandRoster() {
  const rows = rosterRows(cwd);
  if (rows.length === 0) {
    console.log("No participants listed. Add config/sync-participants.json.");
    return;
  }

  console.log("Music Effect sync roster");
  console.log("========================");
  for (const row of rows) {
    const song = row.songId ? ` / song:${row.songId}` : "";
    console.log(`- ${row.label} [${row.role}${song}] ${row.status}`);
    console.log(`  branch: ${row.branch || "-"}`);
    console.log(`  worktree: ${row.worktree || "-"}`);
    if (row.aliases) console.log(`  aliases: ${row.aliases}`);
    if (row.note) console.log(`  note: ${row.note}`);
  }
}

async function commandWatch(args) {
  const opts = parseArgs(args);
  for (;;) {
    console.clear();
    commandBrief(args);
    console.log(`\nWatching every ${opts.interval}s. Press Ctrl+C to stop.`);
    await new Promise((resolve) => setTimeout(resolve, opts.interval * 1000));
  }
}

function usage() {
  console.log(`Usage:
  npm run sync:onboard -- --for <your-label>
  npm run sync:roster
  npm run sync:ready -- -m "short message"
  npm run sync:brief
  npm run sync:check
  npm run sync:merge -- --from <branch>
  npm run sync:merge -- --from <branch> --allow-merge-commit
  npm run sync:note -- --from <sender-label> --to <branch-or-label> --level info -m "short message"
  npm run sync:ack -- --id <event-id> --from <sender-label>
  npm run sync:inbox
  npm run sync:inbox -- --open
  npm run sync:inbox -- --all
  npm run sync:list
  npm run sync:watch -- --interval 20
`);
}

const [command, ...rest] = process.argv.slice(2);

try {
  if (command === "ready") {
    commandReady(rest);
  } else if (command === "brief") {
    commandBrief(rest);
  } else if (command === "check") {
    commandCheck(rest);
  } else if (command === "merge") {
    commandMerge(rest);
  } else if (command === "note") {
    commandNote(rest);
  } else if (command === "ack") {
    commandAck(rest);
  } else if (command === "inbox") {
    commandInbox(rest);
  } else if (command === "list") {
    commandList();
  } else if (command === "roster") {
    commandRoster();
  } else if (command === "onboard") {
    commandOnboard(rest);
  } else if (command === "watch") {
    await commandWatch(rest);
  } else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
