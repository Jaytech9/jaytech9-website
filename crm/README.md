# JayTech9 CRM

The private workspace for running JayTech9: bookings, enquiries, clients, pipeline, projects,
messages (SMS, WhatsApp, email), website switches and review approval.

- **Live:** crm.jaytech9.com, behind Cloudflare Access. Setup: [../DEPLOY.md](../DEPLOY.md).
- **Try it:** `npm install && npm run dev` → sample data, press Sign in. Nothing is saved.

## How it fits together

```
crm/
├── src/                    the app people see (React)
│   ├── pages/              one file per screen
│   ├── components/         shared pieces: cards, buttons, charts, menu
│   └── lib/                data (db.ts, store.ts), dates and money (format.ts), lists (types.ts)
├── functions/              the API on Cloudflare (runs on the server)
│   ├── api/                one file per address, e.g. api/t/[table]/index.ts → /api/t/bookings
│   └── _lib/               sign-in check, allowed columns, SMS/email sending
├── workers/scheduler/      sends scheduled messages every 15 minutes
└── wrangler.toml           Cloudflare settings (database link, Access settings)
```

Every screen reads and saves through `src/lib/store.ts` → `src/lib/db.ts` → `/api/...` → the D1 database.
All dates come from the real clock and show in Ghana time (`src/lib/format.ts`).

## Common changes

| Change | Where |
| --- | --- |
| Add a service | `src/lib/types.ts` (`SERVICES`) and the website's `src/data/services.ts` |
| Rename a pipeline stage | `src/lib/types.ts` (`STAGES`) |
| Add a field to clients or projects | new file in `../database/migrations/`, then `functions/_lib/tables.ts` and `src/lib/types.ts` |
| Change SMS provider | `functions/_lib/messaging.ts` → `sendSms()` |
| Add a website on/off switch | a row in `site_sections` (`../database/schema.sql`) and read it in the website's `src/lib/crm.ts` |
