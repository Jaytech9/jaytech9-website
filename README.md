# JayTech9

Everything for **jaytech9.com** in one private repository:

| Folder | What it is | Lives at |
| --- | --- | --- |
| `/` (`src/`, `public/`) | The public website, built with [Astro](https://astro.build) | jaytech9.com |
| `functions/` | The website's small server parts: saving form posts, sharing CRM content with the site | jaytech9.com/api/… |
| `crm/` | The private CRM (React app + its API in `crm/functions/`) | crm.jaytech9.com |
| `database/` | The one database both use (Cloudflare D1). `schema.sql` + later changes in `migrations/` | Cloudflare D1 |

Hosting is Cloudflare (Pages, D1, Access), all on free plans. **To go live, follow [DEPLOY.md](DEPLOY.md).**

## Run it on your computer

```bash
npm install          # first time only
npm run dev          # website at http://localhost:4321, changes show instantly
npm run build        # makes the finished site in dist/

cd crm
npm install          # first time only
npm run dev          # CRM with sample data (demo mode), nothing is saved
```

Testing the website and CRM together with a real (local) database is explained in DEPLOY.md, "Test everything on your computer".

## Where things are (website)

| What you want to change | File |
| --- | --- |
| Phone, email, WhatsApp, social links, menu, booking times | `src/data/site.ts` |
| A page's words | `src/pages/…` (e.g. `src/pages/about.astro`) |
| Header / footer / phone tab bar | `src/components/Header.astro`, `Footer.astro`, `BottomNav.astro` |
| Colours, fonts, buttons, cards | `src/styles/global.css` (colours are the `--` tokens at the top) |
| Page title, SEO, social sharing, PWA tags | `src/layouts/Base.astro` |
| Help button and assistant answers | `src/data/help.ts` (answers), `src/components/HelpWidget.astro`, `src/help/` |
| What the CRM can switch on/off on the site | `src/lib/crm.ts` + the `site_sections` rows in `database/schema.sql` |
| What happens when a form is sent | `functions/_lib/forms.ts` |
| Installable app + offline support | `public/manifest.webmanifest`, `public/sw.js` |

To add a page, copy one in `src/pages/` and change its `title`, `description` and content. The file path becomes the web address (`src/pages/pricing.astro` → `/pricing/`).

## Where things are (CRM)

| What | File |
| --- | --- |
| Screens (Dashboard, Bookings, Projects, Messages…) | `crm/src/pages/` |
| Menu, top bar | `crm/src/components/Layout.tsx` |
| Colours, sizes, card styles | `crm/src/index.css` (tokens at the top) |
| Services list, pipeline stages, project statuses | `crm/src/lib/types.ts` |
| Sample data for demo mode | `crm/src/lib/demo.ts` |
| API (reading and saving data) | `crm/functions/api/` |
| Which columns the CRM may change | `crm/functions/_lib/tables.ts` |
| SMS and email sending | `crm/functions/_lib/messaging.ts` |
| Scheduled messages (every 15 min) | `crm/workers/scheduler/` |

## Content still kept in files

Product cards, banners, the design gallery and client logos are still JSON files in `src/content/`
(fields defined in `src/content.config.ts`). Editing them from the CRM is the next step.

## Notes

- **Forms** (booking, contact, review) post to their thank-you page. `functions/_middleware.ts` saves them to the
  database and the CRM shows them. Only the paths in `public/_routes.json` run server code; every other page is plain static.
- **Teaching the help assistant:** questions it can't answer appear in CRM → Enquiries. Add the good ones to
  `src/data/help.ts`, then tick them off.
- **Offline / app:** after a deploy that changes content, bump `VERSION` in `public/sw.js`.
- **History:** this source was recovered on 5 Nov 2026 from the October 2026 build. `tools/convert.py` did the recovery; kept for reference only.
