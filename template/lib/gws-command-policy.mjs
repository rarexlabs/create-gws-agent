const GMAIL_CONFIRM_ALIASES = new Set(["+send", "+reply", "+reply-all", "+forward"]);
const GMAIL_PROHIBITED_METHODS = new Set([
  "messages:delete",
  "messages:batchDelete",
  "threads:delete",
  "drafts:delete",
]);
const GMAIL_CONFIRM_METHODS = new Set(["drafts:send", "messages:send"]);
const DRIVE_PROHIBITED_METHODS = new Set([
  "files:delete",
  "files:emptyTrash",
  "revisions:delete",
]);
const DRIVE_CONFIRM_METHODS = new Set([
  "permissions:create",
  "permissions:update",
  "permissions:delete",
]);

const allow = Object.freeze({ action: "allow" });

export function classifyGwsCommand(args) {
  const [service, resource, collection, method] = args;

  if (service === "gmail") {
    if (GMAIL_CONFIRM_ALIASES.has(resource)) {
      return { action: "confirm", reason: "Sending email requires explicit confirmation" };
    }

    if (resource === "users") {
      const operation = `${collection ?? ""}:${method ?? ""}`;
      if (GMAIL_PROHIBITED_METHODS.has(operation)) {
        return { action: "prohibit", reason: "Permanent Gmail deletion is prohibited" };
      }
      if (GMAIL_CONFIRM_METHODS.has(operation)) {
        return { action: "confirm", reason: "Sending email requires explicit confirmation" };
      }
    }
  }

  if (service === "drive") {
    const operation = `${resource ?? ""}:${collection ?? ""}`;
    if (DRIVE_PROHIBITED_METHODS.has(operation)) {
      return { action: "prohibit", reason: "Permanent Drive deletion is prohibited" };
    }
    if (DRIVE_CONFIRM_METHODS.has(operation)) {
      return { action: "confirm", reason: "Drive permission changes require explicit confirmation" };
    }
  }

  return allow;
}
