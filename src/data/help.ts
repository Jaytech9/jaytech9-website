import { site } from './site';

// What the help assistant knows. Each row is a question and its answer.
// Only add facts that are also on the website, so the assistant never promises something we don't.
export const helpFaq: [string, string][] = [
  [
    'What services do you offer? Do you build websites, web apps or systems?',
    'We build websites and web apps, business systems, and data dashboards. We also do AgriTech and sustainability tools, brand and print design, and domains, hosting and care.',
  ],
  [
    'How much does a website or system cost?',
    'Every project is different, so we don’t list prices. After a free call, you get a written quote in your currency with the scope, timeline and payment stages spelled out.',
  ],
  [
    'How do payments work? Can I pay in stages or instalments?',
    'Larger projects are usually paid in stages: a deposit to start, a payment at the halfway review, and the balance at launch. Hosting and care are billed yearly.',
  ],
  [
    'How long does a project take?',
    'It depends on the project. Your written quote spells out the timeline, and if anything will take longer, you hear it from us first.',
  ],
  [
    'What is the free call? How do I start a project or book a call?',
    'Start with a free 30-minute call. We’ll listen, suggest what would help, and send a written quote. You can book it from our contact page.',
  ],
  [
    'Where are you located?',
    `We’re based in ${site.city}, ${site.country}, and work with clients in Ghana and around the world, online and on site.`,
  ],
  [
    'What is your email, phone or WhatsApp number?',
    `Email ${site.email}, or call or WhatsApp ${site.phoneDisplay}.`,
  ],
  ['How quickly do you reply?', 'We reply within one working day, usually sooner.'],
  [
    'Do I own my website, domain, code and data?',
    'Yes. Your domain is registered in your name, your data stays yours, and you receive the code and logins at handover.',
  ],
  [
    'Do you support mobile money and local taxes?',
    'The websites and systems we build can use local payment methods such as mobile money, with local taxes built in.',
  ],
  [
    'Do you do logos, flyers, banners and brand design?',
    'Yes. We design logos, flyers, banners and social media graphics that look professional.',
  ],
  [
    'Do you offer domains, hosting, email and website care?',
    'Yes. We set up your website, email and domain properly and keep them running. Hosting and care are billed yearly.',
  ],
  [
    'What is BuildSmart? What products do you have?',
    'BuildSmart is our own software for hardware stores and building material suppliers, and it’s in development. You can see all our work on the Products page.',
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
    'Thank you! Online giving opens soon. If you’d like to give now, message us on WhatsApp or email us and we’ll share the details.',
  ],
  ['Who founded JayTech9?', `JayTech9 was founded by ${site.founder}.`],
];

export const helpHandoff = [
  { label: 'Chat on WhatsApp', href: site.whatsapp, new_tab: true },
  { label: 'Call us', href: `tel:${site.phone}` },
  { label: 'Send an enquiry', href: '/contact/' },
];

export const helpSuggestions = [
  'What services do you offer?',
  'How much does a website cost?',
  'Where are you located?',
];
