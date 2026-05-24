import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyLaunchPortsToEnv, resolvePortsFromEnv, writePortsFile } from "./auto-ports.mjs";
import { assertLoopbackHost, loadLaunchConfig } from "./config.mjs";
import { LaunchSupervisor } from "./supervisor.mjs";
import { listSongCatalog } from "./songs.mjs";
import { managerHtml } from "./ui.mjs";

const baseSecurityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
};

const htmlSecurityHeaders = (nonce) => ({
  ...baseSecurityHeaders,
  "Content-Security-Policy": [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join("; ")
});

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body, null, 2));
};

const sendText = (response, status, body) => {
  response.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(body);
};

const safeSongCatalog = async (config) => {
  try {
    return await listSongCatalog(config);
  } catch (error) {
    return {
      songs: [],
      errors: [`song catalog could not be read: ${error.message}`],
      requiredTargetIds: [],
      launchSetId: null
    };
  }
};

const isTrustedBrowserOrigin = (request, allowedOrigins) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) return false;
  const fetchSite = request.headers["sec-fetch-site"];
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
};

const routePost = async (url, supervisor) => {
  let match = /^\/api\/targets\/([^/]+)\/(start|stop|restart)$/.exec(url.pathname);
  if (match) {
    const [, id, action] = match;
    if (action === "start") return { ok: true, target: await supervisor.startTarget(id) };
    if (action === "stop") return { ok: true, target: await supervisor.stopTarget(id) };
    return { ok: true, target: await supervisor.restartTarget(id) };
  }

  match = /^\/api\/sets\/([^/]+)\/(start|stop)$/.exec(url.pathname);
  if (match) {
    const [, id, action] = match;
    return {
      ok: true,
      targets: action === "start" ? await supervisor.startSet(id) : await supervisor.stopSet(id)
    };
  }

  if (url.pathname === "/api/stop-all") return { ok: true, targets: await supervisor.stopAll() };
  if (url.pathname === "/api/start-all") {
    const firstSet = supervisor.config.sets[0];
    return { ok: true, targets: firstSet ? await supervisor.startSet(firstSet.id) : [] };
  }

  throw new Error("Unknown API endpoint.");
};

export const startLaunchManager = async ({
  root = process.cwd(),
  host = process.env.DEV_MANAGER_HOST ?? process.env.LAUNCH_MANAGER_HOST ?? "127.0.0.1",
  port = null,
  title = "Music Effect Launch Manager"
} = {}) => {
  assertLoopbackHost(host, "Launch Manager host");
  const resolvedRoot = resolve(root);
  const launchPorts = await resolvePortsFromEnv({ root: resolvedRoot, host, explicitManagerPort: port });
  applyLaunchPortsToEnv(launchPorts);
  if (!Number.isInteger(launchPorts.manager) || launchPorts.manager <= 0 || launchPorts.manager > 65535) {
    throw new Error("Launch Manager port is invalid.");
  }

  const config = await loadLaunchConfig({ root: resolvedRoot });
  config.launchPorts = launchPorts;
  const supervisor = new LaunchSupervisor(config);
  await supervisor.init();
  config.launchPortsFile = resolve(config.root, ".codex", "runtime", "ports.json");

  const allowedOrigins = new Set([
    `http://${host}:${launchPorts.manager}`,
    `http://127.0.0.1:${launchPorts.manager}`,
    `http://localhost:${launchPorts.manager}`
  ]);

  const server = createServer(async (request, response) => {
    let url;
    try {
      url = new URL(request.url ?? "/", `http://${host}:${launchPorts.manager}`);
    } catch {
      sendText(response, 400, "Bad request");
      return;
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, {
          ...(await supervisor.snapshot()),
          songCatalog: await safeSongCatalog(config)
        });
        return;
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/")) {
        if (!isTrustedBrowserOrigin(request, allowedOrigins)) {
          sendJson(response, 403, { ok: false, error: "Forbidden origin." });
          return;
        }
        sendJson(response, 200, await routePost(url, supervisor));
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendText(response, 405, "Method not allowed");
        return;
      }

      const nonce = randomBytes(16).toString("base64url");
      response.writeHead(200, {
        ...htmlSecurityHeaders(nonce),
        "Content-Type": "text/html; charset=utf-8"
      });
      response.end(managerHtml({ title, nonce }));
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message });
    }
  });

  const shutdown = async () => {
    await supervisor.stopAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await new Promise((resolveListen) => server.listen(launchPorts.manager, host, resolveListen));
  const url = `http://${host}:${launchPorts.manager}/`;
  await writePortsFile({
    root: config.root,
    runtimeRoot: supervisor.runtimeRoot,
    configPath: config.configPath,
    ports: launchPorts,
    url
  });
  console.log(`${title}: ${url}`);
  console.log(`Ports: manager ${launchPorts.manager}, player ${launchPorts.player}, song packs ${launchPorts.songPack}`);
  console.log(`Launch targets: ${config.configPath}`);
  return { server, supervisor, config, url };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startLaunchManager().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
