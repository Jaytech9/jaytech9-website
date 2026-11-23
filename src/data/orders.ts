// Services a client can order online on /order/, and how an order moves.
// `title` must match the service names in the CRM (crm/src/lib/types.ts → SERVICES).
export const orderServices = [
  { id: 'video', title: 'Video and motion', blurb: 'Promo videos, reels, animated logos and adverts.', icon: 'video' },
  { id: 'design', title: 'Brand and print design', blurb: 'Logos, flyers, banners, social media posts.', icon: 'brush' },
  { id: 'websites', title: 'Websites and web applications', blurb: 'Business sites, online shops, web apps.', icon: 'monitor' },
  { id: 'systems', title: 'Business systems', blurb: 'Stock, sales, donations and records.', icon: 'layers' },
  { id: 'data', title: 'Data dashboards and analysis', blurb: 'Dashboards and reports from your numbers.', icon: 'chart' },
  { id: 'agritech', title: 'AgriTech and sustainability', blurb: 'Digital tools for farmers and programmes.', icon: 'sprout' },
  { id: 'care', title: 'Domains, hosting and care', blurb: 'Domains, business email and hosting.', icon: 'globe' },
] as const;

// The five steps every order follows. Shown on /order/ and on the client's tracking page.
export const orderSteps = [
  { key: 'quote', title: 'Quote', text: 'We read your brief and send a clear price and delivery time.' },
  { key: 'deposit', title: '70% deposit', text: 'Pay the deposit securely with Mobile Money or card. Work starts.' },
  { key: 'preview', title: 'Preview', text: 'You get a watermarked preview to check. Two rounds of changes are included.' },
  { key: 'approve', title: 'Approve', text: 'Happy with it? Approve the preview on your order page.' },
  { key: 'final', title: 'Balance and files', text: 'Pay the 30% balance and download your final files straight away.' },
] as const;
