# create-gws-agent

Scaffold a minimal npm workspace for account-scoped Gmail and Google Drive agent workflows.

```bash
npm create gws-agent@latest my-workspace
```

Open the generated workspace in Codex or another compatible agent, then ask:

```text
Use $setup to prepare this Google Workspace agent.
```

The setup skill checks dependencies, guides Google OAuth client creation when needed, and connects the first Google account.

## Requirements

- macOS, because the generated agent stores Google account tokens in Keychain
- Node.js 18.17 or newer
- npm 10 (the generated project pins npm 10.9.4)

## Options

```text
--no-install  Skip npm install
--no-git      Skip git initialization
--help        Show usage
```
