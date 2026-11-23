// Shared table cache: every screen reading "bookings" sees the same rows, and a change anywhere updates all of them.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { db } from './db';
import type { TableName, Tables } from './types';

type State<T> = { rows: T[]; loading: boolean; error: string | null; loaded: boolean };
const states = new Map<TableName, State<unknown>>();
const subs = new Map<TableName, Set<() => void>>();
const inflight = new Map<TableName, Promise<void>>();

const get = <T extends TableName>(t: T) =>
  (states.get(t) ?? { rows: [], loading: false, error: null, loaded: false }) as State<Tables[T]>;
function set<T extends TableName>(t: T, patch: Partial<State<Tables[T]>>) {
  states.set(t, { ...get(t), ...patch } as State<unknown>);
  subs.get(t)?.forEach((f) => f());
}

export function load<T extends TableName>(t: T, force = false) {
  if (!force && (get(t).loaded || inflight.has(t))) return inflight.get(t) ?? Promise.resolve();
  set(t, { loading: true });
  const p = db.list(t)
    .then((rows) => set(t, { rows, loading: false, loaded: true, error: null }))
    .catch((e: Error) => set(t, { loading: false, error: e.message }))
    .finally(() => inflight.delete(t));
  inflight.set(t, p);
  return p;
}

export function useTable<T extends TableName>(t: T) {
  const subscribe = useCallback((f: () => void) => {
    if (!subs.has(t)) subs.set(t, new Set());
    subs.get(t)!.add(f);
    return () => { subs.get(t)!.delete(f); };
  }, [t]);
  const state = useSyncExternalStore(subscribe, () => get(t));
  useEffect(() => { load(t); }, [t]);
  return state;
}

const keyOf = (t: TableName) => (t === 'site_sections' ? 'key' : 'id');

export async function insertRow<T extends TableName>(t: T, row: Partial<Tables[T]>) {
  const created = await db.insert(t, row);
  set(t, { rows: [created, ...get(t).rows] });
  return created;
}

export async function updateRow<T extends TableName>(t: T, id: string, patch: Partial<Tables[T]>) {
  const k = keyOf(t);
  const before = get(t).rows;
  // optimistic: show the change at once, roll back if the server refuses
  set(t, { rows: before.map((r) => ((r as unknown as Record<string, unknown>)[k] === id ? { ...r, ...patch } : r)) });
  try {
    const saved = await db.update(t, id, patch, k);
    set(t, { rows: get(t).rows.map((r) => ((r as unknown as Record<string, unknown>)[k] === id ? saved : r)) });
    return saved;
  } catch (e) {
    set(t, { rows: before });
    throw e;
  }
}

/** Put a row the server returned (e.g. from /api/order) into the cache, replacing any old copy. */
export function putRow<T extends TableName>(t: T, row: Tables[T]) {
  const k = keyOf(t);
  const id = (row as unknown as Record<string, unknown>)[k];
  const rows = get(t).rows;
  const has = rows.some((r) => (r as unknown as Record<string, unknown>)[k] === id);
  set(t, { rows: has ? rows.map((r) => ((r as unknown as Record<string, unknown>)[k] === id ? row : r)) : [row, ...rows] });
}

export async function removeRow(t: TableName, id: string) {
  const before = get(t).rows;
  set(t, { rows: before.filter((r) => (r as { id: string }).id !== id) });
  try { await db.remove(t, id); } catch (e) { set(t, { rows: before }); throw e; }
}

export async function logActivity(entity: string, action: string, detail?: string, entity_id?: string) {
  try { await insertRow('activity', { entity, action, detail, entity_id }); } catch { /* activity is best-effort */ }
}

// Tell the website to rebuild so section switches, reviews and projects go live.
let publishTimer: ReturnType<typeof setTimeout> | undefined;
export function publishWebsiteSoon(onDone?: (ok: boolean) => void) {
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => {
    db.fn('publish-site', {}).then(() => onDone?.(true)).catch(() => onDone?.(false));
  }, 4000);
}
