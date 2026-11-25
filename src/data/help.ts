import { site } from './site';

// What the help assistant knows. Each row is a question, its answer and, optionally, buttons shown under it.
// Only add facts that are also on the website, so the assistant never promises something we don't.
type Link = { label: string; href: string; new_tab?: boolean };
const order: Link = { label: 'Order now', href: '/order/' };
const book: Link = { label: 'Book a free call', href: '/book/' };
const whatsapp: Link = { label: 'Chat on WhatsApp', href: site.whatsapp, new_tab: true };

export const helpFaq: [string, string, Link[]?][] = [
  [
    'What services do you offer? Do you build websites, web applications or systems?',
    'We build websites and web apps, business systems and data dashboards. We also do AgriTech tools, brand and print design, promo videos and reels, and domains, hosting and care.',
    [{ label: 'See our services', href: '/services/' }],
  ],
  [
    'How do I order or request a service? Place an order',
    'Open the Order page, choose the service and tell us what you need. You get a quote, usually within a few hours. Pay the 70% deposit, approve a watermarked preview, then pay the balance and download your final files.',
    [order],
  ],
  [
    'How much does it cost? Price list or quote for my project',
    'Every job is different, so we don’t list fixed prices. Send your request on the Order page and you get a written quote in GH₵, usually within a few hours.',
    [order, book],
  ],
  [
    'How do payments work? Deposit, balance, instalments, stages',
    'You pay a 70% deposit before work starts and the 30% balance when you approve the preview. Larger projects can be paid 50/50 or in stages, and your quote will say so.',
    [{ label: 'Read our terms', href: '/terms/' }],
  ],
  [
    'How can I pay? Mobile Money, MoMo, card, bank transfer, Paystack',
    'Pay online with Mobile Money or card through Paystack, or by bank transfer to our CalBank account. The bank details are on your order page; use your order number as the reference.',
  ],
  [
    'How do I track or check my order status? My order page, preview or final files',
    'Your private order page shows every step. From it you can pay, approve the preview, ask for changes and download your final files. Its link is in the message we sent you; keep it private.',
  ],
  [
    'How long does it take? Delivery time, deadline, what if you are late?',
    'Your quote gives the delivery date, counted from when we receive your deposit and materials. If your first preview reaches you late, you get 10% off the balance.',
  ],
  [
    'How many revisions or changes are included?',
    'Each job includes two rounds of changes, unless your quote says otherwise. You ask for them on your order page.',
  ],
  [
    'Can I get a refund? Cancel order',
    'Cancel before work starts and we refund your deposit in full. After work starts, the deposit covers the work already done. If we can’t deliver what was agreed, we refund everything you paid for that job.',
    [{ label: 'Read our terms', href: '/terms/' }],
  ],
  [
    'Do you make promo videos, reels, adverts or animated logos?',
    'Yes. We make promo videos, social media reels and animated logos. Send your clips, photos and wording, approve a watermarked preview, then download the final files.',
    [{ label: 'Order a video', href: '/order/?service=video' }],
  ],
  [
    'Do you do logos, flyers, banners, posters and brand design?',
    'Yes. We design logos, flyers, banners, programmes, business cards and social media graphics. You can see our work in the design gallery.',
    [{ label: 'Order a design', href: '/order/?service=design' }, { label: 'Design gallery', href: '/design/' }],
  ],
  [
    'What is the free call? How do I book a call or meeting?',
    'It’s a free 30-minute call about your website, system or design. We listen, suggest a practical next step and send a written quote, with no pressure. Pick a time on the Book page.',
    [book],
  ],
  [
    'Where are you located?',
    `We’re based in ${site.city}, ${site.country}, and work with clients in Ghana and around the world, online and on site.`,
  ],
  [
    'What is your email, phone or WhatsApp number?',
    `Email ${site.email}, or call or WhatsApp ${site.phoneDisplay}.`,
    [whatsapp],
  ],
  ['How quickly do you reply?', 'We usually reply within a few hours. For the quickest answer, message us on WhatsApp.', [whatsapp]],
  [
    'Do I own my website, design, domain, code and data?',
    'Yes. Once the job is paid in full, you own what we made for you: the designs, videos, code, data and logins. Domains are registered in your name.',
  ],
  [
    'Will my website be fast on mobile data? Do you support mobile money and local taxes?',
    'Yes. We build websites that load quickly on mobile data and look right on phones. Our systems can take Mobile Money payments and handle local taxes.',
  ],
  [
    'Do you offer domains, hosting, email and website care?',
    'Yes. We register domains in your name, set up professional email, host your site and keep it updated and backed up. Hosting and care are paid in advance, monthly or yearly.',
  ],
  [
    'What is BuildSmart? What products do you have?',
    'BuildSmart is our own software for hardware stores and building material suppliers, and it’s in development. You can see all our work on the Products page.',
    [{ label: 'Our products', href: '/products/' }],
  ],
  [
    'What AgriTech work do you do for farmers?',
    'We build digital tools for farmers, cooperatives and agricultural programmes. JayTech9 itself grew out of agricultural field work.',
  ],
  [
    'Are you hiring? Do you have jobs or vacancies?',
    `There’s no open vacancy at the moment, but we’re always glad to hear from talented people. Send your CV to ${site.email} and we’ll keep it on file.`,
  ],
  [
    'How can I donate or support your community work?',
    'Thank you! You can give online with Mobile Money or card, or by bank transfer. Your gift funds digital tools and training for farmers, young people and community groups.',
    [{ label: 'Donate', href: '/donate/' }],
  ],
  [
    'Can I install the app? Download JayTech9 app on my phone',
    'Yes. Tap “Get the app” at the bottom of any page. On iPhone, tap Share, then “Add to Home Screen”. It opens like an app and uses very little data.',
  ],
  ['Who founded JayTech9?', `JayTech9 was founded by ${site.founder}.`],
];

export const helpHandoff = [
  { label: 'Chat on WhatsApp', href: site.whatsapp, new_tab: true },
  { label: 'Call us', href: `tel:${site.phone}` },
  { label: 'Send an enquiry', href: '/contact/' },
];

export const helpSuggestions = [
  'How do I order?',
  'How can I pay?',
  'What services do you offer?',
];
