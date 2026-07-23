import assert from "node:assert/strict";
import test from "node:test";
import { resolveAccountScopes } from "../template/lib/account-permissions.mjs";

test("recommended access includes Gmail filters and full Drive management", () => {
  assert.deepEqual(resolveAccountScopes({ gmail: "manage", drive: "manage" }), [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.settings.basic",
    "https://www.googleapis.com/auth/drive",
  ]);
});

test("read access uses read-only Gmail and Drive scopes", () => {
  assert.deepEqual(resolveAccountScopes({ gmail: "read", drive: "read" }), [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ]);
});

test("either service can be disabled", () => {
  assert.deepEqual(resolveAccountScopes({ gmail: "none", drive: "manage" }), [
    "https://www.googleapis.com/auth/drive",
  ]);
});

test("both services cannot be disabled", () => {
  assert.throws(
    () => resolveAccountScopes({ gmail: "none", drive: "none" }),
    /at least one of Gmail or Drive must be enabled/,
  );
});
