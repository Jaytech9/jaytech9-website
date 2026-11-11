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

// The six services. Products point at one, so each service can show its examples and each
// product page can link back to the service it came from.
export const serviceIds = ['websites', 'systems', 'data', 'agritech', 'design', 'care'] as const;
const service = z.enum(serviceIds);

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
    service, // which service this work belongs to
    gallery: z.array(z.object({ src: z.string(), alt: z.string() })).default([]), // real screenshots for the product page
    outcome: z.string().optional(), // one-line result, e.g. "Donor reports in minutes instead of an afternoon"
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

// Placeholders (placeholder: true) only show in the local preview, labelled, so you can see where
// real content goes. The live site never shows them. Set placeholder to false once the entry is real.
const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    order: z.number(),
    quote: z.string(),
    name: z.string(),
    role: z.string(), // e.g. "Director"
    organisation: z.string(),
    product: z.string().optional(), // a products id, to show it on that product page too
    photo: z.string().optional(), // path in public/uploads/ or https URL
    placeholder: z.boolean().default(false),
  }),
});

const clients = defineCollection({
  loader: file('src/content/clients.json'),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    logo: z.string().optional(), // path in public/uploads/ or https URL; the name shows until a logo is added
    url: z.string().url().optional(),
    placeholder: z.boolean().default(false),
  }),
});

// Design gallery (/design/). Each piece needs one image. Add `back` for a front/back flip
// (business cards, two-sided flyers) or `spin` (24–36 photos taken as the item turns) for a 360° view.
export const designCategories = [
  'logos',
  'flyers',
  'banners',
  'social-media',
  'church-events',
  'business-cards',
  'fashion-beauty',
  'packaging-merch',
] as const;
const picture = z.object({ src: z.string(), width: z.number(), height: z.number() });
const designs = defineCollection({
  loader: file('src/content/designs.json'),
  schema: z.object({
    order: z.number(), // lower shows first
    title: z.string(),
    category: z.enum(designCategories),
    year: z.number(),
    client: z.string().optional(), // only with the client's permission
    note: z.string().optional(), // one or two sentences about the brief
    alt: z.string(), // describes the image for people using screen readers
    image: picture,
    back: picture.optional(),
    spin: z.array(z.string()).optional(),
    // Short video: an .mp4 in public/uploads/ (or https URL). `image` is used as its cover.
    video: z.string().optional(),
    platform: z.enum(['tiktok', 'instagram', 'youtube', 'facebook']).optional(), // where it was posted
    postUrl: z.string().url().optional(), // link to the post, shown as "Watch on TikTok" etc.
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false), // shows in "Recent designs" on the home page
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { products, banners, testimonials, clients, designs };
