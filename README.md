# JayTech9 website

The company website for **JayTech9** (Jay Tech 9 Enterprise), built with [Astro](https://astro.build) for **jaytech9.com**.

## Run it on your computer

```bash
npm install        # first time only
npm run dev        # open http://localhost:4321 — changes show instantly
npm run build      # makes the finished site in dist/
npm run preview    # check the built site before going live
```

## Where things are

| What you want to change | File |
| --- | --- |
| Phone, email, WhatsApp, social links, menu | `src/data/site.ts` |
| A page's words | `src/pages/…` (e.g. `src/pages/about.astro`, `src/pages/work/buildsmart.astro`) |
| Header / footer | `src/components/Header.astro`, `src/components/Footer.astro` |
| Colours, fonts, buttons, cards | `src/styles/global.css` (colours are the `--` tokens at the top) |
| Page title, SEO, social sharing, PWA tags | `src/layouts/Base.astro` |
| Logo in the header | `src/assets/logo.png` |
| Icons, favicon, share image | `public/` |
| Help button and assistant answers | `src/data/help.ts` (answers), `src/components/HelpWidget.astro` (menu), `src/help/` (behaviour and look) |
| Installable app + offline support | `public/manifest.webmanifest`, `public/sw.js` |

To add a page, copy an existing one in `src/pages/` and change its `title`, `description` and content. The file path becomes the web address (`src/pages/pricing.astro` → `/pricing/`).

## Pages

Home, Services, Work (7 case studies), About, Blog, Careers, Donate, Contact (+ thank-you), Offline, 404.

## Content (cards and banners) — ready for the CRM

Every card and banner is **data**, not page code:

| What | File | Shown on |
| --- | --- | --- |
| Product / project cards | `src/content/products.json` | Products page (all), Home (`"featured": true`) |
| Banner cards | `src/content/banners.json` | Home, Services and Products headers (`"page"` field) |

- **Add, edit, reorder or hide** an entry by editing the JSON (`order` sets position, `"active": false` hides a banner).
- **Use a real image** instead of the drawn illustration: put the file in `public/uploads/` and add
  `"image": { "src": "/uploads/name.webp", "alt": "What it shows" }`. Drawn illustrations are listed in `src/lib/visuals.ts`.
- The allowed fields are defined in `src/content.config.ts`. The build stops with a clear error if an entry is wrong.

**When the CRM is built:** keep the same fields, and in `src/content.config.ts` replace each
`file('src/content/....json')` loader with one that fetches the entries from the CRM's API. No page code changes.
Rebuild (or trigger a deploy hook from the CRM) to publish changes.

## Notes

- **Contact form** uses Netlify Forms (`data-netlify="true"`). It only receives messages when the site is hosted on Netlify. If hosting moves elsewhere (e.g. Cloudflare Pages), switch the form to a service such as Formspree or Web3Forms.
- **Teaching the help assistant:** questions it can't answer appear in Netlify under Forms → `help-questions`, with emails and phone numbers removed. Add the good ones to `src/data/help.ts` as a question and answer, then deploy. Only add facts that are true and on the website. The form shares Netlify's submission allowance with the contact form.
- **Offline / app:** after a deploy that changes content, bump `VERSION` in `public/sw.js` so returning visitors get the update straight away.
- **History:** this source was recovered on 5 Nov 2026 from the October 2026 build (the original source files were lost). `tools/convert.py` is the one-off script that did the recovery; it is kept for reference only.
