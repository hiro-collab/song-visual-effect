import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { startLyricsInstallerGui } from "./lyrics-installer/server.mjs";

const root = resolve(process.cwd());

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
  runNpmCiIfNeeded();
  console.log("Starting Lyrics Data Installer...");
  const { url } = await startLyricsInstallerGui();
  console.log(`Worktree: ${root}`);
  console.log("Keep this window open while installing lyrics timing data. Close it with Ctrl+C when finished.");
  openUrl(url);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
