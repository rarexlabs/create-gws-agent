#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyGwsCommand } from "../lib/gws-command-policy.mjs";

const EX_USAGE = 64;
const EX_NOINPUT = 66;
const EX_UNAVAILABLE = 69;
const EX_NOPERM = 77;

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

const result = spawnSync(gwsExecutable, args, {
  cwd: root,
  env: {
    ...process.env,
    GOOGLE_WORKSPACE_CLI_CONFIG_DIR: configDir,
    GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND: "keyring",
  },
  stdio: "inherit",
});

if (result.error) fail(EX_UNAVAILABLE, `could not run gws: ${result.error.message}`);
if (result.status !== null) process.exit(result.status);
fail(1, `gws terminated by signal ${result.signal ?? "unknown"}`);
