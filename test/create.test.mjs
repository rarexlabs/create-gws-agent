import assert from "node:assert/strict";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
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
    assert.equal(generatedPackage.packageManager, "npm@10.9.4");
    assert.equal(generatedPackage.engines.node, ">=22");
    assert.equal("os" in generatedPackage, false);
    assert.equal(generatedPackage.license, "MIT");
    assert.equal(generatedPackage.scripts.gws, "node bin/gws-account.mjs");
    assert.equal(generatedPackage.scripts["account:add"], "node bin/add-account.mjs");
    await readFile(join(target, "AGENTS.md"), "utf8");
    await readFile(join(target, "LICENSE"), "utf8");
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

test("wrapper launches the installed CLI through its cross-platform Node entry point", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "accounts/test/gws"), { recursive: true });
    const cliPackage = join(target, "node_modules/@googleworkspace/cli");
    await mkdir(cliPackage, { recursive: true });
    await writeFile(
      join(cliPackage, "run.js"),
      "console.log(process.argv.slice(2).join('\\n'));\n",
    );

    const env = { ...process.env };
    delete env.GWS_EXECUTABLE;
    const result = spawnSync(
      process.execPath,
      [join(target, "bin/gws-account.mjs"), "test", "drive", "files", "list"],
      { encoding: "utf8", env },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "drive\nfiles\nlist\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("wrapper ignores inherited credentials for a different account", async () => {
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
      join(target, ".env"),
      "GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/tmp/dotenv-wrong-account.json\n",
    );
    await writeFile(
      fakeGws,
      "#!/bin/sh\nif [ -f .env ] && [ -z \"${GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE+x}\" ]; then . ./.env; fi\nprintf 'cwd=%s\\n' \"$PWD\"\nprintf 'token=%s\\n' \"$GOOGLE_WORKSPACE_CLI_TOKEN\"\nprintf 'credentials_set=%s\\n' \"${GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE+x}\"\nprintf 'client_id_set=%s\\n' \"${GOOGLE_WORKSPACE_CLI_CLIENT_ID+x}\"\nprintf 'client_secret_set=%s\\n' \"${GOOGLE_WORKSPACE_CLI_CLIENT_SECRET+x}\"\nprintf 'adc=%s\\n' \"$GOOGLE_APPLICATION_CREDENTIALS\"\nprintf '%s\\n' \"$@\"\n",
    );
    await chmod(fakeGws, 0o755);

    const result = spawnSync(
      process.execPath,
      [
        join(target, "bin/gws-account.mjs"),
        "test",
        "drive",
        "files",
        "list",
        "--upload",
        "relative.txt",
        "--output=download.bin",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          GWS_EXECUTABLE: fakeGws,
          GOOGLE_WORKSPACE_CLI_CLIENT_ID: "wrong-client-id",
          GOOGLE_WORKSPACE_CLI_CLIENT_SECRET: "wrong-client-secret",
          GOOGLE_WORKSPACE_CLI_TOKEN: "wrong-account-token",
          GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: "/tmp/wrong-account.json",
          GOOGLE_APPLICATION_CREDENTIALS: "/tmp/wrong-adc.json",
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    const canonicalTarget = await realpath(target);
    const configDir = join(canonicalTarget, "accounts/test/gws");
    assert.equal(
      result.stdout,
      [
        `cwd=${join(configDir, ".runtime")}`,
        "token=",
        "credentials_set=",
        "client_id_set=",
        "client_secret_set=",
        `adc=${join(configDir, ".runtime", ".env", "no-adc")}`,
        "drive",
        "files",
        "list",
        "--upload",
        join(canonicalTarget, "relative.txt"),
        `--output=${join(canonicalTarget, "download.bin")}`,
        "",
      ].join("\n"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("account setup creates private account state with a copy of the shared OAuth client", async () => {
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
    const slug = result.stdout.match(/Account slug: (roy-test-home-example-com-\S+)/)?.[1];
    assert.ok(slug);

    const accountDir = join(target, "accounts", slug);
    const configDir = join(accountDir, "gws");
    const accountOauthClient = join(configDir, "client_secret.json");
    const accessProfile = JSON.parse(await readFile(join(configDir, "access.json"), "utf8"));
    assert.equal((await lstat(join(target, "credentials"))).mode & 0o777, 0o700);
    assert.equal(
      (await lstat(join(target, "credentials/google-oauth-client.json"))).mode & 0o777,
      0o600,
    );
    assert.equal((await lstat(accountDir)).mode & 0o777, 0o700);
    assert.equal((await lstat(configDir)).mode & 0o777, 0o700);
    assert.equal((await lstat(accountOauthClient)).isSymbolicLink(), false);
    assert.equal((await lstat(accountOauthClient)).mode & 0o777, 0o600);
    assert.equal(await readFile(accountOauthClient, "utf8"), "{}\n");
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

test("account setup rejects a symbolic link as the OAuth client", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");
  const externalClient = join(root, "external-oauth-client.json");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "credentials"));
    await writeFile(externalClient, "{}\n", { mode: 0o644 });
    await symlink(externalClient, join(target, "credentials/google-oauth-client.json"));

    const result = spawnSync(
      process.execPath,
      [
        join(target, "bin/add-account.mjs"),
        "person@example.com",
        "--gmail=read",
        "--drive=none",
        "--no-login",
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 66);
    assert.match(result.stderr, /must be a regular file, not a symlink/);
    assert.equal((await lstat(externalClient)).mode & 0o777, 0o644);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("distinct email addresses use distinct account directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "create-gws-agent-"));
  const target = join(root, "my-workspace");

  try {
    const scaffold = spawnSync(process.execPath, [cli, target, "--no-install", "--no-git"], {
      encoding: "utf8",
    });
    assert.equal(scaffold.status, 0, scaffold.stderr);

    await mkdir(join(target, "credentials"));
    await writeFile(join(target, "credentials/google-oauth-client.json"), "{}\n");

    const add = (email) =>
      spawnSync(
        process.execPath,
        [
          join(target, "bin/add-account.mjs"),
          email,
          "--gmail=read",
          "--drive=none",
          "--no-login",
        ],
        { encoding: "utf8" },
      );

    const plusAddress = add("a+b@example.com");
    const dashAddress = add("a-b@example.com");
    assert.equal(plusAddress.status, 0, plusAddress.stderr);
    assert.equal(dashAddress.status, 0, dashAddress.stderr);

    const plusSlug = plusAddress.stdout.match(/Account slug: (\S+)/)?.[1];
    const dashSlug = dashAddress.stdout.match(/Account slug: (\S+)/)?.[1];
    assert.ok(plusSlug);
    assert.ok(dashSlug);
    assert.notEqual(plusSlug, dashSlug);

    const plusProfile = JSON.parse(
      await readFile(join(target, "accounts", plusSlug, "gws", "access.json"), "utf8"),
    );
    const dashProfile = JSON.parse(
      await readFile(join(target, "accounts", dashSlug, "gws", "access.json"), "utf8"),
    );
    assert.equal(plusProfile.email, "a+b@example.com");
    assert.equal(dashProfile.email, "a-b@example.com");
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
