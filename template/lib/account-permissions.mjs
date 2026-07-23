const GMAIL_SCOPES = Object.freeze({
  none: [],
  read: ["https://www.googleapis.com/auth/gmail.readonly"],
  manage: [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.settings.basic",
  ],
});

const DRIVE_SCOPES = Object.freeze({
  none: [],
  read: ["https://www.googleapis.com/auth/drive.readonly"],
  manage: ["https://www.googleapis.com/auth/drive"],
});

export const ACCESS_LEVELS = Object.freeze(["none", "read", "manage"]);

export function resolveAccountScopes({ gmail, drive }) {
  if (!ACCESS_LEVELS.includes(gmail)) {
    throw new RangeError(`invalid Gmail access: ${gmail ?? "missing"}`);
  }
  if (!ACCESS_LEVELS.includes(drive)) {
    throw new RangeError(`invalid Drive access: ${drive ?? "missing"}`);
  }
  if (gmail === "none" && drive === "none") {
    throw new RangeError("at least one of Gmail or Drive must be enabled");
  }

  return [...GMAIL_SCOPES[gmail], ...DRIVE_SCOPES[drive]];
}
