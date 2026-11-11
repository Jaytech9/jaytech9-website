// The six services, in the order they appear on the Services page. `id` matches the section anchor.
export const services = [
  { id: 'websites', blurb: 'Business sites, online shops and web applications.', title: 'Websites and web applications', icon: 'monitor' },
  { id: 'systems', blurb: 'Stock, sales, donations and records in one place.', title: 'Business systems', icon: 'layers' },
  { id: 'data', blurb: 'Dashboards and reports from your numbers.', title: 'Data dashboards and analysis', icon: 'chart' },
  { id: 'agritech', blurb: 'Digital tools for farmers and programmes.', title: 'AgriTech and sustainability', icon: 'sprout' },
  { id: 'design', blurb: 'Logos, flyers, banners and social media.', title: 'Brand and print design', icon: 'brush' },
  { id: 'care', blurb: 'Domains, business email, hosting and updates.', title: 'Domains, hosting and care', icon: 'globe' },
] as const;

export const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));

// Placeholders show only in the local preview (npm run dev), never on the live site.
export const showPlaceholders = import.meta.env.DEV;

// Labels for the design gallery filters, in display order.
export const designCategoryLabels: Record<string, string> = {
  logos: 'Logos',
  flyers: 'Flyers',
  banners: 'Banners',
  'social-media': 'Social media',
  'church-events': 'Church & events',
  'business-cards': 'Business cards',
  'fashion-beauty': 'Fashion & beauty',
  'packaging-merch': 'Packaging & merch',
};
