import { defaultRepoRoot, formatInstallResult, installLyricsData } from "./lyrics-installer/install.mjs";

const parseArgs = (args) => {
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "force" || key === "dry-run") {
      opts[key] = true;
      continue;
    }
    opts[key] = args[i + 1] ?? "";
    i += 1;
  }
  return opts;
};

const usage = () => `Usage:
  npm run song:lyrics:install -- --id <song-id> --timing <timing-v2.json> [--lyrics <lyrics.txt>] [--name <file-id>] [--force]

Examples:
  npm run song:lyrics:install -- --id monitoring --timing C:\\Users\\kawai\\Downloads\\monitoring.lyrics-timing.v2.with-lyrics.json
  npm run song:lyrics:install -- --id ope --timing .\\tmp\\ope.timing.v2.json --lyrics .\\tmp\\ope.lyrics.txt --name live --force`;

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  const result = installLyricsData({
    root: defaultRepoRoot,
    cwd: process.cwd(),
    id: String(opts.id ?? opts.song ?? "").trim(),
    timingPath: opts.timing,
    lyricsPath: opts.lyrics,
    name: opts.name,
    force: Boolean(opts.force),
    dryRun: Boolean(opts["dry-run"]),
    usage: usage()
  });
  console.log(formatInstallResult(result));
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
