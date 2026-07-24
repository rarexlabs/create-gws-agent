---
name: calendar
description: Use the repository-local Google Workspace CLI to inspect schedules and availability and to manage Google Calendar events, invitations, recurring meetings, calendars, and sharing. Use for requests involving agendas, appointments, meetings, free/busy time, attendees, invitations, or Calendar access.
---

# Google Calendar

Run Calendar commands through the account wrapper:

```bash
npm run gws -- <account-slug> calendar <arguments...>
```

## Defaults

- Confirm the account when it is unclear, then read the calendar time zone and relevant event details.
- Check availability before creating or rescheduling an event unless the user says not to.
- Distinguish one occurrence from an entire recurring series.
- Follow the preview and confirmation rules in `AGENTS.md` for changes, then verify the resulting event.

Add the user's scheduling conventions and calendar workflows here.
