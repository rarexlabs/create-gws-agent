#!/usr/bin/env node

import { cp, mkdir, readdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const usage = `Usage: create-gws-agent [directory] [options]

Options:
  --no-install  Skip npm install
  --no-git      Skip git initialization
  --help        Show this help`;

function fail(message) {
  console.error(`create-gws-agent: ${message}`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) return { ok: false, error: result.error };
  return { ok: result.status === 0, status: result.status };
}

let destination;
let install = true;
let initializeGit = true;

for (const argument of process.argv.slice(2)) {
  if (argument === "--help" || argument === "-h") {
    console.log(usage);
    process.exit(0);
  }
  if (argument === "--no-install") {
    install = false;
    continue;
  }
  if (argument === "--no-git") {
    initializeGit = false;
    continue;
  }
  if (argument.startsWith("-")) fail(`unknown option: ${argument}`);
  if (destination) fail("provide only one destination directory");
  destination = argument;
}

const target = resolve(process.cwd(), destination || "gworkspace-agent");

try {
  const entries = await readdir(target);
  if (entries.length > 0) fail(`destination is not empty: ${target}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const template = fileURLToPath(new URL("../template", import.meta.url));
await mkdir(target, { recursive: true });
await cp(template, target, { recursive: true, force: false, errorOnExist: true });
await rename(resolve(target, "gitignore.template"), resolve(target, ".gitignore"));

console.log(`Created Google Workspace agent at ${target}`);

if (install) {
  console.log("Installing npm dependencies...");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = run(npmCommand, ["install", "--no-audit", "--no-fund"], target);
  if (!result.ok) fail("npm install failed; the generated files were kept");
}

if (initializeGit) {
  const existingRepository = spawnSync("git", ["-C", target, "rev-parse", "--show-toplevel"], {
    stdio: "ignore",
  });
  if (existingRepository.status !== 0) {
    const result = run("git", ["init", "-b", "main"], target);
    if (!result.ok) console.warn("Warning: Git initialization was skipped.");
  }
}

const relativeTarget = destination || "gworkspace-agent";
console.log(`\nNext steps:\n  cd ${relativeTarget}\n  # Open this workspace in your agent and ask:\n  # Use $setup to prepare this Google Workspace agent.`);
