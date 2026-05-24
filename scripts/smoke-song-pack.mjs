import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const usage = `Usage:
  npm run song:smoke -- --id <song-id> [--time <seconds>] [--times <a,b,c>]

Checks:
  1. Runs song:validate.
  2. Opens the song at selected times with preview:snapshot.
  3. Fails on page/load/adapter errors, fatal console errors, no visible canvas,
     or readable visible canvases whose sampled pixels look blank.

This command does not judge style, composition, interpretation, color preference,
or whether the visual is artistically good.
`;

const parseArgs = (argv) => {
  const options = {
    id: "",
    times: [],
    width: null,
    height: null,
    settleMs: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (arg === "--id" || arg === "--song") {
      options.id = next().trim();
    } else if (arg === "--time") {
      options.times.push(Number(next()));
    } else if (arg === "--times") {
      options.times.push(...next().split(",").map((value) => Number(value.trim())));
    } else if (arg === "--width") {
      options.width = Number(next());
    } else if (arg === "--height") {
      options.height = Number(next());
    } else if (arg === "--settle-ms") {
      options.settleMs = Number(next());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(options.id)) {
    throw new Error("Use --id with a song-pack id.");
  }
  for (const time of options.times) {
    if (!Number.isFinite(time) || time < 0) throw new Error("Preview times must be non-negative numbers.");
  }
  return options;
};

const readManifest = (id) => {
  const manifestPath = resolve(repoRoot, "song-packs", id, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`manifest.json not found: song-packs/${id}/manifest.json`);
  return JSON.parse(readFileSync(manifestPath, "utf8"));
};

const previewTimesFor = (manifest, explicitTimes) => {
  if (explicitTimes.length) return [...new Set(explicitTimes)].sort((a, b) => a - b);
  const configured = manifest.validation?.previewTimes ?? manifest.verification?.previewTimes ?? manifest.previewTimes;
  if (Array.isArray(configured) && configured.length) {
    return [...new Set(configured.map(Number).filter((time) => Number.isFinite(time) && time >= 0))].sort((a, b) => a - b);
  }
  const duration = Number(manifest.duration);
  if (Number.isFinite(duration) && duration > 12) {
    return [Math.round(Math.min(duration * 0.35, 60) * 100) / 100];
  }
  return [0];
};

const run = (label, args) => {
  console.log(`\n[smoke] ${label}`);
  console.log(`node ${args.join(" ")}`);
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readManifest(options.id);
  const times = previewTimesFor(manifest, options.times);

  run("song:validate", ["scripts/validate-song-pack.mjs", "--id", options.id]);
  for (const time of times) {
    const args = [
      "scripts/preview-snapshot.mjs",
      "--song",
      options.id,
      "--time",
      String(time),
      "--fail-blank-canvas"
    ];
    if (options.width !== null) args.push("--width", String(options.width));
    if (options.height !== null) args.push("--height", String(options.height));
    if (options.settleMs !== null) args.push("--settle-ms", String(options.settleMs));
    run(`preview:snapshot ${options.id} @ ${time}s`, args);
  }

  console.log(`\nSong smoke ok: ${options.id} (${times.map((time) => `${time}s`).join(", ")})`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
