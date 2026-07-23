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
const GWS_VALUE_FLAGS = new Set([
  "--api-version",
  "--format",
  "--json",
  "--output",
  "--page-delay",
  "--page-limit",
  "--params",
  "--upload",
  "--upload-content-type",
]);

const allow = Object.freeze({ action: "allow" });

function positionalArguments(args) {
  const positional = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }

    const [flag] = argument.split("=", 1);
    if (GWS_VALUE_FLAGS.has(flag) && !argument.includes("=")) index += 1;
  }

  return positional;
}

export function classifyGwsCommand(args) {
  const commandArgs = positionalArguments(args);
  const [serviceWithVersion, resource, collection, method] = commandArgs;
  const service = serviceWithVersion?.split(":", 1)[0];

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
