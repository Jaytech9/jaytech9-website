// Professional preview watermark with the JayTech9 logo, applied in the browser before upload.
//  - Images (JPG, PNG, WebP): a soft diagonal pattern of logo + "JAYTECH9 · PREVIEW", a larger
//    centred logo, and a corner badge. Burned into the pixels.
//  - PDFs: the same marks stamped on every page (pdf-lib, loaded only when needed).
//  - Anything else (video, audio, ZIP, Word…): uploaded as it is. For videos, use the overlay PNG
//    from watermarkOverlayPng() in your video editor.
const LOGO_URL = '/logo-512.png';
const BRAND = '#0068a1';
const TEXT = 'JAYTECH9 · PREVIEW';

let logoP: Promise<HTMLImageElement> | null = null;
const logo = () => (logoP ??= new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = LOGO_URL; }));

function drawMarks(ctx: CanvasRenderingContext2D, w: number, h: number, img: HTMLImageElement) {
  const unit = Math.max(w, h);
  // 1) Diagonal tiles: small logo + label, faint, across the whole picture.
  const tile = Math.max(160, Math.round(unit / 4.2));
  const ls = Math.round(tile * 0.22);
  const fs = Math.round(tile * 0.085);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.globalAlpha = 0.32;
  ctx.font = `700 ${fs}px Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(16,41,58,0.8)';
  ctx.lineWidth = Math.max(1.5, fs / 7);
  ctx.lineJoin = 'round';
  const span = unit * 1.6;
  let row = 0;
  for (let y = -span; y <= span; y += tile * 0.62, row++) {
    for (let x = -span + (row % 2 ? tile * 0.55 : 0); x <= span; x += tile * 1.1) {
      ctx.save(); ctx.globalAlpha = 0.42; ctx.drawImage(img, x, y - ls / 2, ls, ls); ctx.restore();
      ctx.strokeText(TEXT, x + ls * 1.15, y);
      ctx.fillText(TEXT, x + ls * 1.15, y);
    }
  }
  ctx.restore();
  // 2) Large centred logo.
  const big = Math.round(Math.min(w, h) * 0.34);
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.drawImage(img, (w - big) / 2, (h - big) / 2, big, big);
  ctx.restore();
  // 3) Corner badge: logo + "Preview · jaytech9.com".
  const bh = Math.max(28, Math.round(unit * 0.045));
  const pad = Math.round(bh * 0.3);
  ctx.save();
  ctx.font = `600 ${Math.round(bh * 0.42)}px Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
  const label = 'Preview · jaytech9.com';
  const bw = bh + pad + ctx.measureText(label).width + pad * 2;
  const bx = w - bw - pad * 2, by = h - bh - pad * 2;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = BRAND;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bx + bh / 2, by + bh / 2, bh / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(img, bx + 5, by + 5, bh - 10, bh - 10);
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bh + pad, by + bh / 2 + 1);
  ctx.restore();
}

const canWatermarkImage = (f: File) => /^image\/(jpeg|png|webp)$/.test(f.type);
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
export const canWatermark = (f: File) => canWatermarkImage(f) || isPdf(f);

async function watermarkImage(file: File): Promise<File> {
  const [img, bmp] = await Promise.all([logo(), createImageBitmap(file)]);
  const max = 4000;   // keep huge photos reasonable
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  drawMarks(ctx, w, h, img);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), type, 0.9));
  return new File([blob], file.name.replace(/(\.[a-z0-9]+)?$/i, `-preview${type === 'image/png' ? '.png' : '.jpg'}`), { type });
}

async function watermarkPdf(file: File): Promise<File> {
  const { PDFDocument, degrees, rgb, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const png = await doc.embedPng(await (await fetch(LOGO_URL)).arrayBuffer());
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width: w, height: h } = page.getSize();
    const unit = Math.max(w, h), tile = unit / 4.2, ls = tile * 0.22, fs = tile * 0.085;
    for (let y = -h * 0.2, row = 0; y < h * 1.2; y += tile * 0.62, row++) {
      for (let x = -w * 0.3 + (row % 2 ? tile * 0.55 : 0); x < w * 1.2; x += tile * 1.1) {
        page.drawImage(png, { x, y, width: ls, height: ls, opacity: 0.2, rotate: degrees(30) });
        page.drawText('JAYTECH9 - PREVIEW', { x: x + ls * 1.1, y: y + ls * 0.55, size: fs, font, color: rgb(0, 0.41, 0.63), opacity: 0.22, rotate: degrees(30) });
      }
    }
    const big = Math.min(w, h) * 0.34;
    page.drawImage(png, { x: (w - big) / 2, y: (h - big) / 2, width: big, height: big, opacity: 0.25 });
    page.drawText('Preview · jaytech9.com'.replace('·', '-'), { x: w - 150, y: 18, size: 10, font, color: rgb(0, 0.41, 0.63), opacity: 0.9 });
  }
  const bytes = await doc.save();
  return new File([bytes as BlobPart], file.name.replace(/(\.pdf)?$/i, '-preview.pdf'), { type: 'application/pdf' });
}

/** Watermark a file if we can; otherwise return it unchanged. */
export async function watermark(file: File): Promise<{ file: File; marked: boolean }> {
  try {
    if (canWatermarkImage(file)) return { file: await watermarkImage(file), marked: true };
    if (isPdf(file)) return { file: await watermarkPdf(file), marked: true };
  } catch (e) { console.warn('watermark failed', e); }
  return { file, marked: false };
}

/** Transparent 1920×1080 PNG with the same marks, for video editors (place it on top of the video). */
export async function watermarkOverlayPng() {
  const img = await logo();
  const c = document.createElement('canvas');
  c.width = 1920; c.height = 1080;
  drawMarks(c.getContext('2d')!, 1920, 1080, img);
  const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jaytech9-video-watermark-1920x1080.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
