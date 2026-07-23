---
name: add-account
description: Add, reconnect, or change permissions for a Google account after this repository's shared OAuth client is configured. Use for connecting another account, re-running OAuth, or changing Gmail and Drive access levels.
---

# Add Account

Use the repository command only after translating the user's choice into explicit permission flags.

## Workflow

1. Ask the user for the email address of the Google account they want to connect if they have not already provided it.
2. Check for `credentials/google-oauth-client.json` without reading its contents. If it is absent, stop and use the repository `setup` skill.
3. Present the recommended access and ask for confirmation:

   - Gmail manage: read and organize mail; manage labels, drafts, settings, and filters; send only with confirmation.
   - Drive manage: view and manage files and folders; sharing changes require confirmation.
   - Permanent Gmail and Drive deletion remains prohibited.

   Ask: `Use the recommended Gmail manage and Drive manage access for <email-address>?`

4. If the user accepts, select `gmail=manage` and `drive=manage`.
5. Do not show the full choice list unless the user declines or asks to customize. Then offer these choices independently:

   - Gmail `none`, `read`, or `manage`. Manage includes labels, settings, and filters.
   - Drive `none`, `read`, or `manage`.

6. Summarize a custom selection and obtain confirmation. Require at least one enabled service.
7. Before starting authorization, explain:

   > I'm going to open Google in your browser and ask you to approve the permissions we selected. Because this is a private setup, Google may say the app is unverified and show the Google Cloud project name chosen during setup. Before continuing, make sure you recognize the displayed name.

8. Run:

```bash
npm run account:add -- <email-address> --gmail=<level> --drive=<level>
```

9. Tell the user to select the same Google account in the browser and complete Google's OAuth consent. Do not claim success until the command exits successfully.
10. Report the account slug and selected access. The command records the non-secret profile at `accounts/<account-slug>/gws/access.json`.

Do not use `--no-login`; it exists for local validation only. Do not pass raw OAuth scope URLs.

## Access levels

- Gmail `read`: view messages and settings.
- Gmail `manage`: read, organize, draft, send, manage labels, and change basic settings and filters.
- Drive `read`: view and download files.
- Drive `manage`: view and manage all Drive files.

Gmail `manage` includes Google's sending capability at the OAuth level. Continue to follow the repository confirmation policy before sending. Permission selection never overrides prohibited permanent-deletion operations.
