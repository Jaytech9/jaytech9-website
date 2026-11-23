// The tables and columns the CRM may read and write. Anything not listed here is refused,
// which keeps the database safe from bad input. ADD NEW COLUMNS HERE after a database change.
export const TABLES = {
  clients: ['name', 'organisation', 'phone', 'email', 'service', 'source', 'marketing_opt_in', 'notes', 'created_at'],
  bookings: ['client_id', 'name', 'organisation', 'email', 'phone', 'service', 'details', 'budget', 'timeline', 'method', 'call_at', 'source', 'status', 'created_at'],
  enquiries: ['client_id', 'name', 'email', 'phone', 'organisation', 'needs', 'message', 'status', 'created_at'],
  deals: ['client_id', 'title', 'service', 'value', 'stage', 'closed_at', 'created_at', 'updated_at'],
  projects: ['client_id', 'title', 'service', 'status', 'progress', 'value', 'start_date', 'due_date', 'show_on_website', 'website_summary', 'website_outcome', 'live_url', 'created_at', 'updated_at'],
  reviews: ['name', 'organisation', 'role', 'rating', 'message', 'consent', 'product', 'status', 'created_at'],
  site_sections: ['label', 'location', 'enabled', 'sort', 'updated_at'],
  campaigns: ['channel', 'kind', 'audience', 'audience_spec', 'subject', 'message', 'recipients', 'status', 'scheduled_at', 'sent_at', 'error', 'created_by', 'created_at'],
  activity: ['entity', 'entity_id', 'action', 'detail', 'actor', 'created_at'],
  staff: ['email', 'name', 'role', 'created_at'],
  help_questions: ['question', 'page', 'done', 'created_at'],
  // Orders and payments are changed only through /api/order (rules for money and the clock live there).
  orders: ['notes'],
  order_updates: [],
  order_files: [],
  payments: [],
} as const;
export type Table = keyof typeof TABLES;

export const KEY: Partial<Record<Table, string>> = { site_sections: 'key' };              // primary key if not "id"
export const ORDER: Partial<Record<Table, string>> = { site_sections: 'sort ASC' };        // default: newest first
export const BOOLS = new Set(['marketing_opt_in', 'show_on_website', 'consent', 'enabled', 'done', 'consent_review', 'consent_portfolio']);
export const JSONS = new Set(['audience_spec']);
export const HAS_UPDATED_AT = new Set<Table>(['deals', 'projects', 'site_sections', 'orders']);
export const ADMIN_ONLY_WRITE = new Set<Table>(['staff']);
export const READ_ONLY = new Set<Table>(['order_updates', 'order_files', 'payments']);
export const NO_CREATE_DELETE = new Set<Table>(['orders']);   // new orders go through /api/order

export const isTable = (t: string): t is Table => Object.prototype.hasOwnProperty.call(TABLES, t);

// Database → browser: 1/0 → true/false, JSON text → objects
export function fromDb(row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const k of Object.keys(out)) {
    if (BOOLS.has(k)) out[k] = !!out[k];
    else if (JSONS.has(k) && typeof out[k] === 'string') { try { out[k] = JSON.parse(out[k] as string); } catch { /* keep text */ } }
  }
  return out;
}

// Browser → database: keep only allowed columns, convert true/false and objects
export function toDb(table: Table, input: Record<string, unknown>) {
  const allowed = TABLES[table] as readonly string[];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!allowed.includes(k)) continue;
    out[k] = BOOLS.has(k) ? (v ? 1 : 0) : JSONS.has(k) && v !== null && typeof v === 'object' ? JSON.stringify(v) : v === undefined ? null : v;
  }
  return out;
}
