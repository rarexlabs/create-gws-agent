---
name: calendar
description: Use the repository-local Google Workspace CLI to inspect schedules and availability and to manage Google Calendar events, invitations, recurring meetings, calendars, and sharing. Use for requests involving agendas, appointments, meetings, free/busy time, attendees, invitations, or Calendar access.
---

# Google Calendar

Run Calendar commands through the account wrapper:

```bash
npm run gws -- <account-slug> calendar <arguments...>
```

## Workflow

1. Confirm the account when the request does not make it clear.
2. Read the calendar time zone and relevant event details before interpreting or changing dates and times.
3. Check availability or conflicts when creating or rescheduling an event unless the user explicitly says not to.
4. Follow the repository action-authorization policy in `AGENTS.md`.
5. Identify events by title, calendar, date, time, time zone, attendees, and recurrence scope rather than by opaque resource ID.
6. For bulk work, preview the human-readable scope and number of events. Retain exact event and calendar IDs privately for accurate execution.
7. Create, change, move, or cancel events and change Calendar sharing only after explicit confirmation of the final preview, then pass `--confirm` immediately after the account slug.
8. Verify the resulting event details, attendee list, recurrence, and calendar.

Never permanently clear or delete a calendar.

Reading schedules, calendars, events, and free/busy information is allowed when requested. For recurring events, always distinguish one occurrence from the entire series before asking for confirmation.
