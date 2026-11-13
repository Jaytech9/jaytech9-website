import type { AudienceSpec, Channel, Client } from './types';

// Same rules as the server: promotions only ever go to clients who opted in.
export function resolveAudience(clients: Client[], spec: AudienceSpec, channel: Channel, kind: 'promotion' | 'update') {
  let list = clients;
  if (spec.type === 'client') list = clients.filter((c) => c.id === spec.client_id);
  if (spec.type === 'service') list = clients.filter((c) => c.service === spec.service);
  if (kind === 'promotion') list = list.filter((c) => c.marketing_opt_in);
  return list.filter((c) => (channel === 'email' ? !!c.email : !!c.phone));
}

export const OPT_OUT = 'Reply STOP to opt out.';
export const personalise = (text: string, name: string) => text.split('[first name]').join(name.split(' ')[0]);

// GSM-7 messages: 160 characters in one SMS, 153 per part after that.
export function smsParts(text: string) {
  const unicode = /[^\n\r\x20-\x7E£¥èéùìòÇØøÅå_ÆæßÉ¡ÄÖÑÜ§¿äöñüà€]/.test(text);
  const one = unicode ? 70 : 160, many = unicode ? 67 : 153;
  const n = text.length <= one ? 1 : Math.ceil(text.length / many);
  return { parts: n, limit: n === 1 ? one : n * many, unicode };
}
