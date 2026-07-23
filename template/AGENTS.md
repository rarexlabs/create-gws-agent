# Google Workspace Agent

This repository provides account-scoped access to Gmail, Google Drive, and Google Calendar through `mgws`, a multi-account safety wrapper for the Google Workspace CLI.

## Commands

Use npm only. Run all Google Workspace commands through the account wrapper:

```bash
npm run gws -- <account-slug> <gws arguments...>
```

Add and authorize an account with:

```bash
npm run account:add -- <email-address> --gmail=<none|read|manage> --drive=<none|read|manage> --calendar=<none|read|manage>
```

`mgws` selects `accounts/<account-slug>/gws` through `GOOGLE_WORKSPACE_CLI_CONFIG_DIR` and uses the operating system's secure credential storage with the CLI's encrypted file fallback.

## Credentials

Keep the shared Google Desktop OAuth client at:

```text
credentials/google-oauth-client.json
```

Account credentials and token caches live under `accounts/<account-slug>/gws/`. All credential paths are private and ignored by Git.
The selected non-secret access profile is recorded as `accounts/<account-slug>/gws/access.json`.

## Routing

- Use the repository `setup` skill for initial workspace setup, missing OAuth credentials, or when no account is connected.
- Use the repository `add-account` skill for adding accounts, re-authentication, or changing account permissions after initial setup.
- Use the repository `gmail` skill for Gmail and inbox work.
- Use the repository `drive` skill for Drive, Docs, Sheets, Slides, sharing, and permission work.
- Use the repository `calendar` skill for Calendar events, schedules, availability, invitations, and calendar sharing.
- A request may use more than one service skill.

## Communication

Assume the user has no technical background unless they demonstrate otherwise. Use simple terms, briefly explain unfamiliar concepts, and guide them one step at a time. Adapt to their demonstrated familiarity.

## Safety

- Reading, listing, downloading, and summarizing are allowed when requested.
- Perform reversible changes only when the user explicitly requests the exact change. Ask first when a change is inferred or merely proposed.
- For bulk changes, preview the human-readable scope and number of affected items.
- Do not expose full private message or document contents unless requested; summarize instead.

### Confirmation-required actions

Always show a human-readable preview and obtain explicit confirmation immediately before an irreversible or externally consequential action, including:

- sending, replying to, or forwarding email;
- granting public or external Drive access;
- changing Drive permissions;
- transferring Drive ownership;
- creating, changing, moving, or cancelling Calendar events; or
- changing Calendar sharing rules.

The preview must identify:

- the Google account being used and the action being performed;
- for existing email, the sender, subject, and date;
- for outgoing email, the recipients, subject, and final message body;
- for Drive items, the file or folder name and its location;
- for Calendar events, the event title, calendar, date, time, time zone, attendees, and whether the change affects one occurrence or a recurring series; and
- the number of affected items for bulk actions.

Do not use opaque resource IDs as the primary description. Retain them privately when needed for accurate execution and verification.

Confirmation applies only to the exact account, action, content, and targets shown. Do not treat silence, general approval, or approval for a different scope as confirmation. Ask again if anything material changes. After confirmation, pass `--confirm` to the account wrapper and verify the resulting state.

### Prohibited actions

- Never permanently delete Gmail messages, threads, or drafts. Interpret deleting email as moving it to Trash.
- Never permanently delete Drive files, empty Drive Trash, or delete Drive revisions.
- Never permanently clear or delete a calendar.
- Confirmation does not override these prohibitions.
