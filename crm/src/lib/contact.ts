// Ghana numbers: 024 123 4567 → 233241234567
export function intl(phone?: string | null) {
  if (!phone) return '';
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '233' + d.slice(1);
  return d;
}
export const wa = (phone?: string | null, text = '') => `https://wa.me/${intl(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const tel = (phone?: string | null) => `tel:+${intl(phone)}`;
export const mail = (email?: string | null, subject = '') => `mailto:${email ?? ''}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
