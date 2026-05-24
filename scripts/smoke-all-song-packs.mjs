import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const modulePath = fileURLToPath(import.meta.url);
const repoRoot = resolve(__dirname, "..");

const usage = `Usage:
  npm run song:smoke:all -- [--ids <a,b,c>] [--exclude <a,b>] [--max <n>] [--continue-on-error] [--dry-run]

Examples:
  npm run song:smoke:all -- --dry-run
  npm run song:smoke:all -- --ids monitoring,igaku --time 30
  npm run song:smoke:all -- --max 2 --continue-on-error --settle-ms 1000

This command runs song:smoke for multiple song-packs. It is a mechanical
playback check only; it does not judge interpretation, composition, color, or
artistic quality.
`;

const splitIds = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const validateSongId = (id, label = "song id") => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error(`${label} must use lowercase letters, numbers, dots, underscores, or hyphens: ${id}`);
  }
  return id;
};

export const listSongPackIds = ({ root = repoRoot } = {}) => {
  const songPacksRoot = resolve(root, "song-packs");
  if (!existsSync(songPacksRoot)) return [];
  return readdirSync(songPacksRoot)
    .filter((name) => {
      const directory = resolve(songPacksRoot, name);
      if (!statSync(directory).isDirectory()) return false;
      validateSongId(name, "song-pack directory");
      return existsSync(resolve(directory, "manifest.json"));
    })
    .sort((a, b) => a.localeCompare(b));
};

export const selectSongIds = ({ allIds, includeIds = [], excludeIds = [], max = null } = {}) => {
  const includeSet = includeIds.length ? new Set(includeIds.map((id) => validateSongId(id))) : null;
  const excludeSet = new Set(excludeIds.map((id) => validateSongId(id)));
  const unknown = includeIds.filter((id) => !allIds.includes(id));
  if (unknown.length) throw new Error(`Unknown song-pack id(s): ${unknown.join(", ")}`);
  const selected = allIds.filter((id) => (!includeSet || includeSet.has(id)) && !excludeSet.has(id));
  if (max !== null) return selected.slice(0, max);
  return selected;
};

const parseArgs = (argv) => {
  const options = {
    ids: [],
    exclude: [],
    max: null,
    continueOnError: false,
    dryRun: false,
    forwarded: []
  };
  const take = (argvRef, index, arg) => {
    const nextIndex = index + 1;
    if (nextIndex >= argvRef.length) throw new Error(`Missing value for ${arg}`);
    return [nextIndex, argvRef[nextIndex]];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (arg === "--ids") {
      const [nextIndex, value] = take(argv, index, arg);
      index = nextIndex;
      options.ids.push(...splitIds(value));
    } else if (arg === "--exclude") {
      const [nextIndex, value] = take(argv, index, arg);
      index = nextIndex;
      options.exclude.push(...splitIds(value));
    } else if (arg === "--max") {
      const [nextIndex, value] = take(argv, index, arg);
      index = nextIndex;
      const max = Number(value);
      if (!Number.isInteger(max) || max < 1) throw new Error("--max must be a positive integer.");
      options.max = max;
    } else if (arg === "--continue-on-error") {
      options.continueOnError = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (["--time", "--times", "--width", "--height", "--settle-ms"].includes(arg)) {
      const [nextIndex, value] = take(argv, index, arg);
      index = nextIndex;
      options.forwarded.push(arg, value);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.ids = [...new Set(options.ids.map((id) => validateSongId(id)))];
  options.exclude = [...new Set(options.exclude.map((id) => validateSongId(id)))];
  return options;
};

const runSongSmoke = ({ id, forwarded }) => {
  const args = ["scripts/smoke-song-pack.mjs", "--id", id, ...forwarded];
  console.log(`\n[smoke:all] ${id}`);
  console.log(`node ${args.join(" ")}`);
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const allIds = listSongPackIds();
  const ids = selectSongIds({
    allIds,
    includeIds: options.ids,
    excludeIds: options.exclude,
    max: options.max
  });

  if (!ids.length) throw new Error("No song-packs selected.");

  console.log(`Selected song-packs (${ids.length}): ${ids.join(", ")}`);
  if (options.dryRun) return;

  const failed = [];
  for (const id of ids) {
    const result = runSongSmoke({ id, forwarded: options.forwarded });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      failed.push(id);
      if (!options.continueOnError) {
        throw new Error(`song:smoke failed for ${id}. Use --continue-on-error to keep checking the rest.`);
      }
    }
  }

  if (failed.length) {
    throw new Error(`song:smoke failed for ${failed.length} song-pack(s): ${failed.join(", ")}`);
  }
  console.log(`\nAll selected song smoke checks passed: ${ids.join(", ")}`);
};

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
