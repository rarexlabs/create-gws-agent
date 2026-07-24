---
name: drive
description: Use the repository-local Google Workspace CLI to find, read, create, edit, move, rename, upload, download, trash, and manage Google Drive files and Google Docs. Use for requests involving Drive, Docs, Sheets, Slides, folders, sharing, or permissions.
---

# Google Drive

Run Drive and document commands through the account wrapper:

```bash
npm run gws -- <account-slug> drive <arguments...>
npm run gws -- <account-slug> docs <arguments...>
```

## Defaults

- Confirm the account when it is unclear, then inspect file metadata or document structure before acting.
- Identify items by name and location rather than opaque IDs.
- Follow the preview and confirmation rules in `AGENTS.md` for changes, then verify the resulting content, metadata, or permissions.
- For multiline Docs writes, dry-run a two-line payload and verify that line breaks are structural rather than literal `\n` text.

Add the user's file organization and document workflows here.
