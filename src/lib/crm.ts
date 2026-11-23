// What the JayTech9 CRM controls on the website, read once per build:
//   - section switches (CRM → Website sections)
//   - approved reviews (CRM → Reviews)
//   - projects marked "Show on the website" (CRM → Projects)
// It comes from the live site's /api/site-data (functions/api/site-data.ts), which reads the database.
// If that can't be reached (first deploy, local preview offline), every section stays ON and the site
// simply shows no CRM content. Nothing breaks.
//
// To use a different address (e.g. a preview site), set SITE_DATA_URL in the build settings.
const SITE_DATA_URL =
  import.meta.env.SITE_DATA_URL ?? process.env.SITE_DATA_URL ?? 'https://jaytech9.com/api/site-data';

export type SectionKey =
  | 'help_widget'
  | 'testimonials'
  | 'accept_reviews'
  | 'recent_designs'
  | 'service_examples'
  | 'urgent_booking'
  | 'blog'
  | 'careers'
  | 'donate';

export interface CrmReview {
  id: string;
  name: string;
  organisation: string | null;
  role: string | null;
  rating: number | null;
  message: string;
  product: string | null;
}
export interface CrmProject {
  id: string;
  title: string;
  service: string | null;
  summary: string | null;
  outcome: string | null;
  live_url: string | null;
}
export interface CrmStats {
  delivered: number;
  clients: number;
  rating: number | null;
  ratings: number;
  donations: { total: number; donors: number };
}
interface SiteData {
  sections: { key: SectionKey; enabled: boolean }[];
  reviews: CrmReview[];
  projects: CrmProject[];
  stats?: CrmStats | null;
}

let dataP: Promise<SiteData> | undefined;
function siteData() {
  dataP ??= (async () => {
    try {
      const res = await fetch(SITE_DATA_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error(`${res.status}`);
      return (await res.json()) as SiteData;
    } catch (e) {
      console.warn(`[crm] site data not available (${(e as Error).message}); building with defaults.`);
      return { sections: [], reviews: [], projects: [] };
    }
  })();
  return dataP;
}

// Every switch is ON unless the CRM says otherwise.
export async function getSections() {
  const { sections } = await siteData();
  const off = new Set(sections.filter((s) => !s.enabled).map((s) => s.key));
  return new Proxy({} as Record<SectionKey, boolean>, { get: (_t, k: string) => !off.has(k as SectionKey) });
}

export const getReviews = async () => (await siteData()).reviews;
export const getProjects = async () => (await siteData()).projects;
export const getStats = async () => (await siteData()).stats ?? null;

// The CRM stores services by their full title; the site uses short ids.
export const serviceIdFromTitle: Record<string, string> = {
  'Websites and web applications': 'websites',
  'Business systems': 'systems',
  'Data dashboards and analysis': 'data',
  'AgriTech and sustainability': 'agritech',
  'Brand and print design': 'design',
  'Video and motion': 'video',
  'Domains, hosting and care': 'care',
};
