import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { startLaunchManager } from "./launch-manager/server.mjs";

const root = resolve(process.cwd());
const portsFile = resolve(root, ".codex", "runtime", "ports.json");

const openUrl = (url) => {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/d", "/s", "/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }).unref();
    return;
  }
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
};

const readExistingManagerUrl = () => {
  if (!existsSync(portsFile)) return null;
  try {
    const info = JSON.parse(readFileSync(portsFile, "utf8"));
    if (resolve(info.root) !== root) return null;
    return typeof info.url === "string" ? info.url : null;
  } catch {
    return null;
  }
};

const probeManager = async (url) => {
  if (!url) return false;
  try {
    const response = await fetch(new URL("/api/status", url), { signal: AbortSignal.timeout(1200) });
    if (!response.ok) return false;
    const status = await response.json();
    return resolve(status.root) === root;
  } catch {
    return false;
  }
};

const runNpmCiIfNeeded = () => {
  if (existsSync(resolve(root, "node_modules"))) return;
  console.log("Installing dependencies with npm ci...");
  const result = spawnSync("npm", ["ci"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const main = async () => {
  const existingUrl = readExistingManagerUrl();
  if (await probeManager(existingUrl)) {
    console.log(`Music Effect Launch Manager is already running for this worktree: ${existingUrl}`);
    openUrl(existingUrl);
    return;
  }

  runNpmCiIfNeeded();
  console.log("Starting Music Effect Launch Manager...");
  const { url, config } = await startLaunchManager({ root });
  console.log(`Worktree: ${config.root}`);
  console.log("Keep this window open while using Music Effect. Close it with Ctrl+C when finished.");
  openUrl(url);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
