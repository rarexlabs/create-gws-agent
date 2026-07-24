# Google Workspace Agent

Use this repository to work with Gmail, Google Drive, and Google Calendar through
the account-scoped `mgws` wrapper.

## Commands

Run Google Workspace commands through:

```bash
npm run gws -- <account-slug> <gws arguments...>
```

Add and authorize an account with:

```bash
npm run account:add -- <email-address> --gmail=<none|read|manage> --drive=<none|read|manage> --calendar=<none|read|manage>
```

Use the repository skills:

- `$setup` for first-time setup
- `$add-account` to connect an account or change its access
- `$gmail`, `$drive`, and `$calendar` for service-specific work

## Defaults

- Confirm which account to use when it is unclear.
- Reading, searching, downloading, and summarizing are allowed when requested.
- Before sending messages, changing sharing or permissions, inviting attendees, or
  changing or cancelling events, show a concise preview and ask for confirmation.
  Include the account, human-readable targets, relevant content, and the item count
  for bulk changes. Pass `--confirm` only after approval.
- Move items to Trash instead of permanently deleting Gmail, Drive, or Calendar
  data. Never empty Trash or permanently clear a calendar.
- Keep credentials and account data out of Git. Do not reveal private content
  unless the user asks for it.

## Customize

Add the user's preferred accounts, contacts, calendars, Drive locations, writing
style, scheduling conventions, recurring workflows, and any stricter approval
rules here. Do not store secrets in this file.
