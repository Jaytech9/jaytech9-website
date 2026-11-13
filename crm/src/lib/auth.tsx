import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db, type User } from './db';

type Auth = { user: User | null; ready: boolean; signIn: (e: string, p: string) => Promise<void>; signOut: () => Promise<void> };
const Ctx = createContext<Auth>({ user: null, ready: false, signIn: async () => {}, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    db.currentUser().then(setUser).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);
  const value: Auth = {
    user, ready,
    signIn: async (e, p) => setUser(await db.signIn(e, p)),
    signOut: async () => { await db.signOut(); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
