// Getting pictures and videos ready in the browser before they go to the website, so pages stay fast
// on mobile data. Every upload goes through here automatically:
//   pictures → WebP, longest side 1600 px (logos 600 px), plus a ~640 px copy for the gallery grids;
//   videos   → MP4 (H.264 + AAC), longest side 1280 px (720p), about 1.6 Mbit/s, ready to stream
//              (iPhone .mov / HEVC files become MP4 that every phone can play);
//   a video also gets a cover picture taken from its first second.
export const mediaSrc = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;

const toBlob = (c: HTMLCanvasElement, type = 'image/webp', q = 0.86) =>
  new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not process the picture.'))), type, q));

export async function preparePicture(file: File, max = 1600, q = 0.8) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use a JPG, PNG or WebP picture.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await toBlob(c, 'image/webp', q);
  return { file: new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '') + '.webp', { type: 'image/webp' }), width: c.width, height: c.height };
}

// Small copy for grids (home page "Recent designs", gallery page). Saved next to the picture as <name>.sm.webp.
export async function makeThumb(picture: Blob, max = 640) {
  const bmp = await createImageBitmap(picture);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new File([await toBlob(c, 'image/webp', 0.72)], 'thumb.webp', { type: 'image/webp' });
}

const mb = (n: number) => `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;

// Shrinks a video in the browser (Chrome/Edge, using the computer's video encoder). Returns the smaller of
// the original and the result, with a note for the screen. Falls back to the original if this browser can't.
export async function compressVideo(file: File, onProgress?: (pct: number) => void): Promise<{ file: File; note: string }> {
  const isMov = /quicktime/.test(file.type) || /\.mov$/i.test(file.name);
  if (!isMov && file.size < 2.5 * 1048576) return { file, note: `Video is already small (${mb(file.size)}).` };
  if (typeof VideoEncoder === 'undefined')
    return { file, note: `This browser can't shrink videos, so it was uploaded as it is (${mb(file.size)}). Use Chrome for smaller videos.` };
  try {
    const m = await import('mediabunny');
    const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('No video track');
    const w = await track.getDisplayWidth(), h = await track.getDisplayHeight();
    const LONG = 1280;
    const size = Math.max(w, h) > LONG ? (w >= h ? { width: LONG } : { height: LONG }) : {};
    const output = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new m.BufferTarget() });
    const conversion = await m.Conversion.init({
      input, output,
      video: { ...size, codec: 'avc', bitrate: 1_600_000, forceTranscode: true },
      audio: { codec: 'aac', bitrate: 96_000 },
    });
    if (!conversion.isValid) throw new Error('Unsupported video');
    if (onProgress) conversion.onProgress = (p) => onProgress(Math.round(p * 100));
    await conversion.execute();
    const buf = output.target.buffer;
    if (!buf || buf.byteLength >= file.size) return { file, note: `Video kept as it is (${mb(file.size)}); it was already well compressed.` };
    const out = new File([buf], file.name.replace(/\.[a-z0-9]+$/i, '') + '.mp4', { type: 'video/mp4' });
    return { file: out, note: `Video shrunk from ${mb(file.size)} to ${mb(out.size)}.` };
  } catch {
    return { file, note: isMov
      ? `This video couldn't be converted here, so it was uploaded as it is (${mb(file.size)}). For best results export it as MP4 (H.264, 720p).`
      : `Video uploaded as it is (${mb(file.size)}); it couldn't be shrunk in this browser.` };
  }
}

export function coverFromVideo(file: File): Promise<{ file: File; width: number; height: number }> {
  return new Promise((ok, bad) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = async () => {
      try {
        const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
        c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
        const blob = await toBlob(c, 'image/webp', 0.84);
        ok({ file: new File([blob], 'cover.webp', { type: 'image/webp' }), width: c.width, height: c.height });
      } catch (e) { bad(e); } finally { URL.revokeObjectURL(url); }
    };
    v.onerror = () => { URL.revokeObjectURL(url); bad(new Error('This video format can’t be read here. Export it as MP4 (H.264) and try again.')); };
  });
}

export async function uploadMedia(folder: 'gallery' | 'logos', file: File, thumbOf?: string) {
  const fd = new FormData();
  fd.set('folder', folder); fd.set('file', file);
  if (thumbOf) fd.set('thumbOf', thumbOf);
  const res = await fetch('/api/media', { method: 'POST', body: fd, credentials: 'same-origin' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status}).`);
  return body.key as string;
}

export const removeMedia = (key?: string | null) =>
  key ? fetch(`/api/media?key=${encodeURIComponent(key)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {}) : Promise.resolve();

// Gallery pieces uploaded before thumbnails existed: make their small grid copy once.
export async function addMissingThumbs(keys: string[]) {
  let made = 0;
  for (const key of keys) {
    if (!/^gallery\/[A-Za-z0-9-]+\.webp$/.test(key)) continue;
    try {
      const head = await fetch(mediaSrc(key.replace(/\.webp$/, '.sm.webp')), { method: 'HEAD', credentials: 'same-origin' });
      if (head.status !== 404) continue;
      const full = await fetch(mediaSrc(key), { credentials: 'same-origin' });
      if (!full.ok) continue;
      await uploadMedia('gallery', await makeThumb(await full.blob()), key);
      made++;
    } catch { /* try again next time */ }
  }
  return made;
}
