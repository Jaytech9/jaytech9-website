// The six services, in the order they appear on the Services page. `id` matches the section anchor.
export const services = [
  { id: 'websites', title: 'Websites and web apps', icon: 'monitor' },
  { id: 'systems', title: 'Business systems', icon: 'layers' },
  { id: 'data', title: 'Data dashboards and analysis', icon: 'chart' },
  { id: 'agritech', title: 'AgriTech and sustainability', icon: 'sprout' },
  { id: 'design', title: 'Brand and print design', icon: 'brush' },
  { id: 'care', title: 'Domains, hosting and care', icon: 'globe' },
] as const;

export const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));

// Placeholders show only in the local preview (npm run dev), never on the live site.
export const showPlaceholders = import.meta.env.DEV;
