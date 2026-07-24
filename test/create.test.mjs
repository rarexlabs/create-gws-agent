import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const cli = resolve("bin/create.mjs");

test("scaffolds a workspace that uses multi-gws without private state", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const result = spawnSync(process.execPath, [cli, target, "--no-install"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.stdout.includes(`Next step:\n  Open ${target} in Codex and run $setup.`),
    );
    assert.doesNotMatch(result.stdout, /\bcd\b/);

    const generatedPackage = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    assert.equal(generatedPackage.name, "gworkspace-agent");
    assert.equal(generatedPackage.packageManager, "npm@11.18.0");
    assert.equal(generatedPackage.engines.node, ">=22.9.0");
    assert.deepEqual(generatedPackage.dependencies, { "multi-gws": "0.0.3" });
    assert.deepEqual(generatedPackage.allowScripts, {
      "@googleworkspace/cli@0.22.5": true,
    });
    assert.equal(generatedPackage.scripts.gws, "mgws run");
    assert.equal(generatedPackage.scripts["account:add"], "mgws account add");
    assert.equal("os" in generatedPackage, false);
    assert.equal(generatedPackage.license, "MIT");

    const agents = await readFile(join(target, "AGENTS.md"), "utf8");
    assert.match(agents, /--calendar=<none\|read\|manage>/);
    for (const [skill, service] of [
      ["gmail", "gmail"],
      ["drive", "drive"],
      ["calendar", "calendar"],
    ]) {
      const contents = await readFile(
        join(target, `.agents/skills/${skill}/SKILL.md`),
        "utf8",
      );
      assert.match(contents, new RegExp(`npm run gws -- <account-slug> ${service}`));
      assert.match(contents, /## Defaults/);
      assert.match(contents, /Add the user's/);
      assert.ok(contents.length < 1_200, `${skill} should remain a minimal starter skill`);
    }
    const setupSkill = await readFile(
      join(target, ".agents/skills/setup/SKILL.md"),
      "utf8",
    );
    assert.match(setupSkill, /Google Calendar API/);
    const addAccountSkill = await readFile(
      join(target, ".agents/skills/add-account/SKILL.md"),
      "utf8",
    );
    assert.match(addAccountSkill, /--calendar=<level>/);
    await assert.rejects(readFile(join(target, "bin/gws-account.mjs"), "utf8"));
    await assert.rejects(readFile(join(target, "lib/gws-command-policy.mjs"), "utf8"));
    const generatedLock = JSON.parse(await readFile(join(target, "package-lock.json"), "utf8"));
    assert.equal(generatedLock.packages["node_modules/multi-gws"].version, "0.0.3");
    assert.equal(
      generatedLock.packages["node_modules/multi-gws"].resolved,
      "https://registry.npmjs.org/multi-gws/-/multi-gws-0.0.3.tgz",
    );

    const gitignore = await readFile(join(target, ".gitignore"), "utf8");
    assert.match(gitignore, /^credentials\/$/m);
    assert.doesNotMatch(gitignore, /exports/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses to overwrite a non-empty destination", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "occupied");

  try {
    await mkdir(target);
    await writeFile(join(target, "keep.txt"), "keep\n");
    const result = spawnSync(process.execPath, [cli, target, "--no-install"], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /destination is not empty/);
    assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "keep\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffold contains no empty implementation directories", async () => {
  const entries = await readdir(resolve("template"));
  assert.equal(entries.includes("bin"), false);
  assert.equal(entries.includes("lib"), false);
});

test("does not initialize git by default", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const result = spawnSync(process.execPath, [cli, target, "--no-install"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);

    const gitResult = spawnSync("git", ["-C", target, "rev-parse", "--git-dir"], {
      encoding: "utf8",
    });
    assert.notEqual(gitResult.status, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("initializes git when requested", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const result = spawnSync(process.execPath, [cli, target, "--no-install", "--git"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);

    const gitResult = spawnSync("git", ["-C", target, "branch", "--show-current"], {
      encoding: "utf8",
    });
    assert.equal(gitResult.status, 0, gitResult.stderr);
    assert.equal(gitResult.stdout.trim(), "main");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
