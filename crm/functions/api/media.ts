// Pictures and videos for the website's gallery and "Trusted by" logos (CRM → Gallery, CRM → Client logos).
//   POST   /api/media           multipart: folder ("gallery" | "logos"), file   → { key }
//                                add thumbOf=<picture key> to store a small grid copy at <name>.sm.webp
//   GET    /api/media?key=…     the file, for previews inside the CRM
//   DELETE /api/media?key=…     removes a file that is no longer used
// The public website serves the same files at https://jaytech9.com/media/<key>.
import type { Ctx } from '../_lib/env';
import { HttpError, fail, json, uuid } from '../_lib/http';

const KEY = /^(gallery|logos)\/[A-Za-z0-9._-]+$/;
const TYPES: Record<string, string> = {
  'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};
const MAX = 95 * 1024 * 1024;

export const onRequestPost = async (ctx: Ctx) => {
  try {
    if (!ctx.env.FILES) throw new HttpError(503, 'File storage is not connected to the CRM yet.');
    const f = await ctx.request.formData();
    const folder = String(f.get('folder') ?? '');
    const file = f.get('file');
    if (!['gallery', 'logos'].includes(folder)) throw new HttpError(400, 'Unknown folder.');
    if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Choose a file.');
    const ext = TYPES[file.type];
    if (!ext) throw new HttpError(400, 'Use a JPG, PNG or WebP picture, or an MP4, WebM or MOV video.');
    if (folder === 'logos' && !file.type.startsWith('image/')) throw new HttpError(400, 'Logos must be pictures.');
    if (file.size > MAX) throw new HttpError(413, 'That file is over 95 MB. For long videos, add the TikTok, Instagram or YouTube link instead.');
    const thumbOf = String(f.get('thumbOf') ?? '');
    if (thumbOf && !(KEY.test(thumbOf) && thumbOf.startsWith(`${folder}/`) && /\.webp$/.test(thumbOf) && !/\.sm\.webp$/.test(thumbOf) && ext === 'webp'))
      throw new HttpError(400, 'Bad thumbnail.');
    const key = thumbOf ? thumbOf.replace(/\.webp$/, '.sm.webp') : `${folder}/${uuid()}.${ext}`;
    await ctx.env.FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
    return json({ key }, 201);
  } catch (e) { return fail(e); }
};

export const onRequestGet = async (ctx: Ctx) => {
  try {
    const key = new URL(ctx.request.url).searchParams.get('key') ?? '';
    if (!KEY.test(key) || !ctx.env.FILES) throw new HttpError(404, 'Not found.');
    const obj = await ctx.env.FILES.get(key);
    if (!obj) throw new HttpError(404, 'Not found.');
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('cache-control', 'private, max-age=3600');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(obj.body, { headers });
  } catch (e) { return fail(e); }
};

export const onRequestHead = onRequestGet;

export const onRequestDelete = async (ctx: Ctx) => {
  try {
    const key = new URL(ctx.request.url).searchParams.get('key') ?? '';
    if (!KEY.test(key)) throw new HttpError(400, 'Bad file name.');
    // Never delete a file that a gallery piece or logo still uses.
    const used = await ctx.env.DB.prepare('SELECT 1 FROM gallery_items WHERE image_key = ?1 OR video_key = ?1 UNION SELECT 1 FROM brand_logos WHERE logo_key = ?1 LIMIT 1').bind(key).first();
    if (!used) await ctx.env.FILES?.delete(/\.webp$/.test(key) ? [key, key.replace(/\.webp$/, '.sm.webp')] : key);
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
