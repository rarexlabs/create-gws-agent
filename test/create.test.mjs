import assert from "node:assert/strict";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = resolve("bin/create.mjs");

test("scaffolds the workspace without private state", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const result = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\$setup\b/);

    const generatedPackage = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    assert.equal(generatedPackage.name, "gworkspace-agent");
    assert.equal(generatedPackage.scripts.gws, "node bin/gws-account.mjs");
    assert.equal(generatedPackage.scripts["account:add"], "node bin/add-account.mjs");
    await readFile(join(target, "AGENTS.md"), "utf8");
    await readFile(join(target, ".agents/skills/gmail/SKILL.md"), "utf8");
    await readFile(join(target, ".agents/skills/drive/SKILL.md"), "utf8");
    await readFile(join(target, ".agents/skills/setup/SKILL.md"), "utf8");
    await readFile(join(target, ".agents/skills/add-account/SKILL.md"), "utf8");
    await assert.rejects(readFile(join(target, ".agents/skills/setup-account/SKILL.md"), "utf8"));
    await readFile(join(target, "lib/account-permissions.mjs"), "utf8");
    await readFile(join(target, "lib/gws-command-policy.mjs"), "utf8");
    await assert.rejects(readFile(join(target, "README.md"), "utf8"));
    await assert.rejects(readdir(join(target, "tests")));

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
    const result = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /destination is not empty/);
    assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "keep\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("wrapper distinguishes prohibited and confirmation-required operations", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");
  const fakeGws = join(root, "fake-gws");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "accounts/test/gws"), { recursive: true });
    await writeFile(
      fakeGws,
      "#!/bin/sh\nprintf 'config=%s\\n' \"$GOOGLE_WORKSPACE_CLI_CONFIG_DIR\"\nprintf 'keyring=%s\\n' \"$GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND\"\nprintf '%s\\n' \"$@\"\n",
    );
    await chmod(fakeGws, 0o755);

    const run = (...args) =>
      spawnSync(process.execPath, [join(target, "bin/gws-account.mjs"), "test", ...args], {
        encoding: "utf8",
        env: { ...process.env, GWS_EXECUTABLE: fakeGws },
      });

    const unconfirmedSend = run("gmail", "+send");
    assert.equal(unconfirmedSend.status, 77);
    assert.match(unconfirmedSend.stderr, /requires? explicit confirmation/);

    const confirmedSend = run("--confirm", "gmail", "+send");
    assert.equal(confirmedSend.status, 0, confirmedSend.stderr);
    const expectedConfigDir = await realpath(join(target, "accounts/test/gws"));
    assert.equal(
      confirmedSend.stdout,
      `config=${expectedConfigDir}\nkeyring=keyring\ngmail\n+send\n`,
    );

    const permanentMailDeletion = run(
      "--confirm",
      "gmail",
      "users",
      "messages",
      "delete",
    );
    assert.equal(permanentMailDeletion.status, 77);
    assert.match(permanentMailDeletion.stderr, /Permanent Gmail deletion is prohibited/);

    const unconfirmedPermissionChange = run("drive", "permissions", "create");
    assert.equal(unconfirmedPermissionChange.status, 77);
    assert.match(unconfirmedPermissionChange.stderr, /requires? explicit confirmation/);

    const confirmedPermissionChange = run(
      "--confirm",
      "drive",
      "permissions",
      "create",
    );
    assert.equal(confirmedPermissionChange.status, 0, confirmedPermissionChange.stderr);

    const permanentDriveDeletion = run(
      "--confirm",
      "drive",
      "files",
      "delete",
    );
    assert.equal(permanentDriveDeletion.status, 77);
    assert.match(permanentDriveDeletion.stderr, /Permanent Drive deletion is prohibited/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("account setup creates private account state linked to the shared OAuth client", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");
  const fakeGws = join(root, "fake-gws");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "credentials"));
    await writeFile(join(target, "credentials/google-oauth-client.json"), "{}\n");
    await writeFile(fakeGws, "#!/bin/sh\nprintf '%s\\n' \"$@\"\n");
    await chmod(fakeGws, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        join(target, "bin/add-account.mjs"),
        "Roy.Test+Home@example.com",
        "--gmail=manage",
        "--drive=read",
      ],
      { encoding: "utf8", env: { ...process.env, GWS_EXECUTABLE: fakeGws } },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Account slug: roy-test-home-example-com/);

    const accountDir = join(target, "accounts/roy-test-home-example-com");
    const configDir = join(accountDir, "gws");
    const link = join(configDir, "client_secret.json");
    const accessProfile = JSON.parse(await readFile(join(configDir, "access.json"), "utf8"));
    assert.equal((await lstat(accountDir)).mode & 0o777, 0o700);
    assert.equal((await lstat(configDir)).mode & 0o777, 0o700);
    assert.equal(await readlink(link), "../../../credentials/google-oauth-client.json");
    assert.deepEqual(accessProfile, {
      email: "Roy.Test+Home@example.com",
      gmail: "manage",
      drive: "read",
    });
    assert.match(
      result.stdout,
      /auth\nlogin\n--scopes\nhttps:\/\/www\.googleapis\.com\/auth\/gmail\.modify,https:\/\/www\.googleapis\.com\/auth\/gmail\.labels,https:\/\/www\.googleapis\.com\/auth\/gmail\.settings\.basic,https:\/\/www\.googleapis\.com\/auth\/drive\.readonly/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("account setup requires explicit Gmail and Drive access", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    const result = spawnSync(
      process.execPath,
      [join(target, "bin/add-account.mjs"), "user@example.com", "--no-login"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 64);
    assert.match(result.stderr, /invalid Gmail access: missing/);
    await assert.rejects(lstat(join(target, "accounts/user-example-com")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("failed OAuth does not record an ungranted access profile", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");
  const fakeGws = join(root, "fake-gws");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "credentials"));
    await writeFile(join(target, "credentials/google-oauth-client.json"), "{}\n");
    await writeFile(fakeGws, "#!/bin/sh\nexit 1\n");
    await chmod(fakeGws, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        join(target, "bin/add-account.mjs"),
        "user@example.com",
        "--gmail=manage",
        "--drive=manage",
      ],
      { encoding: "utf8", env: { ...process.env, GWS_EXECUTABLE: fakeGws } },
    );
    assert.equal(result.status, 1);
    await assert.rejects(
      readFile(join(target, "accounts/user-example-com/gws/access.json"), "utf8"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
