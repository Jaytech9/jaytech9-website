// Reads what the JayTech9 CRM controls, once per build: section switches, approved reviews and
// projects marked "Show on the website". Without CRM keys (or if the CRM is down) the site builds
// with everything switched on and no CRM content, exactly as it did before the CRM existed.
const URL_ = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const KEY = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

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

async function get<T>(path: string): Promise<T[]> {
  if (!URL_ || !KEY) return [];
  try {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T[];
  } catch (e) {
    console.warn(`[crm] could not read ${path.split('?')[0]}: ${(e as Error).message}. Using defaults.`);
    return [];
  }
}

let sectionsP: Promise<Record<SectionKey, boolean>> | undefined;
export function getSections() {
  sectionsP ??= get<{ key: SectionKey; enabled: boolean }>('site_sections?select=key,enabled').then((rows) => {
    const on = new Proxy({} as Record<SectionKey, boolean>, { get: (t, k: string) => (k in t ? t[k as SectionKey] : true) });
    rows.forEach((r) => (on[r.key] = r.enabled));
    return on;
  });
  return sectionsP;
}

let reviewsP: Promise<CrmReview[]> | undefined;
export const getReviews = () =>
  (reviewsP ??= get<CrmReview>('website_reviews?select=id,name,organisation,role,rating,message,product&order=created_at.desc'));

let projectsP: Promise<CrmProject[]> | undefined;
export const getProjects = () =>
  (projectsP ??= get<CrmProject>('website_projects?select=id,title,service,summary,outcome,live_url&order=updated_at.desc'));

// CRM services are stored by title; the site uses short ids.
export const serviceIdFromTitle: Record<string, string> = {
  'Websites and web applications': 'websites',
  'Business systems': 'systems',
  'Data dashboards and analysis': 'data',
  'AgriTech and sustainability': 'agritech',
  'Brand and print design': 'design',
  'Domains, hosting and care': 'care',
};
