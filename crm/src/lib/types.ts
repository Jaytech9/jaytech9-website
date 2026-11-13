export type Id = string;

export interface Client {
  id: Id; name: string; organisation?: string | null; phone?: string | null; email?: string | null;
  service?: string | null; source?: string | null; marketing_opt_in: boolean; notes?: string | null; created_at: string;
}
export type BookingStatus = 'new' | 'confirmed' | 'done' | 'cancelled' | 'no_show';
export interface Booking {
  id: Id; client_id?: Id | null; name: string; organisation?: string | null; email?: string | null; phone?: string | null;
  service?: string | null; details?: string | null; budget?: string | null; timeline?: string | null; method?: string | null;
  call_at?: string | null; source?: string | null; status: BookingStatus; created_at: string;
}
export type EnquiryStatus = 'new' | 'replied' | 'closed';
export interface Enquiry {
  id: Id; client_id?: Id | null; name: string; email?: string | null; phone?: string | null; organisation?: string | null;
  needs?: string | null; message?: string | null; status: EnquiryStatus; created_at: string;
}
export type Stage = 'new' | 'call' | 'quote' | 'progress' | 'won' | 'lost';
export interface Deal {
  id: Id; client_id?: Id | null; title: string; service?: string | null; value: number; stage: Stage;
  closed_at?: string | null; created_at: string; updated_at: string;
}
export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'delivered' | 'on_hold';
export interface Project {
  id: Id; client_id?: Id | null; title: string; service?: string | null; status: ProjectStatus; progress: number;
  value: number; start_date?: string | null; due_date?: string | null; show_on_website: boolean;
  website_summary?: string | null; website_outcome?: string | null; live_url?: string | null; created_at: string; updated_at: string;
}
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export interface Review {
  id: Id; name: string; organisation?: string | null; role?: string | null; rating?: number | null; message: string;
  consent: boolean; product?: string | null; status: ReviewStatus; created_at: string;
}
export interface Section { key: string; label: string; location?: string | null; enabled: boolean; sort: number; updated_at: string }
export type Channel = 'sms' | 'whatsapp' | 'email';
export type AudienceSpec = { type: 'opted_in' } | { type: 'client'; client_id: string } | { type: 'service'; service: string };
export interface Campaign {
  id: Id; channel: Channel; kind: 'promotion' | 'update'; audience: string; audience_spec: AudienceSpec; subject?: string | null; message: string; recipients: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed'; scheduled_at?: string | null; sent_at?: string | null;
  error?: string | null; created_at: string;
}
export interface Activity { id: Id; entity: string; entity_id?: Id | null; action: string; detail?: string | null; created_at: string }
export interface Staff { id: Id; name: string; role: 'admin' | 'staff'; created_at: string }

export interface Tables {
  clients: Client; bookings: Booking; enquiries: Enquiry; deals: Deal; projects: Project; reviews: Review;
  site_sections: Section; campaigns: Campaign; activity: Activity; staff: Staff;
}
export type TableName = keyof Tables;

export const SERVICES = [
  'Websites and web applications',
  'Business systems',
  'Data dashboards and analysis',
  'AgriTech and sustainability',
  'Brand and print design',
  'Domains, hosting and care',
] as const;

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'new', label: 'New request' },
  { id: 'call', label: 'Call booked' },
  { id: 'quote', label: 'Quote sent' },
  { id: 'progress', label: 'In progress' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

export const PROJECT_STATUS: { id: ProjectStatus; label: string }[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'review', label: 'Client review' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'on_hold', label: 'On hold' },
];

export const SERVICE_SHORT: Record<string, string> = {
  'Websites and web applications': 'Web', 'Business systems': 'Systems', 'Data dashboards and analysis': 'Data',
  'AgriTech and sustainability': 'AgriTech', 'Brand and print design': 'Design', 'Domains, hosting and care': 'Care',
};
