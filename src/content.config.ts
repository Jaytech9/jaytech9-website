// Content model for the site. Every card and banner on the site is an entry in one of these collections.
//
// Today the entries live in JSON files in src/content/. When the JayTech9 CRM is ready, swap each
// `file(...)` loader for one that fetches from the CRM's API (same fields), and every page updates
// without any page code changing. The schema below is the contract the CRM must follow.
import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const tone = z.enum(['ink', 'ink-soft', 'blue', 'blue-dark', 'teal', 'green', 'forest']);

// Optional real image (screenshot or photo). When set it replaces the drawn illustration.
// Put files in public/uploads/ (or use a full https URL from the CRM).
const image = z
  .object({
    src: z.string(),
    alt: z.string(),
  })
  .optional();

const products = defineCollection({
  loader: file('src/content/products.json'),
  schema: z.object({
    order: z.number(), // position on the Products page, lowest first
    title: z.string(),
    client: z.string(), // line above the title, e.g. "Our own product" or the client's name
    sector: z.string(), // small label on the card top, e.g. "Finance"
    status: z.enum(['Live', 'Delivered', 'In progress', 'In development']),
    summary: z.string(), // one or two sentences
    stack: z.array(z.string()).default([]), // "Built with" chips
    icon: z.string(), // an icon name from src/components/Icon.astro
    tone, // card-top colour
    visual: z.string().optional(), // drawn illustration key, see src/lib/visuals.ts
    image,
    liveUrl: z.string().url().optional(), // adds a "Visit live site" button
    featured: z.boolean().default(false), // also show on the home page
    wide: z.boolean().default(false), // full-width card on the Products page
  }),
});

const banners = defineCollection({
  loader: file('src/content/banners.json'),
  schema: z.object({
    page: z.enum(['home', 'services', 'products']), // where the banner appears
    order: z.number(),
    tone,
    tag: z.string().optional(), // green label on home/services banners
    icon: z.string().default('arrow'),
    eyebrow: z.string().optional(), // small label above the title (products header)
    before: z.string(), // title text before the highlighted words
    highlight: z.string().default(''), // highlighted words (shown in green)
    after: z.string().default(''),
    sub: z.string(),
    cta: z.string(),
    href: z.string(),
    external: z.boolean().default(false), // opens in a new tab
    visual: z.string().optional(),
    image,
    active: z.boolean().default(true), // switch a banner off without deleting it
  }),
});

export const collections = { products, banners };
