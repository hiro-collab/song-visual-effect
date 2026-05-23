import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "song-packs");
const port = Number(process.env.SONG_PACK_PORT ?? 5174);
const host = process.env.SONG_PACK_HOST ?? "127.0.0.1";
const defaultCorsOrigins = "http://127.0.0.1:5173,http://localhost:5173";
const realRoot = realpathSync(root);

const mimeTypes = new Map([
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".glb", "model/gltf-binary"],
  [".gltf", "model/gltf+json; charset=utf-8"]
]);

const baseSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};

const assertLoopbackHost = (value, label) => {
  const normalized = value.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (!["127.0.0.1", "localhost", "::1"].includes(normalized)) {
    throw new Error(`${label} must be a loopback host. Refusing to bind to ${value}.`);
  }
};

assertLoopbackHost(host, "SONG_PACK_HOST");

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("SONG_PACK_PORT must be a TCP port number.");
}

const isInside = (parent, child) => {
  const baseKey = process.platform === "win32" ? parent.toLowerCase() : parent;
  const targetKey = process.platform === "win32" ? child.toLowerCase() : child;
  return targetKey === baseKey || targetKey.startsWith(`${baseKey}${sep}`);
};

const normalizeCorsOrigin = (origin) => {
  const trimmed = origin.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`SONG_PACK_CORS_ORIGINS must use http or https: ${trimmed}`);
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`SONG_PACK_CORS_ORIGINS must contain origins only: ${trimmed}`);
  }
  assertLoopbackHost(url.hostname, "SONG_PACK_CORS_ORIGINS");
  return url.origin;
};

const allowedCorsOrigins = new Set(
  (process.env.SONG_PACK_CORS_ORIGINS ?? defaultCorsOrigins)
    .split(",")
    .map(normalizeCorsOrigin)
    .filter(Boolean)
);

const corsHeadersFor = (request) => {
  const origin = request.headers.origin;
  if (!origin) return {};
  if (!allowedCorsOrigins.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Range",
    "Cross-Origin-Resource-Policy": "cross-origin",
    Vary: "Origin"
  };
};

const writeHead = (request, response, status, headers = {}) => {
  const corsHeaders = corsHeadersFor(request);
  if (corsHeaders === null) {
    response.writeHead(403, {
      ...baseSecurityHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end("Forbidden origin");
    return false;
  }
  response.writeHead(status, {
    ...baseSecurityHeaders,
    ...corsHeaders,
    ...headers
  });
  return true;
};

const send = (request, response, status, body, headers = {}) => {
  if (!writeHead(request, response, status, headers)) return;
  response.end(body);
};

const filePathFor = (pathname) => {
  let decoded = "";
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const relative = normalized.replace(/^[/\\]+/, "");
  if (relative.split(/[\\/]+/).some((segment) => segment.startsWith("."))) return null;
  const resolved = resolve(join(root, relative));
  return isInside(root, resolved) ? resolved : null;
};

const serveFile = (request, response, filePath) => {
  let realFilePath;
  try {
    realFilePath = realpathSync(filePath);
  } catch {
    send(request, response, 404, "Not found");
    return;
  }
  if (!isInside(realRoot, realFilePath)) {
    send(request, response, 404, "Not found");
    return;
  }

  const stats = statSync(realFilePath);
  if (!stats.isFile()) {
    send(request, response, 404, "Not found");
    return;
  }

  const extension = extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(extension);
  if (!contentType) {
    send(request, response, 404, "Not found");
    return;
  }
  const baseHeaders = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store"
  };

  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      send(request, response, 416, "Invalid range", { ...baseHeaders, "Content-Range": `bytes */${stats.size}` });
      return;
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stats.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= stats.size) {
      send(request, response, 416, "Invalid range", { ...baseHeaders, "Content-Range": `bytes */${stats.size}` });
      return;
    }
    if (!writeHead(request, response, 206, {
      ...baseHeaders,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stats.size}`
    })) return;
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(realFilePath, { start, end }).pipe(response);
    return;
  }

  if (!writeHead(request, response, 200, {
    ...baseHeaders,
    "Content-Length": stats.size
  })) return;
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(realFilePath).pipe(response);
};

const server = createServer((request, response) => {
  if (!request.url) {
    send(request, response, 400, "Bad request");
    return;
  }
  if (request.method === "OPTIONS") {
    send(request, response, 204, "");
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(request, response, 405, "Method not allowed");
    return;
  }

  let url;
  try {
    url = new URL(request.url, `http://${host}:${port}`);
  } catch {
    send(request, response, 400, "Bad request");
    return;
  }
  if (url.pathname === "/") {
    send(
      request,
      response,
      200,
      [
        "Song pack server",
        "",
        "Use /<song-id>/manifest.json as a song manifest URL.",
        "Existing song packs are fixtures, not templates for new songs."
      ].join("\n"),
      { "Content-Type": "text/plain; charset=utf-8" }
    );
    return;
  }
  const filePath = filePathFor(url.pathname);
  if (!filePath || !existsSync(filePath)) {
    send(request, response, 404, "Not found");
    return;
  }

  serveFile(request, response, filePath);
});

server.listen(port, host, () => {
  console.log(`Song pack server: http://${host}:${port}/`);
});
