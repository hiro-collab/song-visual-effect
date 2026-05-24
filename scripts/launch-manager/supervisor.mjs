import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { resolve } from "node:path";
import { appendManagerLog, closeLogWriters, createLogWriters, prepareTargetLogs, targetLogTail } from "./logs.mjs";
import { readProcessMetrics } from "./metrics.mjs";
import { findPortConflicts } from "./ports.mjs";

const isWindows = platform() === "win32";
const HEALTH_GRACE_MS = 30000;
const METRICS_INTERVAL_MS = 5000;

const nowIso = () => new Date().toISOString();

const childIsAlive = (child) => Boolean(child && child.exitCode === null && child.signalCode === null);

const spawnCommandFor = (target) => {
  if (isWindows && /^(npm|npx)$/.test(target.command)) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", target.command, ...target.args]
    };
  }
  return { command: target.command, args: target.args };
};

const fetchHealth = async (health) => {
  if (!health?.url) return { status: "none", ok: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1600);
  try {
    const response = await fetch(health.url, { method: "GET", signal: controller.signal });
    return { status: response.ok ? "ok" : "fail", ok: response.ok };
  } catch {
    return { status: "fail", ok: false };
  } finally {
    clearTimeout(timeout);
  }
};

const waitForExit = (child, timeoutMs = 5000) =>
  new Promise((resolve) => {
    if (!childIsAlive(child)) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });

export class LaunchSupervisor {
  constructor(config, { runtimeRoot = resolve(config.root, ".codex", "runtime", "launch-manager") } = {}) {
    this.config = config;
    this.runtimeRoot = runtimeRoot;
    this.states = new Map(
      config.targets.map((target) => [
        target.id,
        {
          target,
          child: null,
          status: "stopped",
          startedAt: null,
          stoppedAt: null,
          exitCode: null,
          signal: null,
          error: "",
          health: "unknown",
          healthFailures: 0,
          metrics: { exists: false },
          metricsUpdatedAt: 0,
          logPaths: null,
          logWriters: null
        }
      ])
    );
  }

  async init() {
    await mkdir(this.runtimeRoot, { recursive: true });
  }

  stateFor(targetId) {
    const state = this.states.get(targetId);
    if (!state) throw new Error(`Unknown target: ${targetId}`);
    return state;
  }

  setFor(setId) {
    const set = this.config.setMap.get(setId);
    if (!set) throw new Error(`Unknown set: ${setId}`);
    return set;
  }

  async startTarget(targetId) {
    const state = this.stateFor(targetId);
    if (childIsAlive(state.child)) return this.publicTargetStatus(state);

    state.status = "starting";
    state.startedAt = nowIso();
    state.stoppedAt = null;
    state.exitCode = null;
    state.signal = null;
    state.error = "";
    state.health = "unknown";
    state.healthFailures = 0;
    state.metrics = { exists: false };
    state.metricsUpdatedAt = 0;
    state.logPaths = await prepareTargetLogs(this.runtimeRoot, state.target.id);
    state.logWriters = createLogWriters(state.logPaths);

    const conflicts = await findPortConflicts(state.target.ports);
    if (conflicts.length > 0) {
      state.status = "error";
      state.error = `Port already in use: ${conflicts.join(", ")}`;
      appendManagerLog(state.logWriters.stderr, state.error);
      closeLogWriters(state.logWriters);
      return this.publicTargetStatus(state);
    }

    const { command, args } = spawnCommandFor(state.target);
    appendManagerLog(state.logWriters.stdout, `Starting ${state.target.id}: ${command} ${args.join(" ")}`);

    try {
      const child = spawn(command, args, {
        cwd: state.target.cwd,
        env: { ...process.env, ...state.target.env },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
      state.child = child;
      child.stdout.pipe(state.logWriters.stdout, { end: false });
      child.stderr.pipe(state.logWriters.stderr, { end: false });
      child.once("spawn", () => {
        if (!state.target.health) state.status = "running";
      });
      child.once("error", (error) => {
        state.status = "error";
        state.error = error.message;
        appendManagerLog(state.logWriters.stderr, `Spawn error: ${error.message}`);
      });
      child.once("exit", (code, signal) => {
        state.exitCode = code;
        state.signal = signal;
        state.stoppedAt = nowIso();
        if (state.status === "stopping" || code === 0) {
          state.status = "stopped";
        } else {
          state.status = "error";
          state.error = `Process exited with ${code ?? signal ?? "unknown"}`;
        }
        appendManagerLog(state.logWriters.stdout, `Exited with ${code ?? signal ?? "unknown"}`);
        closeLogWriters(state.logWriters);
      });
    } catch (error) {
      state.status = "error";
      state.error = error.message;
      appendManagerLog(state.logWriters.stderr, `Start failed: ${error.message}`);
      closeLogWriters(state.logWriters);
    }

    return this.publicTargetStatus(state);
  }

  async stopTarget(targetId) {
    const state = this.stateFor(targetId);
    if (!childIsAlive(state.child)) {
      state.status = "stopped";
      state.health = "unknown";
      state.error = "";
      return this.publicTargetStatus(state);
    }

    state.status = "stopping";
    appendManagerLog(state.logWriters?.stdout, `Stopping ${state.target.id}`);
    if (isWindows) {
      const killer = spawn("taskkill", ["/PID", String(state.child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      await waitForExit(killer, 4000);
    } else {
      state.child.kill("SIGTERM");
    }
    await waitForExit(state.child, 5000);
    if (childIsAlive(state.child)) state.child.kill("SIGKILL");
    return this.publicTargetStatus(state);
  }

  async restartTarget(targetId) {
    await this.stopTarget(targetId);
    return this.startTarget(targetId);
  }

  async startSet(setId) {
    const set = this.setFor(setId);
    const results = [];
    for (const targetId of set.targets) results.push(await this.startTarget(targetId));
    return results;
  }

  async stopSet(setId) {
    const set = this.setFor(setId);
    const results = [];
    for (const targetId of [...set.targets].reverse()) results.push(await this.stopTarget(targetId));
    return results;
  }

  async stopAll() {
    const results = [];
    for (const target of [...this.config.targets].reverse()) results.push(await this.stopTarget(target.id));
    return results;
  }

  async refreshTarget(state) {
    if (!childIsAlive(state.child)) {
      state.metrics = { exists: false };
      state.metricsUpdatedAt = 0;
      if (state.status === "stopped") state.health = "unknown";
      return;
    }

    const shouldReadMetrics = Date.now() - state.metricsUpdatedAt > METRICS_INTERVAL_MS;
    const [metrics, health] = await Promise.all([
      shouldReadMetrics ? readProcessMetrics(state.child.pid) : Promise.resolve(state.metrics),
      fetchHealth(state.target.health)
    ]);
    if (shouldReadMetrics) {
      state.metrics = metrics;
      state.metricsUpdatedAt = Date.now();
    }
    state.health = health.status;
    if (health.ok) {
      state.healthFailures = 0;
      if (state.status === "starting" || state.error === "Health check did not become ready." || state.error === "Health check failed.") {
        state.status = "running";
        state.error = "";
      }
    } else if (state.target.health) {
      state.healthFailures += 1;
      const startedAt = state.startedAt ? Date.parse(state.startedAt) : Date.now();
      const graceExpired = Date.now() - startedAt > HEALTH_GRACE_MS;
      if (state.status === "running" && state.healthFailures >= 3) {
        state.status = "error";
        state.error = "Health check failed.";
      } else if (state.status === "starting" && graceExpired) {
        state.status = "error";
        state.error = "Health check did not become ready.";
      }
    }
  }

  async publicTargetStatus(state) {
    await this.refreshTarget(state);
    const logs = await targetLogTail(state.logPaths);
    return {
      id: state.target.id,
      label: state.target.label,
      kind: state.target.kind,
      status: state.status,
      running: childIsAlive(state.child),
      pid: childIsAlive(state.child) ? state.child.pid : null,
      ports: state.target.ports,
      urls: state.target.urls,
      openUrl: state.target.urls.open ?? null,
      cwd: state.target.cwdText,
      command: state.target.command,
      args: state.target.args,
      startedAt: state.startedAt,
      stoppedAt: state.stoppedAt,
      exitCode: state.exitCode,
      signal: state.signal,
      error: state.error,
      health: state.health,
      metrics: state.metrics,
      logPaths: state.logPaths,
      logs
    };
  }

  async snapshot() {
    const targets = [];
    for (const target of this.config.targets) {
      targets.push(await this.publicTargetStatus(this.stateFor(target.id)));
    }
    const status = {
      updatedAt: nowIso(),
      root: this.config.root,
      configPath: this.config.configPath,
      runtimeRoot: this.runtimeRoot,
      portsFile: this.config.launchPortsFile ?? null,
      launchPorts: this.config.launchPorts ?? null,
      sets: this.config.sets,
      targets
    };
    await writeFile(resolve(this.runtimeRoot, "latest-status.json"), JSON.stringify(status, null, 2), "utf8");
    return status;
  }
}
