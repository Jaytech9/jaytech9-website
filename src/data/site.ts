// Business details used across the site. Edit here once, and every page updates.
export const site = {
  name: 'JayTech9',
  legalName: 'Jay Tech 9 Enterprise',
  url: 'https://jaytech9.com',
  tagline: 'Websites, business systems and data tools for businesses and organisations worldwide.',
  email: 'info@jaytech9.com',
  phone: '+233203651974',
  phoneDisplay: '+233 20 365 1974',
  whatsapp: 'https://wa.me/233203651974',
  city: 'Accra',
  country: 'Ghana',
  countryCode: 'GH',
  founder: 'Jones Yaw Kwamehene',
  founderRole: 'Founder and Lead Developer',
  founderPhoto: '', // e.g. '/uploads/jones.webp'; initials show until a photo is added
  founderNote:
    'I spent years in the field training farmers and checking cereal quality, and watched good people lose hours to paperwork. I started JayTech9 to build the simple tools I wished we had. Every project still starts the same way: understand the real problem first.',
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/Jaytech9' },
    { label: 'Instagram', href: 'https://www.instagram.com/Jaytech9' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@jaytech_9' },
    { label: 'YouTube', href: 'https://www.youtube.com/@JayTech9-9' },
  ],
};

export const nav = [
  { label: 'Services', href: '/services/' },
  { label: 'Products', href: '/products/' },
  { label: 'Gallery', href: '/design/' },
  { label: 'About', href: '/about/' },
  { label: 'Careers', href: '/careers/' },
];

// Footer: keep each list to four items.
export const footerLinks = [
  { label: 'About us', href: '/about/' },
  { label: 'Careers', href: '/careers/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Donate', href: '/donate/' },
];

export const footerServices = [
  { label: 'Websites and web applications', href: '/services/#websites' },
  { label: 'Business systems', href: '/services/#systems' },
  { label: 'Data dashboards', href: '/services/#data' },
  { label: 'AgriTech and sustainability', href: '/services/#agritech' },
];

// Booking page (/book/): when visitors can ask for their free call. Times are Ghana time (GMT).
export const booking = {
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday (0 = Sunday)
  slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'],
  daysAhead: 14, // how far ahead visitors can pick a day
  methods: ['Phone call', 'WhatsApp call', 'Google Meet', 'In person (Accra)'],
  budgets: ['Under GH₵ 5,000', 'GH₵ 5,000 – 15,000', 'GH₵ 15,000 – 50,000', 'Over GH₵ 50,000', 'Not sure yet'],
  timelines: ['Urgent (express)', 'Within a month', '1–3 months', 'Flexible'],
};
