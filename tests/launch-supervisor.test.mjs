import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LaunchSupervisor } from "../scripts/launch-manager/supervisor.mjs";
import { findFreePort } from "../scripts/launch-manager/ports.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const writeDummyServer = (root) => {
  const script = resolve(root, "dummy-server.mjs");
  writeFileSync(
    script,
    `import http from "node:http";
const port = Number(process.argv[2]);
const server = http.createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("ok");
});
server.listen(port, "127.0.0.1");
`,
    "utf8"
  );
  return script;
};

const writeFlaggedHealthServer = (root) => {
  const script = resolve(root, "flagged-health-server.mjs");
  writeFileSync(
    script,
    `import http from "node:http";
import { existsSync } from "node:fs";
const port = Number(process.argv[2]);
const failFlag = process.argv[3];
const server = http.createServer((_request, response) => {
  if (existsSync(failFlag)) {
    response.writeHead(503, { "content-type": "text/plain" });
    response.end("not ready");
    return;
  }
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("ok");
});
server.listen(port, "127.0.0.1");
`,
    "utf8"
  );
  return script;
};

const waitForStatus = async (supervisor, targetId, predicate, label) => {
  const deadline = Date.now() + 6000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await supervisor.publicTargetStatus(supervisor.stateFor(targetId));
    if (predicate(latest)) return latest;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
  }
  assert.fail(`${label}: latest status was ${JSON.stringify(latest)}`);
};

test("LaunchSupervisor starts, health-checks, and stops only managed targets", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "music-effect-launch-supervisor-"));
  const runtimeRoot = resolve(tempRoot, "runtime");
  const script = writeDummyServer(tempRoot);
  const managedPort = await findFreePort({ start: 59000, host: "127.0.0.1" });
  const externalPort = await findFreePort({ start: managedPort + 1, host: "127.0.0.1", exclude: new Set([managedPort]) });
  const external = spawn(process.execPath, [script, String(externalPort)], {
    cwd: repoRoot,
    windowsHide: true,
    stdio: "ignore"
  });

  const config = {
    root: repoRoot,
    configPath: resolve(repoRoot, "launch", "test-targets.json"),
    timing: {},
    launchPortsFile: null,
    launchPorts: null,
    targets: [
      {
        id: "dummy-managed",
        label: "Dummy managed",
        kind: "test-server",
        cwd: repoRoot,
        cwdText: ".",
        command: process.execPath,
        args: [script, String(managedPort)],
        env: {},
        ports: [managedPort],
        urls: { open: `http://127.0.0.1:${managedPort}/` },
        startupTimeoutMs: 5000,
        health: { url: `http://127.0.0.1:${managedPort}/`, intervalMs: 1000 }
      }
    ],
    sets: [{ id: "default", label: "Default", description: "", targets: ["dummy-managed"] }],
    targetMap: new Map(),
    setMap: new Map()
  };
  config.targetMap = new Map(config.targets.map((target) => [target.id, target]));
  config.setMap = new Map(config.sets.map((set) => [set.id, set]));

  const supervisor = new LaunchSupervisor(config, { runtimeRoot });
  try {
    await supervisor.init();
    await supervisor.startTarget("dummy-managed");
    const running = await waitForStatus(
      supervisor,
      "dummy-managed",
      (status) => status.status === "running" && status.health === "ok" && status.running,
      "managed target should become healthy"
    );
    assert.equal(running.ports[0], managedPort);
    assert.equal(typeof running.readyAt, "string");
    assert.equal(typeof running.startupDurationMs, "number");
    assert.match(running.logs.stdout, /dummy-managed is ready after \d+ ms\./);

    await supervisor.stopAll();
    const stopped = await waitForStatus(
      supervisor,
      "dummy-managed",
      (status) => status.status === "stopped" && !status.running,
      "managed target should stop"
    );
    assert.equal(stopped.health, "unknown");
    assert.equal(external.exitCode, null, "unmanaged external process should still be alive");
  } finally {
    await supervisor.stopAll().catch(() => {});
    if (external.exitCode === null) external.kill();
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LaunchSupervisor treats early running health failures as retryable", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "music-effect-launch-health-retry-"));
  const runtimeRoot = resolve(tempRoot, "runtime");
  const script = writeFlaggedHealthServer(tempRoot);
  const failFlag = resolve(tempRoot, "fail-health");
  const port = await findFreePort({ start: 59100, host: "127.0.0.1" });

  const config = {
    root: repoRoot,
    configPath: resolve(repoRoot, "launch", "test-targets.json"),
    timing: {},
    launchPortsFile: null,
    launchPorts: null,
    targets: [
      {
        id: "retry-health-managed",
        label: "Retry health managed",
        kind: "test-server",
        cwd: repoRoot,
        cwdText: ".",
        command: process.execPath,
        args: [script, String(port), failFlag],
        env: {},
        ports: [port],
        urls: { open: `http://127.0.0.1:${port}/` },
        startupTimeoutMs: 5000,
        health: { url: `http://127.0.0.1:${port}/`, intervalMs: 1000 }
      }
    ],
    sets: [{ id: "default", label: "Default", description: "", targets: ["retry-health-managed"] }],
    targetMap: new Map(),
    setMap: new Map()
  };
  config.targetMap = new Map(config.targets.map((target) => [target.id, target]));
  config.setMap = new Map(config.sets.map((set) => [set.id, set]));

  const supervisor = new LaunchSupervisor(config, { runtimeRoot });
  try {
    await supervisor.init();
    await supervisor.startTarget("retry-health-managed");
    await waitForStatus(
      supervisor,
      "retry-health-managed",
      (status) => status.status === "running" && status.health === "ok" && status.running,
      "target should become healthy before simulating a health failure"
    );

    writeFileSync(failFlag, "fail", "utf8");
    const firstFailure = await waitForStatus(
      supervisor,
      "retry-health-managed",
      (status) => status.health === "fail" && status.healthFailures === 1,
      "first health failure should be visible"
    );
    assert.equal(typeof firstFailure.readyAt, "string");
    assert.equal(typeof firstFailure.startupDurationMs, "number");
    assert.equal(firstFailure.status, "running");
    assert.equal(firstFailure.error, "");

    const secondFailure = await waitForStatus(
      supervisor,
      "retry-health-managed",
      (status) => status.health === "fail" && status.healthFailures === 2,
      "second health failure should still be retryable"
    );
    assert.equal(secondFailure.status, "running");
    assert.equal(secondFailure.error, "");

    const confirmedFailure = await waitForStatus(
      supervisor,
      "retry-health-managed",
      (status) => status.status === "error" && status.healthFailures >= 3,
      "third health failure should become an error"
    );
    assert.equal(confirmedFailure.error, "Health check failed.");
  } finally {
    await supervisor.stopAll().catch(() => {});
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
