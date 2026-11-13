// Asks Netlify to rebuild the public website, so section switches, reviews and projects go live.
import { fail, json, requireStaff } from './_lib';

export default async (req: Request) => {
  try {
    await requireStaff(req);
    const hook = process.env.WEBSITE_BUILD_HOOK;
    if (!hook) return json({ error: 'Website build hook is not set up yet' }, 500);
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) return json({ error: `Netlify said ${res.status}` }, 502);
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
