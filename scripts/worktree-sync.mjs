import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

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
    } else if (arg === "--commit") {
      opts.commit = args[i + 1] ?? "";
      i += 1;
    } else if (arg === "--allow-merge-commit") {
      opts.allowMergeCommit = true;
    } else if (arg === "--tip") {
      opts.tip = true;
    } else if (arg === "--all") {
      opts.all = true;
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

function branchShortName(branch) {
  const parts = branch.split("/");
  return parts[parts.length - 1] || branch;
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

  appendEvent(event);
  console.log(`Note recorded: ${branch} -> ${event.to}`);
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

  appendEvent(event);
  console.log(`Ready notice recorded: ${branch} ${event.short}`);
  if (message) {
    console.log(`Message: ${message}`);
  }
}

function isNoteForCurrentBranch(event, currentBranch) {
  const targets = splitTargets(event.to);
  if (targets.length === 0) return true;

  const currentShort = branchShortName(currentBranch);
  return targets.some(
    (target) =>
      target === "*" ||
      target === "all" ||
      target === currentBranch ||
      target === currentShort ||
      currentBranch.endsWith(`/${target}`),
  );
}

function formatNote(event) {
  const topic = event.topic ? ` (${event.topic})` : "";
  const dirty = event.dirty ? " dirty" : "";
  const message = String(event.message ?? "")
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join("\n");

  return [
    `- ${event.time ?? "(unknown time)"} [${event.level ?? "info"}] ${event.branch ?? "(unknown)"} -> ${
      event.to ?? "all"
    }${topic}`,
    message,
    `  commit: ${event.short ?? event.commit ?? "(unknown)"}${dirty}`,
  ].join("\n");
}

function commandInbox(args) {
  const opts = parseArgs(args);
  const currentBranch = branchName();
  const notes = readEvents()
    .filter((event) => event.type === "note")
    .filter((event) => opts.all || isNoteForCurrentBranch(event, currentBranch))
    .slice(-opts.limit);

  if (notes.length === 0) {
    console.log(opts.all ? "No notes recorded yet." : `No notes for ${currentBranch}.`);
    return;
  }

  console.log(opts.all ? `Recent notes:` : `Notes for ${currentBranch}:`);
  console.log(notes.map(formatNote).join("\n"));
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
    `- ${event.branch} ${event.short ?? shortSha(commit)} -> ${currentBranch}`,
    `  status: ${mode}`,
    `  subject: ${event.subject ?? subject(commit)}`,
    `  time: ${event.time ?? "(unknown)"}`,
    `  merge: ${mergeHint}${message}${tipNote}`,
  ].join("\n");
}

function commandCheck() {
  const currentBranch = branchName();
  const currentHead = headCommit();
  const events = [...latestReadyByBranch().values()].filter(
    (event) => event.branch !== currentBranch,
  );

  const lines = events
    .map((event) => formatReady(event, currentBranch, currentHead))
    .filter(Boolean);

  if (lines.length === 0) {
    console.log("No ready updates need to be merged into this worktree.");
    return;
  }

  console.log(`Ready updates for ${currentBranch}:`);
  console.log(lines.join("\n"));
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
      console.log(
        `${event.time} note   ${event.branch} -> ${event.to ?? "all"} [${event.level ?? "info"}]${
          topic
        } ${event.message ?? ""}`.trim(),
      );
    }
  }
}

async function commandWatch(args) {
  const opts = parseArgs(args);
  for (;;) {
    console.clear();
    commandCheck();
    console.log("");
    commandInbox([]);
    console.log(`\nWatching every ${opts.interval}s. Press Ctrl+C to stop.`);
    await new Promise((resolve) => setTimeout(resolve, opts.interval * 1000));
  }
}

function usage() {
  console.log(`Usage:
  npm run sync:ready -- -m "short message"
  npm run sync:check
  npm run sync:merge -- --from <branch>
  npm run sync:merge -- --from <branch> --allow-merge-commit
  npm run sync:note -- --to <branch-or-label> --level info -m "short message"
  npm run sync:inbox
  npm run sync:inbox -- --all
  npm run sync:list
  npm run sync:watch -- --interval 20
`);
}

const [command, ...rest] = process.argv.slice(2);

try {
  if (command === "ready") {
    commandReady(rest);
  } else if (command === "check") {
    commandCheck();
  } else if (command === "merge") {
    commandMerge(rest);
  } else if (command === "note") {
    commandNote(rest);
  } else if (command === "inbox") {
    commandInbox(rest);
  } else if (command === "list") {
    commandList();
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
