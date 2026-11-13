// One small data layer for the whole CRM.
//  - "api" mode (the real CRM): talks to our Cloudflare API in crm/functions/api, which reads the D1 database.
//  - "demo" mode (`npm run dev`): sample data kept in this browser tab, nothing is saved anywhere.
// Pages never talk to the database directly; they only use `db` (through lib/store.ts).
import type { TableName, Tables } from './types';
import { makeDemoData } from './demo';

export interface User { id: string; email: string; name: string; role: 'admin' | 'staff' }

export interface Adapter {
  mode: 'api' | 'demo';
  list<T extends TableName>(table: T): Promise<Tables[T][]>;
  insert<T extends TableName>(table: T, row: Partial<Tables[T]>): Promise<Tables[T]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>, key?: string): Promise<Tables[T]>;
  remove(table: TableName, id: string): Promise<void>;
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  fn<R = unknown>(name: string, body: unknown): Promise<R>;
}

const ORDER: Partial<Record<TableName, string>> = { site_sections: 'sort' };

async function call<R>(path: string, init: RequestInit = {}): Promise<R> {
  const res = await fetch(`/api/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Cloudflare Access session ended: reload so Access shows its sign-in page again.
    if (path !== 'me') location.reload();
    throw Object.assign(new Error(body.error ?? 'Please sign in.'), { status: 401 });
  }
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status}).`);
  return body as R;
}

function api(): Adapter {
  return {
    mode: 'api',
    list: (t) => call(`t/${t}`),
    insert: (t, row) => call(`t/${t}`, { method: 'POST', body: JSON.stringify(row) }),
    update: (t, id, patch) => call(`t/${t}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: async (t, id) => { await call(`t/${t}/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
    async currentUser() {
      try { return await call<User>('me'); } catch (e) {
        if ((e as { status?: number }).status === 401) return null;
        throw e;
      }
    },
    // Sign-in itself is done by Cloudflare Access before the CRM even loads. Reloading brings it up.
    async signIn() { location.reload(); return new Promise<User>(() => {}); },
    async signOut() { location.href = '/cdn-cgi/access/logout'; },
    fn: (name, body) => call(name, { method: 'POST', body: JSON.stringify(body) }),
  };
}

function demo(): Adapter {
  const KEY_ = 'jt9-crm-demo';
  const USER_KEY = 'jt9-crm-demo-user';
  let data: Record<string, Record<string, unknown>[]>;
  try {
    data = JSON.parse(sessionStorage.getItem(KEY_) ?? 'null') ?? makeDemoData(new Date());
  } catch {
    data = makeDemoData(new Date());
  }
  const save = () => {
    try { sessionStorage.setItem(KEY_, JSON.stringify(data)); } catch { /* storage may be off */ }
  };
  save();
  const wait = () => new Promise((r) => setTimeout(r, 120));
  const user: User = { id: 'demo', email: 'demo@jaytech9.com', name: 'Jones Kwamehene', role: 'admin' };
  return {
    mode: 'demo',
    async list(table) {
      await wait();
      const rows = [...(data[table] ?? [])] as Record<string, unknown>[];
      const col = ORDER[table] ?? 'created_at';
      rows.sort((a, b) => (col === 'sort' ? Number(a.sort) - Number(b.sort) : String(b[col]).localeCompare(String(a[col]))));
      return rows as never;
    },
    async insert(table, row) {
      await wait();
      const now = new Date().toISOString();
      const full = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...row };
      (data[table] ??= []).unshift(full as Record<string, unknown>);
      save();
      return full as never;
    },
    async update(table, id, patch, key = 'id') {
      await wait();
      const rows = data[table] ?? [];
      const i = rows.findIndex((r) => r[key] === id);
      if (i < 0) throw new Error('Not found');
      rows[i] = { ...rows[i], ...patch, updated_at: new Date().toISOString() };
      save();
      return rows[i] as never;
    },
    async remove(table, id) {
      await wait();
      data[table] = (data[table] ?? []).filter((r) => r.id !== id);
      save();
    },
    async currentUser() {
      try { return sessionStorage.getItem(USER_KEY) ? user : null; } catch { return null; }
    },
    async signIn() {
      await wait();
      try { sessionStorage.setItem(USER_KEY, '1'); } catch { /* ignore */ }
      return user;
    },
    async signOut() {
      try { sessionStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    },
    async fn(name, body) {
      await wait();
      if (name === 'send-message') {
        const b = body as { expected?: number };
        return { sent: b.expected ?? 0, demo: true } as never;
      }
      return { ok: true, demo: true } as never;
    },
  };
}

// `npm run dev` starts Vite in "demo" mode, so it always uses sample data.
export const db: Adapter = import.meta.env.MODE === 'demo' ? demo() : api();
