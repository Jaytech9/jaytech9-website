// Getting pictures and videos ready in the browser before they go to the website:
// pictures are resized (max 2000 px) and saved as WebP so pages stay fast on mobile data;
// a video gets a cover picture taken from its first second.
export const mediaSrc = (key: string) => `/api/media?key=${encodeURIComponent(key)}`;

const toBlob = (c: HTMLCanvasElement, type = 'image/webp', q = 0.86) =>
  new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not process the picture.'))), type, q));

export async function preparePicture(file: File, max = 2000) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use a JPG, PNG or WebP picture.');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await toBlob(c);
  return { file: new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '') + '.webp', { type: 'image/webp' }), width: c.width, height: c.height };
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

export async function uploadMedia(folder: 'gallery' | 'logos', file: File) {
  const fd = new FormData();
  fd.set('folder', folder); fd.set('file', file);
  const res = await fetch('/api/media', { method: 'POST', body: fd, credentials: 'same-origin' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Upload failed (${res.status}).`);
  return body.key as string;
}

export const removeMedia = (key?: string | null) =>
  key ? fetch(`/api/media?key=${encodeURIComponent(key)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {}) : Promise.resolve();
