#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  constants,
  lstatSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyGwsCommand } from "../lib/gws-command-policy.mjs";

const EX_USAGE = 64;
const EX_NOINPUT = 66;
const EX_UNAVAILABLE = 69;
const EX_NOPERM = 77;
const FILE_PATH_FLAGS = new Set(["--output", "--upload"]);

function fail(status, message) {
  console.error(`gws-account: ${message}`);
  process.exit(status);
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureRuntimeDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const directory = lstatSync(path);
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    fail(EX_NOPERM, `unsafe runtime directory: ${path}`);
  }
  chmodSync(path, 0o700);

  const dotenv = join(path, ".env");
  try {
    writeFileSync(dotenv, "", { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  const dotenvFile = lstatSync(dotenv);
  if (!dotenvFile.isFile() || dotenvFile.isSymbolicLink() || dotenvFile.size !== 0) {
    fail(EX_NOPERM, `unsafe runtime environment file: ${dotenv}`);
  }
  chmodSync(dotenv, 0o600);
}

function resolveFileArguments(args, root) {
  const resolvedArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (FILE_PATH_FLAGS.has(argument) && index + 1 < args.length) {
      const value = args[index + 1];
      resolvedArgs.push(argument, value === "-" || isAbsolute(value) ? value : resolve(root, value));
      index += 1;
      continue;
    }

    const inlineFlag = [...FILE_PATH_FLAGS].find((flag) => argument.startsWith(`${flag}=`));
    if (inlineFlag) {
      const value = argument.slice(inlineFlag.length + 1);
      resolvedArgs.push(
        `${inlineFlag}=${value === "-" || isAbsolute(value) ? value : resolve(root, value)}`,
      );
      continue;
    }

    resolvedArgs.push(argument);
  }

  return resolvedArgs;
}

const args = process.argv.slice(2);
if (args.length < 2) {
  fail(EX_USAGE, "usage: npm run gws -- <account-slug> [--confirm] <gws arguments...>");
}

const account = args.shift();
const confirmed = args[0] === "--confirm";
if (confirmed) args.shift();
if (args.length === 0) fail(EX_USAGE, "missing gws arguments");

if (!/^[A-Za-z0-9._-]+$/.test(account) || account.startsWith(".") || account.includes("..")) {
  fail(EX_USAGE, `invalid account slug: ${account}`);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configDir = join(root, "accounts", account, "gws");
const runtimeDir = join(configDir, ".runtime");
const gwsExecutable = process.env.GWS_EXECUTABLE || join(root, "node_modules", ".bin", "gws");

if (!isDirectory(configDir)) {
  console.error(`gws-account: unknown account: ${account}`);
  console.error("ask your agent to use $add-account to connect it");
  process.exit(EX_NOINPUT);
}

if (!isExecutable(gwsExecutable)) {
  fail(EX_UNAVAILABLE, "gws is not installed; run: npm install");
}

const policy = classifyGwsCommand(args);
if (policy.action === "prohibit") fail(EX_NOPERM, policy.reason);
if (policy.action === "confirm" && !confirmed) {
  console.error(`gws-account: ${policy.reason}`);
  console.error("after confirmation, rerun with --confirm after the account slug");
  process.exit(EX_NOPERM);
}

ensureRuntimeDirectory(runtimeDir);
const gwsArgs = resolveFileArguments(args, root);
const gwsEnv = { ...process.env };
delete gwsEnv.GOOGLE_WORKSPACE_CLI_CLIENT_ID;
delete gwsEnv.GOOGLE_WORKSPACE_CLI_CLIENT_SECRET;
delete gwsEnv.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE;

const result = spawnSync(gwsExecutable, gwsArgs, {
  cwd: runtimeDir,
  env: {
    ...gwsEnv,
    GOOGLE_APPLICATION_CREDENTIALS: join(runtimeDir, ".env", "no-adc"),
    GOOGLE_WORKSPACE_CLI_CONFIG_DIR: configDir,
    GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND: "keyring",
    GOOGLE_WORKSPACE_CLI_TOKEN: "",
  },
  stdio: "inherit",
});

if (result.error) fail(EX_UNAVAILABLE, `could not run gws: ${result.error.message}`);
if (result.status !== null) process.exit(result.status);
fail(1, `gws terminated by signal ${result.signal ?? "unknown"}`);
