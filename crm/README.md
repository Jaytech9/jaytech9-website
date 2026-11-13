# JayTech9 CRM

The private workspace for running JayTech9: bookings, enquiries, clients, pipeline, projects,
messages (SMS, WhatsApp, email), website section switches and review approval.

It lives at **crm.jaytech9.com** as its own Netlify site, built from the `crm/` folder of this repo.
The public website and the CRM share one database (Supabase).

## Try it now (demo mode)

```bash
cd crm
npm install
npm run dev
```

Open the address it prints and press **Sign in**. With no Supabase keys it runs on sample data
that lives only in that browser tab. Every date is worked out from today's date, so it always looks current.

## Go live (about 30 minutes, one time)

1. **Supabase** (free): create a project at supabase.com, region closest to Ghana (e.g. Frankfurt or London).
   - SQL Editor → New query → paste `supabase/schema.sql` → Run.
   - Authentication → Users → **Invite user** with your work email. Accept the invite and set a password.
   - SQL Editor, replacing the email: `insert into staff (id, name, role) select id, 'Jones Kwamehene', 'admin' from auth.users where email = 'you@jaytech9.com';`
   - Authentication → URL Configuration → Site URL `https://crm.jaytech9.com`.
   - Project Settings → API: copy the **Project URL**, the **anon** key and the **service_role** key.
     The service_role key is a master key: only ever paste it into Netlify settings, never into code.

2. **Netlify: the website** (existing site) → Site configuration → Environment variables:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Build & deploy → Build hooks → **Add build hook** named "CRM" → copy its URL.
   - Redeploy. From now on bookings, contact messages and reviews also land in the CRM.

3. **Netlify: the CRM** → Add new site → Import from the same GitHub repo:
   - Base directory `crm` (the `crm/netlify.toml` file sets the build command, output folder and functions).
   - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY`, `WEBSITE_BUILD_HOOK` (the hook URL from step 2).
   - Domain management → add `crm.jaytech9.com` (Cloudflare DNS: CNAME `crm` → the Netlify site address).

4. **SMS** (when ready): open an Arkesel account, request the sender ID `JayTech9` (takes a few days),
   then add `ARKESEL_API_KEY` and `SMS_SENDER_ID=JayTech9` to the CRM site on Netlify.

5. **Email** (when ready): open a Resend account, verify `jaytech9.com`, then add `RESEND_API_KEY`
   and `EMAIL_FROM="JayTech9 <hello@jaytech9.com>"` to the CRM site on Netlify.

6. **Google sign-in** (optional): Supabase → Authentication → Providers → Google, then set
   `VITE_GOOGLE_SIGNIN=true` on the CRM site. Only people on the staff list can get in either way.

## How the pieces connect

| What | How |
| --- | --- |
| Website forms → CRM | `netlify/functions/submission-created.mjs` in the website copies each verified booking, contact message and review into Supabase. Netlify Forms still keeps its own copy. |
| CRM switches → website | The website reads `site_sections`, `website_reviews` and `website_projects` when it builds. Changing them in the CRM calls the build hook, so the site is live again about a minute later. |
| Messages | `netlify/functions/send-message.ts` sends SMS (Arkesel) and email (Resend) from the server. Promotions only ever reach clients who opted in, checked on the server. Scheduled messages go out from `send-scheduled.ts`, every 15 minutes. WhatsApp opens each chat with the message ready. |
| Security | Row-level security: only staff can read or change CRM data. Visitors can read only the section switches and the two public views, which leave out money and contact details. |
