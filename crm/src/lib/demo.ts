// Sample data for demo mode. Every date is worked out from the moment the CRM opens,
// so the dashboard always looks current. None of this is real; it disappears once Supabase is connected.
import { SERVICES } from './types';

const first = ['Ama', 'Kwame', 'Akosua', 'Kofi', 'Efua', 'Yaw', 'Abena', 'Kwesi', 'Adwoa', 'Kojo', 'Esi', 'Kwabena', 'Afia', 'Fiifi', 'Akua', 'Nana', 'Selorm', 'Dzifa', 'Elikem', 'Mawuli', 'Naa', 'Nii', 'Aisha', 'Ibrahim'];
const last = ['Mensah', 'Owusu', 'Boateng', 'Asante', 'Addo', 'Agyeman', 'Darko', 'Ofori', 'Amoah', 'Quaye', 'Tetteh', 'Annan', 'Adjei', 'Kumi', 'Agbeko', 'Dogbe', 'Lamptey', 'Sulemana'];
const orgs = ['Golden Grain Farms', 'Kasoa Hardware Centre', 'Grace Chapel Int.', 'Nhyira Fashion House', 'TechHub Tamale', 'Volta Agro Co-op', 'Adom Pharmacy', 'BrightPath School', 'Osu Bites', 'Sunrise Microfinance', 'Kente Kraft Studio', 'Hope Foundation', 'EcoPlast Ghana', 'Mama Ashanti Foods', 'Ridge Dental Clinic', 'Prime Logistics', null, null];
const sources = ['Google', 'Facebook', 'Instagram', 'TikTok', 'Referral', 'WhatsApp', 'Walk-in'];
const budgets = ['Under GH₵ 5,000', 'GH₵ 5,000 – 15,000', 'GH₵ 15,000 – 50,000', 'Over GH₵ 50,000', 'Not sure yet'];
const methods = ['Phone call', 'WhatsApp call', 'Google Meet', 'In person (Accra)'];
const timelines = ['Urgent (express)', 'Within a month', '1–3 months', 'Flexible'];
const projectNames: Record<string, string[]> = {
  'Websites and web applications': ['Company website', 'Online shop', 'Booking website', 'School portal'],
  'Business systems': ['Stock and sales system', 'Donation tracker', 'Loan records system'],
  'Data dashboards and analysis': ['Sales dashboard', 'Field data dashboard', 'Market research report'],
  'AgriTech and sustainability': ['Farmer registration app', 'Carbon credit records'],
  'Brand and print design': ['Logo and brand kit', 'Anniversary flyers', 'Launch banners'],
  'Domains, hosting and care': ['Domain and business email', 'Website care plan'],
};
const reviewText = [
  'They set up our stock system in two weeks. We now know exactly what is in the warehouse.',
  'The flyers and banners came out beautiful, and they were ready on time.',
  'Very patient team. They explained everything and trained our staff well.',
  'Our new website brings us customers every week. Worth every pesewa.',
  'The dashboard saves me a full afternoon every month.',
];

export function makeDemoData(now: Date) {
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const id = () => crypto.randomUUID();
  const at = (daysAgo: number, hour?: number) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    if (hour !== undefined) {
      d.setUTCHours(hour, 0, 0, 0);
      // calls only happen Monday to Friday, like the booking form
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + (daysAgo < 0 ? 1 : -1));
    }
    return d.toISOString();
  };
  const phone = () => '+23324' + String(Math.floor(1000000 + rnd() * 8999999));

  const clients = Array.from({ length: 46 }, (_, i) => {
    const name = `${pick(first)} ${pick(last)}`;
    const org = pick(orgs);
    return {
      id: id(), name, organisation: org, phone: phone(),
      email: `${name.split(' ')[0].toLowerCase()}.${i}@example.com`,
      service: pick(SERVICES), source: pick(sources), marketing_opt_in: rnd() > 0.35,
      notes: null, created_at: at(Math.floor(rnd() * 170)),
    };
  });

  // Bookings: more each week as the business grows, plus upcoming calls.
  const slots = [9, 10, 11, 12, 14, 15, 16];
  const bookings: Record<string, unknown>[] = [];
  for (let w = 0; w < 13; w++) {
    const count = Math.max(1, Math.round(2 + (13 - w) * 0.45 + rnd() * 3));
    for (let k = 0; k < count; k++) {
      const c = pick(clients);
      const createdAgo = w * 7 + rnd() * 7;
      const callAgo = createdAgo - 1 - Math.floor(rnd() * 4);
      const upcoming = callAgo < 0;
      bookings.push({
        id: id(), client_id: c.id, name: c.name, organisation: c.organisation, email: c.email, phone: c.phone,
        service: pick(SERVICES), details: 'We need help with ' + pick(['our stock records', 'a new website', 'monthly reports', 'farmer data', 'a new logo']) + '.',
        budget: pick(budgets), timeline: pick(timelines), method: pick(methods), source: c.source,
        call_at: at(callAgo, pick(slots)),
        status: upcoming ? (rnd() > 0.5 ? 'new' : 'confirmed') : rnd() > 0.15 ? 'done' : pick(['cancelled', 'no_show']),
        created_at: at(createdAgo),
      });
    }
  }
  for (let k = 0; k < 6; k++) {
    const c = pick(clients);
    bookings.push({
      id: id(), client_id: c.id, name: c.name, organisation: c.organisation, email: c.email, phone: c.phone,
      service: pick(SERVICES), details: 'Looking for a quote.', budget: pick(budgets), timeline: pick(timelines),
      method: pick(methods), source: c.source, call_at: at(-(k % 5) - (k < 2 ? 0 : 1), pick(slots)),
      status: k < 3 ? 'new' : 'confirmed', created_at: at(rnd() * 1.5),
    });
  }

  const enquiries = Array.from({ length: 14 }, (_, i) => {
    const c = pick(clients);
    return {
      id: id(), client_id: c.id, name: c.name, email: c.email, phone: c.phone, organisation: c.organisation,
      needs: pick(['A website', 'A business system', 'A dashboard or data analysis', 'Design', 'Domain, email or hosting']),
      message: pick(['How much does a school website cost?', 'Can you build a stock app for my shop?', 'We need a new logo before our launch.', 'Can you move our email to our own domain?']),
      status: i < 3 ? 'new' : i < 9 ? 'replied' : 'closed', created_at: at(i * 2.3 + rnd()),
    };
  });

  const stages = ['new', 'call', 'quote', 'progress', 'won', 'won', 'won', 'lost'] as const;
  const deals = Array.from({ length: 34 }, () => {
    const c = pick(clients);
    const stage = pick(stages);
    const service = pick(SERVICES);
    const created = rnd() * 175;
    const closedAgo = Math.max(0, created - 10 - rnd() * 20);
    return {
      id: id(), client_id: c.id, title: pick(projectNames[service]) + ' · ' + (c.organisation ?? c.name),
      service, value: Math.round((1500 + rnd() * 38000) / 100) * 100, stage,
      closed_at: stage === 'won' || stage === 'lost' ? at(closedAgo) : null,
      created_at: at(created), updated_at: at(Math.min(created, closedAgo + 1)),
    };
  });

  const pstat = ['in_progress', 'in_progress', 'in_progress', 'review', 'planning', 'delivered', 'delivered', 'on_hold'] as const;
  const projects = pstat.map((status, i) => {
    const c = clients[i * 3];
    const service = SERVICES[i % SERVICES.length];
    const start = 10 + i * 9;
    const progress = status === 'delivered' ? 100 : status === 'planning' ? 5 : status === 'review' ? 90 : 20 + Math.round(rnd() * 60);
    return {
      id: id(), client_id: c.id, title: pick(projectNames[service]) + ' · ' + (c.organisation ?? c.name), service, status, progress,
      value: Math.round((3000 + rnd() * 30000) / 100) * 100,
      start_date: at(start).slice(0, 10), due_date: at(-(Math.round(rnd() * 30) - (status === 'delivered' ? 40 : 3))).slice(0, 10),
      show_on_website: status === 'delivered' || i === 1, website_summary: status === 'delivered' ? 'A clear, simple system the team uses every day.' : null,
      website_outcome: null, live_url: null, created_at: at(start), updated_at: at(rnd() * 5),
    };
  });

  const reviews = reviewText.map((message, i) => ({
    id: id(), name: `${pick(first)} ${pick(last)}`, organisation: pick(orgs.filter(Boolean)), role: pick(['Director', 'Manager', 'Pastor', 'Owner']),
    rating: i === 2 ? 4 : 5, message, consent: true, product: null,
    status: i < 2 ? 'pending' : 'approved', created_at: at(i < 2 ? i * 0.8 + 0.1 : 10 + i * 9),
  }));

  const site_sections = [
    ['help_widget', 'Help chat bubble', 'Every page', true],
    ['testimonials', 'What clients say', 'Home and product pages', true],
    ['accept_reviews', 'Accept new reviews', 'Share your experience page', true],
    ['recent_designs', 'Recent designs', 'Home', true],
    ['service_examples', 'Examples of our work', 'Services', true],
    ['urgent_booking', 'Urgent (express) bookings', 'Booking form', true],
    ['blog', 'Blog', 'Footer link', false],
    ['careers', 'Open roles', 'Careers page', true],
    ['donate', 'Donate', 'Footer link', true],
  ].map(([key, label, location, enabled], i) => ({ key, label, location, enabled, sort: i + 1, updated_at: at(12 + i) }));

  const campaigns = [
    { channel: 'sms', kind: 'promotion', audience_spec: { type: 'opted_in' }, audience: 'All clients who opted in', message: 'Season greetings from JayTech9! Book a free call: jaytech9.com/book', recipients: 28, status: 'sent', ago: 21 },
    { channel: 'email', kind: 'promotion', audience_spec: { type: 'service', service: 'Websites and web applications' }, audience: 'Clients by service: Websites and web applications', subject: 'Is your website ready for the holidays?', message: 'A quick check-up for your website.', recipients: 11, status: 'sent', ago: 9 },
  ].map((c) => ({ id: id(), subject: null, scheduled_at: null, sent_at: at(c.ago), error: null, created_at: at(c.ago), ...c }));

  const activity = [
    ...bookings.slice(-6).map((b) => ({ id: id(), entity: 'booking', entity_id: b.id, action: 'New booking', detail: `${b.name} · ${b.service}`, created_at: b.created_at })),
    ...reviews.filter((r) => r.status === 'pending').map((r) => ({ id: id(), entity: 'review', entity_id: r.id, action: 'New review', detail: r.name, created_at: r.created_at })),
  ];

  return { clients, bookings, enquiries, deals, projects, reviews, site_sections, campaigns, activity, staff: [] } as Record<string, Record<string, unknown>[]>;
}
