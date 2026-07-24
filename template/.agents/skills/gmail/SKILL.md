---
name: gmail
description: Use the repository-local Google Workspace CLI to search, read, triage, label, archive, and trash Gmail messages. Use for requests involving email, inbox review, Gmail labels, attachments, filters, or mailbox cleanup.
---

# Gmail

Run Gmail commands through the account wrapper:

```bash
npm run gws -- <account-slug> gmail <arguments...>
```

## Defaults

- Confirm the account when it is unclear, then inspect relevant messages before acting.
- Summarize private content unless the user asks for the full body. Identify messages by sender, subject, and date.
- Follow the preview and confirmation rules in `AGENTS.md` for changes, then verify the resulting mailbox state.

Add the user's mailbox organization, labels, and triage preferences here.
