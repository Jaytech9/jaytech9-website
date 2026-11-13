export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const fail = (e: unknown) =>
  e instanceof HttpError ? json({ error: e.message }, e.status) : (console.error(e), json({ error: 'Something went wrong. Please try again.' }, 500));

export const now = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();
