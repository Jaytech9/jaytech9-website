// One small data layer for the whole CRM. With Supabase keys set it talks to the real database;
// without them it runs in demo mode on sample data kept in this browser tab.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TableName, Tables } from './types';
import { makeDemoData } from './demo';

export interface User { id: string; email: string; name: string; role: 'admin' | 'staff' }

export interface Adapter {
  mode: 'live' | 'demo';
  list<T extends TableName>(table: T): Promise<Tables[T][]>;
  insert<T extends TableName>(table: T, row: Partial<Tables[T]>): Promise<Tables[T]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>, key?: string): Promise<Tables[T]>;
  remove(table: TableName, id: string): Promise<void>;
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<User>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  fn<R = unknown>(name: string, body: unknown): Promise<R>;
}

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const ORDER: Partial<Record<TableName, string>> = { site_sections: 'sort' };

function live(sb: SupabaseClient): Adapter {
  const check = <D>(r: { data: D | null; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data as D;
  };
  const toUser = async (): Promise<User | null> => {
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const staff = await sb.from('staff').select('name, role').eq('id', data.user.id).maybeSingle();
    if (!staff.data) {
      await sb.auth.signOut();
      throw new Error('This account is not on the JayTech9 staff list. Ask an admin to add you.');
    }
    return { id: data.user.id, email: data.user.email ?? '', name: staff.data.name, role: staff.data.role };
  };
  return {
    mode: 'live',
    async list(table) {
      const col = ORDER[table] ?? 'created_at';
      return check(await sb.from(table).select('*').order(col, { ascending: col === 'sort' }).limit(5000));
    },
    async insert(table, row) {
      return check(await sb.from(table).insert(row as never).select().single());
    },
    async update(table, id, patch, key = 'id') {
      return check(await sb.from(table).update(patch as never).eq(key, id).select().single());
    },
    async remove(table, id) {
      check(await sb.from(table).delete().eq('id', id));
    },
    currentUser: toUser,
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password do not match.' : error.message);
      const u = await toUser();
      if (!u) throw new Error('Could not sign in. Please try again.');
      return u;
    },
    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw new Error(error.message);
    },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset' });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async fn(name, body) {
      const { data } = await sb.auth.getSession();
      const res = await fetch(`/.netlify/functions/${name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error ?? `Request failed (${res.status})`);
      return out;
    },
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
    async signInWithGoogle() {
      try { sessionStorage.setItem(USER_KEY, '1'); } catch { /* ignore */ }
      location.reload();
    },
    async resetPassword() { await wait(); },
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

export const db: Adapter = URL_ && KEY ? live(createClient(URL_, KEY)) : demo();
export const googleSignIn = import.meta.env.VITE_GOOGLE_SIGNIN === 'true' || db.mode === 'demo';
