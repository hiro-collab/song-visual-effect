import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const songPacksRoot = path.join(repoRoot, "song-packs");
const realSongPacksRoot = fs.realpathSync(songPacksRoot);

const isInside = (parent, child) => {
  const baseKey = process.platform === "win32" ? parent.toLowerCase() : parent;
  const targetKey = process.platform === "win32" ? child.toLowerCase() : child;
  return targetKey === baseKey || targetKey.startsWith(`${baseKey}${path.sep}`);
};

const parseArgs = (args) => {
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "force" || key === "with-adapter") {
      opts[key] = true;
    } else {
      opts[key] = args[i + 1] ?? "";
      i += 1;
    }
  }
  return opts;
};

const assertSongId = (id) => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error("Use --id with lowercase letters, numbers, dot, underscore, or hyphen.");
  }
};

const assertHttpUrl = (value, label) => {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must be http(s).`);
  }
  return url.toString();
};

const assertWritableSongRoot = (root) => {
  if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) {
    throw new Error(`Refusing to write through symbolic link: ${path.relative(repoRoot, root)}`);
  }
  fs.mkdirSync(root, { recursive: true });
  const realRoot = fs.realpathSync(root);
  if (!isInside(realSongPacksRoot, realRoot)) {
    throw new Error(`Refusing to write outside song-packs: ${path.relative(repoRoot, root)}`);
  }
  return realRoot;
};

const writeFile = (filePath, content, force, realSongRoot) => {
  if (!force && fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file: ${path.relative(repoRoot, filePath)}`);
  }
  const parentPath = path.dirname(filePath);
  fs.mkdirSync(parentPath, { recursive: true });
  if (fs.lstatSync(parentPath).isSymbolicLink()) {
    throw new Error(`Refusing to write through symbolic link: ${path.relative(repoRoot, parentPath)}`);
  }
  const realParent = fs.realpathSync(parentPath);
  if (!isInside(realSongRoot, realParent)) {
    throw new Error(`Refusing to write outside song-packs: ${path.relative(repoRoot, filePath)}`);
  }
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symbolic link: ${path.relative(repoRoot, filePath)}`);
  }
  fs.writeFileSync(filePath, content, { encoding: "utf8", flag: force ? "w" : "wx" });
};

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  const id = String(opts.id ?? "").trim();
  assertSongId(id);

  const title = String(opts.title ?? id).trim();
  const artist = String(opts.artist ?? "Unknown Artist").trim();
  const songleId = String(opts["songle-id"] ?? opts.songleId ?? "").trim();
  const songUrl = assertHttpUrl(String(opts["song-url"] ?? opts.songUrl ?? "").trim(), "song URL");
  const adapterIdRaw = String(opts["adapter-id"] ?? opts.adapterId ?? "").trim();
  const adapterId = adapterIdRaw && adapterIdRaw !== "none" ? adapterIdRaw : null;
  const duration = Number(opts.duration ?? "");

  if (adapterId && !/^(song|builtin):[a-z0-9][a-z0-9._-]{0,63}$/.test(adapterId)) {
    throw new Error("Use --adapter-id as song:<id>, builtin:<id>, or none.");
  }

  const root = path.join(songPacksRoot, id);
  const force = Boolean(opts.force);
  const withAdapter = Boolean(opts["with-adapter"]) || adapterId === `song:${id}`;
  const realSongRoot = assertWritableSongRoot(root);

  const manifest = {
    schema: "music-effect.song-manifest.v1",
    id,
    title,
    artist,
    ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
    credits: "./CREDITS.md",
    references: "./references.json",
    lyrics: null,
    analysis: {
      markers: "./analysis/markers.json",
      palette: "./analysis/palette.json",
      timing: null
    },
    audio: null,
    design: {
      effect: "./design/effect.json",
      cues: null
    },
    webAdapter: adapterId,
    source: {
      ...(songleId ? { songleId } : {}),
      ...(songUrl ? { songUrl } : {})
    }
  };

  writeFile(path.join(root, "manifest.json"), json(manifest), force, realSongRoot);
  writeFile(
    path.join(root, "references.json"),
    json({
      schema: "music-effect.references.v1",
      note: "Store URLs and reference purposes only. Do not copy lyrics, images, screenshots, transcripts, or article bodies here.",
      items: songUrl
        ? [
            {
              label: "Song source",
              type: "official",
              url: songUrl,
              purpose: "Reference URL only; do not copy lyrics, media, or page text."
            }
          ]
        : []
    }),
    force,
    realSongRoot
  );
  writeFile(path.join(root, "analysis", "markers.json"), json({ estimatedDuration: Number.isFinite(duration) && duration > 0 ? duration : null }), force, realSongRoot);
  writeFile(path.join(root, "analysis", "palette.json"), json({ base: [], accent: [], shadow: [] }), force, realSongRoot);
  writeFile(path.join(root, "design", "effect.json"), json({ schema: "music-effect.effect-design.v1", notes: [], cues: [] }), force, realSongRoot);
  writeFile(
    path.join(root, "design", "visual-brief.md"),
    `# ${title} Visual Brief\n\n## Main Structure\n\n- Decide the main visual structure before looking at existing song packs.\n\n## Avoid\n\n- Do not copy prior song layouts, fixture renderers, or glow/line compositions by default.\n\n## Inputs\n\n- Song URL: ${songUrl ?? "(not set)"}\n- Songle ID: ${songleId || "(not set)"}\n\n## Live Controls\n\n- Define only the controls this song needs.\n`,
    force,
    realSongRoot
  );
  writeFile(
    path.join(root, "README.md"),
    `# ${title}\n\nThis song pack is a neutral scaffold. It intentionally does not copy an existing song pack structure.\n\n## Status\n\n- Audio: not included\n- Lyrics: not included by default\n- Adapter: ${adapterId ?? "none"}\n\nIf you use a song-owned adapter, keep its code under this song pack and register it through \`song-packs/local-adapters.ts\` only when needed for same-build local preview.\n`,
    force,
    realSongRoot
  );
  writeFile(
    path.join(root, "CREDITS.md"),
    `# Credits\n\n- Song: ${title}\n- Artist: ${artist}\n${songUrl ? `- Source URL: ${songUrl}\n` : ""}${songleId ? `- Songle ID: ${songleId}\n` : ""}\nNo audio file, full lyrics, private asset, or secret is included in this scaffold.\n`,
    force,
    realSongRoot
  );

  if (withAdapter) {
    writeFile(
      path.join(root, "adapter.ts"),
      `import type { SongAdapterContext, SongApp, SongAppFrame, SongAppServices } from "../../system/kit";\n\nexport const createSongApp = (\n  context: SongAdapterContext,\n  services: SongAppServices\n): SongApp => {\n  const { canvas, ctx } = services;\n\n  const resize = () => {\n    const dpr = Math.max(1, window.devicePixelRatio || 1);\n    const rect = canvas.getBoundingClientRect();\n    canvas.width = Math.max(1, Math.floor(rect.width * dpr));\n    canvas.height = Math.max(1, Math.floor(rect.height * dpr));\n  };\n\n  const render = (_frame: SongAppFrame) => {\n    ctx.save();\n    ctx.setTransform(1, 0, 0, 1, 0, 0);\n    ctx.clearRect(0, 0, canvas.width, canvas.height);\n    ctx.restore();\n  };\n\n  return {\n    id: \`\${context.manifest.id}:neutral-start\`,\n    status: \`\${context.manifest.title}: neutral song app scaffold\`,\n    resize,\n    render\n  };\n};\n`,
      force,
      realSongRoot
    );
  }

  console.log(`Created song pack scaffold: ${path.relative(repoRoot, root)}`);
  if (adapterId?.startsWith("song:")) {
    console.log("Reminder: register the adapter in song-packs/local-adapters.ts for same-build fixture preview.");
  }
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
