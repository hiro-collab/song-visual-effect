import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const songPacksRoot = path.join(repoRoot, "song-packs");
const realSongPacksRoot = fs.realpathSync(songPacksRoot);
const MAX_REFERENCES_BYTES = 64 * 1024;
const ALLOWED_REFERENCES_ROOT_KEYS = new Set(["schema", "note", "items"]);
const ALLOWED_REFERENCE_KEYS = new Set(["label", "type", "url", "purpose", "accessedAt", "note", "language"]);
const FORBIDDEN_KEY_PATTERN = /lyrics?|body|content|image|screenshot|base64|datauri|html|markdown|transcript|quote|fulltext/i;
const FORBIDDEN_VALUE_PATTERN = /data:image\/|data:audio\/|data:video\/|base64,|<img\b|<script\b/i;

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
    opts[arg.slice(2)] = args[i + 1] ?? "";
    i += 1;
  }
  return opts;
};

const assertSongId = (id) => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error("Use --id with lowercase letters, numbers, dot, underscore, or hyphen.");
  }
};

const readJson = (filePath, maxBytes) => {
  const stat = fs.statSync(filePath);
  if (stat.size > maxBytes) {
    throw new Error(`File is too large: ${path.relative(repoRoot, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const resolveInsideSongPack = (root, relativePath) => {
  if (!relativePath || typeof relativePath !== "string") return null;
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed in song pack metadata: ${relativePath}`);
  }
  const target = path.resolve(root, relativePath);
  const parent = fs.existsSync(target) ? target : path.dirname(target);
  const realParent = fs.realpathSync(parent);
  if (!isInside(realSongPacksRoot, realParent)) {
    throw new Error(`Path escapes song-packs: ${path.relative(repoRoot, target)}`);
  }
  return target;
};

const assertHttpUrl = (value, label) => {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must be http(s): ${value}`);
  }
  if (FORBIDDEN_VALUE_PATTERN.test(value)) {
    throw new Error(`${label} contains embedded data or markup: ${value}`);
  }
};

const assertShortString = (value, label, maxLength) => {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} is too long. Store a short purpose, not copied text.`);
  }
  if (FORBIDDEN_VALUE_PATTERN.test(value)) {
    throw new Error(`${label} contains embedded data or markup.`);
  }
};

const validateReferenceItem = (item, index) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`references.items[${index}] must be an object.`);
  }
  for (const key of Object.keys(item)) {
    if (!ALLOWED_REFERENCE_KEYS.has(key) || FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`references.items[${index}].${key} is not allowed. Store URL metadata only.`);
    }
  }
  assertShortString(item.label ?? "", `references.items[${index}].label`, 200);
  assertShortString(item.type ?? "other", `references.items[${index}].type`, 64);
  assertShortString(item.purpose ?? "", `references.items[${index}].purpose`, 600);
  if ("note" in item) assertShortString(item.note, `references.items[${index}].note`, 600);
  if ("language" in item) assertShortString(item.language, `references.items[${index}].language`, 40);
  if ("accessedAt" in item) assertShortString(item.accessedAt, `references.items[${index}].accessedAt`, 40);
  if (!item.url) throw new Error(`references.items[${index}].url is required.`);
  assertShortString(item.url, `references.items[${index}].url`, 2048);
  assertHttpUrl(item.url, `references.items[${index}].url`);
};

const validateReferences = (referencesPath) => {
  if (!fs.existsSync(referencesPath)) return ["references.json not found"];
  if (fs.lstatSync(referencesPath).isSymbolicLink()) {
    throw new Error(`Refusing symlinked references file: ${path.relative(repoRoot, referencesPath)}`);
  }
  const references = readJson(referencesPath, MAX_REFERENCES_BYTES);
  if (!references || typeof references !== "object" || Array.isArray(references)) {
    throw new Error("references.json must be an object.");
  }
  if (references.schema && references.schema !== "music-effect.references.v1") {
    throw new Error("references.json schema must be music-effect.references.v1.");
  }
  for (const key of Object.keys(references)) {
    if (!ALLOWED_REFERENCES_ROOT_KEYS.has(key) || FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`references.${key} is not allowed. Store URL metadata only.`);
    }
  }
  if ("note" in references) assertShortString(references.note, "references.note", 600);
  if (!Array.isArray(references.items)) {
    throw new Error("references.items must be an array.");
  }
  if (references.items.length > 100) {
    throw new Error("references.items has too many entries.");
  }
  references.items.forEach(validateReferenceItem);
  return [];
};

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  const id = String(opts.id ?? opts.song ?? "").trim();
  assertSongId(id);

  const root = path.join(songPacksRoot, id);
  const realRoot = fs.realpathSync(root);
  if (!isInside(realSongPacksRoot, realRoot)) {
    throw new Error(`Song pack escapes song-packs: ${id}`);
  }

  const manifestPath = path.join(root, "manifest.json");
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath, 256 * 1024) : {};
  const referencesPath =
    resolveInsideSongPack(root, manifest.references ?? "references.json") ?? path.join(root, "references.json");
  const warnings = validateReferences(referencesPath);

  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  console.log(`Song pack validation ok: ${path.relative(repoRoot, root)}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
