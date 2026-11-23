// All design gallery pieces: the ones in src/content/designs.json plus those uploaded in CRM → Gallery.
// Both come out in the same shape, so the gallery page and the home page "Recent designs" strip treat
// them alike. CRM pieces come first in their own order; then the file's pieces.
import { getCollection, type CollectionEntry } from 'astro:content';
import { designCategories } from '../content.config';
import { showPlaceholders } from '../data/services';
import { getCrmGallery, mediaUrl } from './crm';

// thumb: a small copy (about 640 px) for grids, so phones don't download the full picture until it's opened.
export type Design = { id: string; data: CollectionEntry<'designs'>['data']; thumb?: string };
const thumbKey = (key: string) => (/\.webp$/.test(key) ? key.replace(/\.webp$/, '.sm.webp') : null);

export async function getDesigns(): Promise<Design[]> {
  const fromFile = (await getCollection('designs'))
    .filter((d) => showPlaceholders || !d.data.placeholder)
    .sort((a, b) => a.data.order - b.data.order)
    .map((d) => ({ id: d.id, data: d.data }));
  const fromCrm: Design[] = (await getCrmGallery())
    .filter((g) => (designCategories as readonly string[]).includes(g.category))
    .map((g, i) => ({
      id: `crm-${g.id.slice(0, 8)}`,
      thumb: thumbKey(g.image_key) ? mediaUrl(thumbKey(g.image_key)!) : undefined,
      data: {
        order: i,
        title: g.title,
        category: g.category as Design['data']['category'],
        year: g.year,
        client: g.client ?? undefined,
        note: g.note ?? undefined,
        alt: g.alt || g.title,
        image: { src: mediaUrl(g.image_key), width: g.image_w, height: g.image_h },
        video: g.video_key ? mediaUrl(g.video_key) : undefined,
        platform: (g.platform ?? undefined) as Design['data']['platform'],
        postUrl: g.post_url ?? undefined,
        tags: [],
        featured: !!g.featured,
        placeholder: false,
      },
    }));
  return [...fromCrm, ...fromFile];
}
