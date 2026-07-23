#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAccountScopes } from "../lib/account-permissions.mjs";

const EX_USAGE = 64;
const EX_NOINPUT = 66;
const EX_UNAVAILABLE = 69;
const USAGE =
  "usage: npm run account:add -- <email-address> --gmail=<none|read|manage> --drive=<none|read|manage> [--no-login]";

function fail(status, message) {
  console.error(`add-account: ${message}`);
  process.exit(status);
}

function usage(message) {
  if (message) console.error(`add-account: ${message}`);
  fail(EX_USAGE, USAGE);
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

let email;
let gmail;
let drive;
let login = true;

for (const argument of process.argv.slice(2)) {
  if (argument === "--no-login") {
    login = false;
    continue;
  }
  if (argument.startsWith("--gmail=")) {
    if (gmail !== undefined) usage("provide --gmail only once");
    gmail = argument.slice("--gmail=".length);
    continue;
  }
  if (argument.startsWith("--drive=")) {
    if (drive !== undefined) usage("provide --drive only once");
    drive = argument.slice("--drive=".length);
    continue;
  }
  if (argument.startsWith("-")) usage(`unknown option: ${argument}`);
  if (email !== undefined) usage("provide only one email address");
  email = argument;
}

if (!email) usage("provide an email address");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  fail(EX_USAGE, `invalid email address: ${email}`);
}

let scopes;
try {
  scopes = resolveAccountScopes({ gmail, drive });
} catch (error) {
  if (error instanceof RangeError) usage(error.message);
  throw error;
}

const slug = email
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
if (!slug) fail(EX_USAGE, `could not derive an account slug from: ${email}`);

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const oauthClient = join(root, "credentials", "google-oauth-client.json");
const accountDir = join(root, "accounts", slug);
const configDir = join(accountDir, "gws");
const clientLink = join(configDir, "client_secret.json");
const accessProfile = join(configDir, "access.json");

function saveAccessProfile() {
  writeFileSync(accessProfile, `${JSON.stringify({ email, gmail, drive }, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(accessProfile, 0o600);
}

if (!isFile(oauthClient)) fail(EX_NOINPUT, `OAuth client not found: ${oauthClient}`);

mkdirSync(configDir, { recursive: true, mode: 0o700 });
chmodSync(accountDir, 0o700);
chmodSync(configDir, 0o700);

if (!pathExists(clientLink)) {
  symlinkSync("../../../credentials/google-oauth-client.json", clientLink);
}

console.log(`Account slug: ${slug}`);
console.log(`Gmail access: ${gmail}`);
console.log(`Drive access: ${drive}`);
if (!login) {
  saveAccessProfile();
  console.log("Skipped OAuth login (--no-login).");
  process.exit(0);
}

const wrapper = join(root, "bin", "gws-account.mjs");
const result = spawnSync(
  process.execPath,
  [wrapper, slug, "auth", "login", "--scopes", scopes.join(",")],
  { cwd: root, stdio: "inherit" },
);

if (result.error) fail(EX_UNAVAILABLE, `could not start OAuth login: ${result.error.message}`);
if (result.status !== null) {
  if (result.status === 0) saveAccessProfile();
  process.exit(result.status);
}
fail(1, `OAuth login terminated by signal ${result.signal ?? "unknown"}`);
