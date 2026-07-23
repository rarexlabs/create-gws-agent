---
name: gmail
description: Use the repository-local Google Workspace CLI to search, read, triage, label, archive, and trash Gmail messages. Use for requests involving email, inbox review, Gmail labels, attachments, filters, or mailbox cleanup.
---

# Gmail

Run Gmail commands through the account wrapper:

```bash
npm run gws -- <account-slug> gmail <arguments...>
```

## Workflow

1. Confirm the account when the request does not make it clear.
2. Inspect messages before proposing or performing mutations.
3. Summarize private content unless the user requests the full body.
4. Follow the repository action-authorization policy in `AGENTS.md`.
5. For existing email, identify messages by sender, subject, and date. For outgoing email, show the recipients, subject, and final message body.
6. For bulk work, preview the human-readable scope and number of messages. Retain exact message IDs privately for accurate execution.
7. Send, reply, or forward only after explicit confirmation of the final preview, then pass `--confirm` immediately after the account slug.
8. Verify the resulting labels or mailbox state.

Never permanently delete messages, threads, or drafts. Interpret “delete” as move to Trash. Labels, archive, and Trash are reversible and may be performed when the user explicitly requests the exact change.
