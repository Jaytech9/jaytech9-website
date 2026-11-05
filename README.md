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
| Installable app + offline support | `public/manifest.webmanifest`, `public/sw.js` |

To add a page, copy an existing one in `src/pages/` and change its `title`, `description` and content. The file path becomes the web address (`src/pages/pricing.astro` → `/pricing/`).

## Pages

Home, Services, Work (7 case studies), About, Blog, Careers, Donate, Contact (+ thank-you), Offline, 404.

## Notes

- **Contact form** uses Netlify Forms (`data-netlify="true"`). It only receives messages when the site is hosted on Netlify. If hosting moves elsewhere (e.g. Cloudflare Pages), switch the form to a service such as Formspree or Web3Forms.
- **Offline / app:** after a deploy that changes content, bump `VERSION` in `public/sw.js` so returning visitors get the update straight away.
- **History:** this source was recovered on 5 Nov 2026 from the October 2026 build (the original source files were lost). `tools/convert.py` is the one-off script that did the recovery; it is kept for reference only.
