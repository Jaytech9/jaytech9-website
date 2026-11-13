// Who is calling? Cloudflare Access signs every request to the CRM with a token (JWT).
// We verify that token here, so even if someone reaches the API another way, they get nothing.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env, StaffUser } from './env';
import { HttpError, now, uuid } from './http';

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function emailFromAccess(req: Request, env: Env): Promise<string> {
  const url = new URL(req.url);
  // Local testing: `npm run dev:api` sets DEV_USER_EMAIL. Never set it in Cloudflare.
  if (env.DEV_USER_EMAIL && ['localhost', '127.0.0.1'].includes(url.hostname)) return env.DEV_USER_EMAIL;

  const token = req.headers.get('cf-access-jwt-assertion');
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new HttpError(401, 'Please sign in.');
  const team = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, '');
  if (!keySets.has(team)) keySets.set(team, createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`)));
  try {
    const { payload } = await jwtVerify(token, keySets.get(team)!, { issuer: team, audience: env.ACCESS_AUD });
    const email = String(payload.email ?? '').toLowerCase();
    if (!email) throw new Error('no email');
    return email;
  } catch {
    throw new HttpError(401, 'Your sign-in has expired. Please sign in again.');
  }
}

export async function currentStaff(req: Request, env: Env): Promise<StaffUser> {
  const email = await emailFromAccess(req, env);
  let staff = await env.DB.prepare('SELECT id, email, name, role FROM staff WHERE email = ?').bind(email).first<StaffUser>();
  if (!staff) {
    const admins = (env.ADMIN_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if (!admins.includes(email)) throw new HttpError(403, `${email} is not on the JayTech9 staff list. Ask an admin to add you.`);
    // First sign-in of an admin listed in ADMIN_EMAILS: add them. They can change their name in Settings.
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    staff = { id: uuid(), email, name, role: 'admin' };
    await env.DB.prepare('INSERT INTO staff (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(staff.id, email, name, 'admin', now()).run();
  }
  return staff;
}
