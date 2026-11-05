// Drawn illustrations that cards and banners can use until a real image is uploaded.
// Content refers to them by key, e.g. "art/data" or "screen/buildsmart".
import { art } from '../data/promo-art';
import { shots } from '../data/product-shots';

const visuals: Record<string, string> = {};
for (const [k, v] of Object.entries(art)) visuals[`art/${k}`] = v;
for (const [k, v] of Object.entries(shots)) visuals[`screen/${k}`] = v;

export function visual(key?: string): string {
  return (key && visuals[key]) || '';
}
export const visualKeys = Object.keys(visuals);
