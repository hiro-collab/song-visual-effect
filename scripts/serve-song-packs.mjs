import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "song-packs");
const port = Number(process.env.SONG_PACK_PORT ?? 5174);
const host = process.env.SONG_PACK_HOST ?? "127.0.0.1";

const mimeTypes = new Map([
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".ogg", "audio/ogg"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"]
]);

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Range",
    "Cross-Origin-Resource-Policy": "cross-origin",
    ...headers
  });
  response.end(body);
};

const filePathFor = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const relative = normalized.replace(/^[/\\]+/, "");
  const resolved = resolve(join(root, relative));
  return resolved === root || resolved.startsWith(`${root}${sep}`) ? resolved : null;
};

const serveFile = (request, response, filePath) => {
  const stats = statSync(filePath);
  if (!stats.isFile()) {
    send(response, 404, "Not found");
    return;
  }

  const contentType = mimeTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream";
  const baseHeaders = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store"
  };

  const range = request.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      send(response, 416, "Invalid range", { ...baseHeaders, "Content-Range": `bytes */${stats.size}` });
      return;
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : stats.size - 1;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= stats.size) {
      send(response, 416, "Invalid range", { ...baseHeaders, "Content-Range": `bytes */${stats.size}` });
      return;
    }
    response.writeHead(206, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Range",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ...baseHeaders,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stats.size}`
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Range",
    "Cross-Origin-Resource-Policy": "cross-origin",
    ...baseHeaders,
    "Content-Length": stats.size
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
};

const server = createServer((request, response) => {
  if (!request.url) {
    send(response, 400, "Bad request");
    return;
  }
  if (request.method === "OPTIONS") {
    send(response, 204, "");
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed");
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);
  const filePath = filePathFor(url.pathname);
  if (!filePath || !existsSync(filePath)) {
    send(response, 404, "Not found");
    return;
  }

  serveFile(request, response, filePath);
});

server.listen(port, host, () => {
  console.log(`Song pack server: http://${host}:${port}/`);
  console.log(`Fixture manifest: http://${host}:${port}/shining-star/manifest.json`);
});
