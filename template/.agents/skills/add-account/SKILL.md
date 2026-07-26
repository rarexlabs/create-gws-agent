---
name: add-account
description: Add, reconnect, or change permissions for a Google account after this repository's shared OAuth client is configured. Use for connecting another account, re-running OAuth, or changing Gmail, Drive, and Calendar access levels.
---

# Add Account

Use the repository command only after translating the user's choice into explicit permission flags.

## Workflow

1. Ask the user for the email address of the Google account they want to connect if they have not already provided it.
2. Check for `credentials/google-oauth-client.json` without reading its contents. If it is absent, stop and use the repository `setup` skill.
3. Present the recommended access and ask for confirmation:

   - Gmail manage: read and organize mail; manage labels, drafts, settings, and filters; send only with confirmation.
   - Drive manage: view and manage files and folders; sharing changes require confirmation.
   - Calendar manage: view calendars and availability; manage events and sharing; inviting others, existing-event changes, and sharing changes require confirmation.
   - Permanent Gmail and Drive deletion and permanently clearing or deleting calendars remain prohibited.

   Ask: `Use the recommended Gmail manage, Drive manage, and Calendar manage access for <email-address>?`

4. If the user accepts, select `gmail=manage`, `drive=manage`, and `calendar=manage`.
5. Do not show the full choice list unless the user declines or asks to customize. Then offer these choices independently:

   - Gmail `none`, `read`, or `manage`. Manage includes labels, settings, and filters.
   - Drive `none`, `read`, or `manage`.
   - Calendar `none`, `read`, or `manage`.

6. Summarize a custom selection and obtain confirmation. Require at least one enabled service.
7. Before starting authorization, explain:

   > I'm going to start Google authorization for the permissions we selected. I'll give you a Google authorization link to open. Because this is a private setup, Google may say the app is unverified and show the Google Cloud project name chosen during setup. Before continuing, make sure you recognize the displayed name.

8. Run:

```bash
npm run account:add -- <email-address> --gmail=<level> --drive=<level> --calendar=<level>
```

   Use the plain `npm` command by default. OAuth authorization requires live, unbuffered command output. If the active environment requires RTK, bypass its output filtering for this interactive command:

```bash
rtk proxy npm run account:add -- <email-address> --gmail=<level> --drive=<level> --calendar=<level>
```

   Do not use the RTK form where RTK is unavailable.
9. Watch only until the live output prints the account slug and Google OAuth URL. Immediately surface the OAuth URL to the user as a clickable link, tell them to select the same Google account and complete Google's consent flow, and leave the authorization command running in the background. Then end the turn immediately and ask the user to reply `done` after Google confirms authorization. Do not poll the background command and do not claim success yet.
10. When the user replies:

    - Do not start a second authorization command.
    - Check the existing background command once. If it is still running, say that Google has not completed the callback yet and end the turn without polling.
    - If it failed, report the useful error and offer to retry.
    - If it completed successfully, verify with:

      ```bash
      npm run gws -- <account-slug> auth status
      ```

      Require `credentials_readable` and `token_valid` to be `true`, and confirm that the returned email matches the requested account. If the background command is no longer inspectable, use this status check as the source of truth.
11. After successful verification, report the account slug and selected access. The command records the non-secret profile at `accounts/<account-slug>/gws/access.json`.

Do not use `--no-login`; it exists for local validation only. Do not pass raw OAuth scope URLs.

## Access levels

- Gmail `read`: view messages and settings.
- Gmail `manage`: read, organize, draft, send, manage labels, and change basic settings and filters.
- Drive `read`: view and download files.
- Drive `manage`: view and manage all Drive files.
- Calendar `read`: view calendars, events, and availability.
- Calendar `manage`: view and manage calendars, events, and sharing rules.

Gmail `manage` includes Google's sending capability at the OAuth level. Continue to follow the repository confirmation policy before sending. Permission selection never overrides prohibited permanent-deletion operations.
