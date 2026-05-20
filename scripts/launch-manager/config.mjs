import { readFile } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";

const DEFAULT_CONFIG_PATH = "launch/targets.json";
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const COMMAND_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
const SHELL_META_PATTERN = /[&|<>^%!"]/;
const TEMPLATE_PATTERN = /\$\{([A-Z0-9_]+)(?::-(.*?))?\}/g;
const PROTECTED_ENV_NAMES = new Set(["COMSPEC", "NODE_OPTIONS", "PATH", "PATHEXT", "SYSTEMROOT"]);

const asArray = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
};

const asString = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (/[\r\n]/.test(value)) throw new Error(`${label} must not contain newlines.`);
  return value;
};

const asOptionalString = (value, label) => {
  if (value === undefined || value === null) return undefined;
  return asString(value, label);
};

const isInside = (parent, child) => {
  const base = resolve(parent);
  const target = resolve(child);
  const baseKey = process.platform === "win32" ? base.toLowerCase() : base;
  const targetKey = process.platform === "win32" ? target.toLowerCase() : target;
  return targetKey === baseKey || targetKey.startsWith(`${baseKey}${sep}`);
};

export const assertLoopbackHost = (value, label) => {
  if (!["127.0.0.1", "localhost", "::1"].includes(value)) {
    throw new Error(`${label} must be a loopback host. Refusing to bind to ${value}.`);
  }
};

const validateId = (value, label) => {
  const id = asString(value, label);
  if (!ID_PATTERN.test(id)) {
    throw new Error(`${label} must use letters, numbers, hyphen, or underscore.`);
  }
  return id;
};

const validateCommand = (value, label) => {
  const command = asString(value, label);
  if (!COMMAND_PATTERN.test(command)) {
    throw new Error(`${label} must be a command name, not a path or shell expression.`);
  }
  return command;
};

const validateArg = (value, label) => {
  const arg = asString(value, label);
  if (SHELL_META_PATTERN.test(arg)) {
    throw new Error(`${label} must not contain shell metacharacters.`);
  }
  return arg;
};

const expandTemplate = (value, env) => value.replace(TEMPLATE_PATTERN, (_match, name, fallback = "") => {
  const resolved = env[name] ?? fallback;
  if (resolved === undefined || resolved === "") {
    throw new Error(`Missing environment value for ${name}.`);
  }
  return String(resolved);
});

const expandValue = (value, env) => {
  if (typeof value === "string") return expandTemplate(value, env);
  if (Array.isArray(value)) return value.map((item) => expandValue(item, env));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandValue(item, env)]));
  }
  return value;
};

const normalizePort = (value, label) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${label} must be a TCP port number.`);
  }
  return port;
};

const normalizeUrls = (rawUrls = {}, label) => {
  if (!rawUrls || typeof rawUrls !== "object" || Array.isArray(rawUrls)) return {};
  const urls = {};
  for (const [key, value] of Object.entries(rawUrls)) {
    const url = new URL(asString(value, `${label}.${key}`));
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`${label}.${key} must be http or https.`);
    }
    assertLoopbackHost(url.hostname, `${label}.${key}`);
    urls[key] = url.toString();
  }
  return urls;
};

const normalizeEnv = (rawEnv = {}, label) => {
  if (!rawEnv || typeof rawEnv !== "object" || Array.isArray(rawEnv)) return {};
  return Object.fromEntries(
    Object.entries(rawEnv).map(([key, value]) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) throw new Error(`${label}.${key} is not a valid env name.`);
      if (PROTECTED_ENV_NAMES.has(key.toUpperCase())) {
        throw new Error(`${label}.${key} must not override the Launch Manager runner environment.`);
      }
      return [key, asString(value, `${label}.${key}`)];
    })
  );
};

const normalizeTarget = (rawTarget, index, root) => {
  if (!rawTarget || typeof rawTarget !== "object" || Array.isArray(rawTarget)) {
    throw new Error(`targets[${index}] must be an object.`);
  }
  const id = validateId(rawTarget.id, `targets[${index}].id`);
  const cwdText = asOptionalString(rawTarget.cwd, `targets[${index}].cwd`) ?? ".";
  const cwd = isAbsolute(cwdText) ? resolve(cwdText) : resolve(root, cwdText);
  if (!isInside(root, cwd)) {
    throw new Error(`Target ${id} cwd must stay inside the repository: ${cwdText}`);
  }

  const command = validateCommand(rawTarget.command, `targets[${index}].command`);
  const args = asArray(rawTarget.args ?? [], `targets[${index}].args`).map((arg, argIndex) =>
    validateArg(arg, `targets[${index}].args[${argIndex}]`)
  );
  const ports = asArray(rawTarget.ports ?? [], `targets[${index}].ports`).map((port, portIndex) =>
    normalizePort(port, `targets[${index}].ports[${portIndex}]`)
  );
  const health = rawTarget.health
    ? {
        url: normalizeUrls({ url: rawTarget.health.url }, `targets[${index}].health`).url,
        intervalMs: Number(rawTarget.health.intervalMs ?? 5000)
      }
    : null;
  if (health && (!Number.isFinite(health.intervalMs) || health.intervalMs < 1000)) {
    throw new Error(`targets[${index}].health.intervalMs must be at least 1000.`);
  }

  return {
    id,
    label: asOptionalString(rawTarget.label, `targets[${index}].label`) ?? id,
    kind: asOptionalString(rawTarget.kind, `targets[${index}].kind`) ?? "process",
    cwd,
    cwdText,
    command,
    args,
    env: normalizeEnv(rawTarget.env, `targets[${index}].env`),
    ports,
    urls: normalizeUrls(rawTarget.urls, `targets[${index}].urls`),
    health
  };
};

const normalizeSet = (rawSet, index, targetIds) => {
  if (!rawSet || typeof rawSet !== "object" || Array.isArray(rawSet)) {
    throw new Error(`sets[${index}] must be an object.`);
  }
  const id = validateId(rawSet.id, `sets[${index}].id`);
  const targets = asArray(rawSet.targets ?? [], `sets[${index}].targets`).map((targetId, targetIndex) => {
    const value = validateId(targetId, `sets[${index}].targets[${targetIndex}]`);
    if (!targetIds.has(value)) throw new Error(`Set ${id} references unknown target: ${value}`);
    return value;
  });
  return {
    id,
    label: asOptionalString(rawSet.label, `sets[${index}].label`) ?? id,
    description: asOptionalString(rawSet.description, `sets[${index}].description`) ?? "",
    targets
  };
};

export const loadLaunchConfig = async ({
  root = process.cwd(),
  configPath = process.env.LAUNCH_TARGETS_FILE ?? DEFAULT_CONFIG_PATH,
  env = process.env
} = {}) => {
  const resolvedRoot = resolve(root);
  const resolvedConfigPath = isAbsolute(configPath) ? resolve(configPath) : resolve(resolvedRoot, configPath);
  if (!isInside(resolvedRoot, resolvedConfigPath)) {
    throw new Error(`Launch config must stay inside the repository: ${configPath}`);
  }

  const rawText = await readFile(resolvedConfigPath, "utf8");
  const rawConfig = expandValue(JSON.parse(rawText), env);
  const targets = asArray(rawConfig.targets ?? [], "targets").map((target, index) =>
    normalizeTarget(target, index, resolvedRoot)
  );
  const targetIds = new Set();
  for (const target of targets) {
    if (targetIds.has(target.id)) throw new Error(`Duplicate target id: ${target.id}`);
    targetIds.add(target.id);
  }
  const sets = asArray(rawConfig.sets ?? [], "sets").map((set, index) => normalizeSet(set, index, targetIds));
  const setIds = new Set();
  for (const set of sets) {
    if (setIds.has(set.id)) throw new Error(`Duplicate set id: ${set.id}`);
    setIds.add(set.id);
  }

  return {
    root: resolvedRoot,
    configPath: resolvedConfigPath,
    targets,
    sets,
    targetMap: new Map(targets.map((target) => [target.id, target])),
    setMap: new Map(sets.map((set) => [set.id, set]))
  };
};
