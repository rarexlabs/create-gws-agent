# create-gws-agent

Scaffold a minimal npm workspace for account-scoped Gmail, Google Drive, and Google Calendar agent workflows.

```bash
npm create gws-agent@latest my-workspace
```

Open the generated workspace in Codex or another compatible agent, then ask:

```text
Use $setup to prepare this Google Workspace agent.
```

The generated workspace uses [`multi-gws`](https://www.npmjs.com/package/multi-gws), through its `mgws` command, to isolate accounts and apply safety rules while forwarding Google Workspace CLI commands.

The setup skill checks dependencies, guides Google OAuth client creation when needed, and connects the first Google account with the selected Gmail, Drive, and Calendar permissions.

## Requirements

- Node.js 22.9 or newer
- npm 11 (the generated project pins npm 11.18.0)

## Options

```text
--no-install  Skip npm install
--no-git      Skip git initialization
--help        Show usage
```

## License

MIT
