# Going live on Cloudflare

About an hour, once. Everything here is on Cloudflare's free plans. You only pay for SMS (per message) and,
if you ever outgrow the free allowance, Cloudflare's Workers Paid plan.

You need: the Cloudflare account that holds jaytech9.com, a **private** GitHub repository with this code,
and a Terminal on your Mac in this folder.

---

## 1. Push the code to GitHub (private)

In GitHub, open the repository → Settings → General → **Danger zone** → make sure it says **Private**. Then:

```bash
git push
```

## 2. Create the database

```bash
npx wrangler login                       # opens the browser once to connect to your Cloudflare account
npx wrangler d1 create jaytech9          # prints a database_id
```

Copy the `database_id` into **all three** files (replace `PASTE-YOUR-D1-DATABASE-ID-HERE`):

- `wrangler.toml` (website)
- `crm/wrangler.toml` (CRM)
- `crm/workers/scheduler/wrangler.toml` (scheduled messages)

Create the tables:

```bash
npx wrangler d1 execute jaytech9 --remote --file=database/schema.sql
```

Commit and push (`git commit -am "Add database id" && git push`).

## 3. The website (jaytech9.com)

Cloudflare dashboard → **Workers & Pages** → Create → **Pages** → Connect to Git → choose the repository.

| Setting | Value |
| --- | --- |
| Project name | `jaytech9-website` |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

Save and deploy. Then:

- **Custom domains** → add `jaytech9.com` and `www.jaytech9.com`. Because the domain is already on Cloudflare, it connects itself.
- **Settings → Builds → Deploy hooks** → Add, name `CRM`, branch `main` → **copy the URL** (needed in step 5).
- Test: send the contact form on the live site. It should arrive in the CRM once step 4 is done.
- When the new site is confirmed working, delete the old site in Netlify.

## 4. The CRM (crm.jaytech9.com) and its sign-in

**a. Create the Pages project**: Workers & Pages → Create → Pages → Connect to Git → same repository.

| Setting | Value |
| --- | --- |
| Project name | `jaytech9-crm` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `crm` |

**b. Turn on Cloudflare Access (the sign-in)**: open **Zero Trust** from the dashboard.

1. Choose a team name, e.g. `jaytech9` → your team domain becomes `https://jaytech9.cloudflareaccess.com`. Pick the **Free** plan.
2. Settings → Authentication → Login methods: keep **One-time PIN** (a code by email). Add Google later if you like.
3. Access → Applications → **Add an application** → Self-hosted.
   - Name `JayTech9 CRM`, session duration **24 hours**.
   - Public hostnames: `crm.jaytech9.com`, and also `jaytech9-crm.pages.dev` and `*.jaytech9-crm.pages.dev`
     (the preview addresses must be protected too).
   - Policy: name `Staff`, action **Allow**, include **Emails** → your email (add each staff member here later).
   - Save, then open the application and copy the **Application Audience (AUD) Tag**.
4. Settings → Custom pages → Login page: logo `https://jaytech9.com/logo-512.png`, colour `#0068a1`, title `JayTech9 CRM`.

**c. Tell the CRM about Access**: in `crm/wrangler.toml` fill in:

```toml
ACCESS_TEAM_DOMAIN = "https://jaytech9.cloudflareaccess.com"
ACCESS_AUD = "the AUD tag you copied"
ADMIN_EMAILS = "your@email"
```

Commit and push. Cloudflare rebuilds the CRM.

**d. Custom domain**: jaytech9-crm → Custom domains → add `crm.jaytech9.com`.

## 5. Let the CRM update the website

jaytech9-crm → Settings → **Variables and Secrets** → Add → type **Secret**:
`WEBSITE_DEPLOY_HOOK` = the URL from step 3. Redeploy the CRM once (Deployments → ⋯ → Retry).

## 6. Scheduled messages

```bash
cd crm
npm run deploy:scheduler
```

## 7. SMS and email (when you are ready)

- **SMS:** open an account at arkesel.com, request the sender ID `JayTech9` (takes a few days), get the API key.
- **Email:** open an account at resend.com, verify `jaytech9.com` (they show the DNS records to add in Cloudflare), get the API key.

Add them as **Secrets** in two places: the `jaytech9-crm` Pages project (Settings → Variables and Secrets)
and the scheduler worker:

```bash
cd crm
npx wrangler secret put ARKESEL_API_KEY --config workers/scheduler/wrangler.toml
npx wrangler secret put RESEND_API_KEY  --config workers/scheduler/wrangler.toml
```

## 8. First sign-in

Open **crm.jaytech9.com** → enter your email → type the code you receive → you're in as admin.
In **Settings**, change your name, check the **Setup checklist** is all green, and add your team.

To add a staff member: add their email to the Access policy (step 4b.3) **and** in CRM → Settings → Team.
When someone leaves, remove them from both.

---

## Test everything on your computer (optional)

Runs the website, the CRM and a private copy of the database on your Mac. Nothing touches the live data.

```bash
npm run db:local                 # once: creates the local database
npm run dev:full                 # website with forms working, http://localhost:8789

# in a second Terminal window:
cd crm
cp .dev.vars.example .dev.vars   # once: put your email in it
npm run dev:api                  # CRM on real local data, http://localhost:8788 (no sign-in needed locally)
```

Send a booking on localhost:8789/book/ and watch it appear in the CRM.

## Backups

D1 keeps a point-in-time history you can restore from (Cloudflare → D1 → jaytech9 → Time Travel).
For your own copy, once a month:

```bash
npx wrangler d1 export jaytech9 --remote --output=backup-$(date +%Y-%m).sql
```

Keep backups out of GitHub; they contain client details.
