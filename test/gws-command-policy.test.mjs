import assert from "node:assert/strict";
import test from "node:test";
import { classifyGwsCommand } from "../template/lib/gws-command-policy.mjs";

const cases = [
  [["gmail", "users", "messages", "list"], "allow"],
  [["gmail", "+send"], "confirm"],
  [["gmail", "users", "drafts", "send"], "confirm"],
  [["gmail", "users", "messages", "delete"], "prohibit"],
  [["gmail", "users", "drafts", "delete"], "prohibit"],
  [["drive", "files", "list"], "allow"],
  [["drive", "permissions", "create"], "confirm"],
  [["drive", "files", "delete"], "prohibit"],
  [["drive:v3", "files", "delete"], "prohibit"],
  [["--api-version", "v3", "drive", "files", "delete"], "prohibit"],
  [["--api-version=v3", "drive", "files", "delete"], "prohibit"],
  [["drive", "--api-version", "v3", "files", "delete"], "prohibit"],
  [["drive", "files", "--api-version", "v3", "delete"], "prohibit"],
  [["drive", "files", "emptyTrash"], "prohibit"],
];

for (const [args, expected] of cases) {
  test(`${args.join(" ")} is ${expected}`, () => {
    assert.equal(classifyGwsCommand(args).action, expected);
  });
}
