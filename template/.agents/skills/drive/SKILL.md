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

## Workflow

1. Confirm the account when the request does not make it clear.
2. Inspect file metadata or document structure before changing it.
3. Follow the repository action-authorization policy in `AGENTS.md`.
4. Identify Drive items by file or folder name and location, not by opaque resource ID.
5. For bulk work, preview the human-readable scope and number of items. Retain exact resource IDs privately for accurate execution.
6. Grant public or external access, change permissions, or transfer ownership only after explicit confirmation of the final preview, then pass `--confirm` immediately after the account slug.
7. Verify the resulting metadata, content, and permissions.

Never permanently delete Drive files, empty Trash, or delete revisions.

Uploads, edits, moves, renames, and moves to Trash may be performed when the user explicitly requests the exact change.

For multiline Google Docs writes, first dry-run a two-line payload. After writing, read the document back and verify that line breaks are structural rather than literal `\\n` text.
