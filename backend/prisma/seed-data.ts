/* Fictional demo content. No real client data is used anywhere. */
import { BlogStatus, LeadStatus, PageStatus, SectionType, SocialPlatform } from '@prisma/client';

const img = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  mountains: img('photo-1506905925346-21bda4d32df4'),
  valley: img('photo-1500530855697-b586d89ba3ee'),
  lake: img('photo-1501785888041-af3ef285b470'),
  forest: img('photo-1469474968028-56623f02e42e'),
  desert: img('photo-1509316785289-025f5b846b35'),
  dunes: img('photo-1473580044384-7ba9967e16a0'),
  resort: img('photo-1566073771259-6a8506099945'),
  pool: img('photo-1520250497591-112f2f40a3f4'),
  hotel: img('photo-1542314831-068cd1dbfeeb'),
  lobby: img('photo-1551882547-ff40c63fe5fa'),
  camp: img('photo-1504280390367-361c6d9f38f4'),
  dive: img('photo-1544551763-46a013bb70d5'),
  travel: img('photo-1476514525535-07fb3b4ae5f1'),
  city: img('photo-1512453979798-5ea266f8880c'),
};

export interface SeedSection {
  type: SectionType;
  name: string;
  content: Record<string, unknown>;
  isVisible?: boolean;
}
export interface SeedPage {
  title: string;
  slug: string;
  status: PageStatus;
  seo?: Record<string, unknown>;
  sections: SeedSection[];
}
export interface SeedBlog {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  cover: string;
  status: BlogStatus;
  daysAgo: number;
  author: 'admin' | 'editor' | 'superadmin';
  paragraphs: string[];
}
export interface SeedSite {
  name: string;
  slug: string;
  domain: string;
  primaryColor: string;
  apiKey: string;
  tagline: string;
  pages: SeedPage[];
  categories: string[];
  blogs: SeedBlog[];
  social: { platform: SocialPlatform; url: string }[];
  seo: { titleTemplate: string; defaultMetaDescription: string; defaultOgImage: string; canonicalBaseUrl: string };
}

const contactForm = {
  key: 'contact',
  name: 'Contact us',
  description: 'General enquiries from the contact page.',
  successMessage: 'Thank you! Our team will get back to you within one business day.',
  fields: [
    { name: 'name', label: 'Full name', type: 'text', required: true, placeholder: 'Your name', maxLength: 80 },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
    { name: 'phone', label: 'Phone', type: 'phone', required: false, placeholder: '+971 50 000 0000' },
    { name: 'topic', label: 'Topic', type: 'select', required: true, options: ['General', 'Bookings', 'Partnerships', 'Media'] },
    { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'How can we help?', minLength: 10, maxLength: 2000 },
    { name: 'consent', label: 'I agree to be contacted about my enquiry', type: 'checkbox', required: true },
  ],
};

export const TUAJA: SeedSite = {
  name: 'Tuaja Demo',
  slug: 'tuaja-demo',
  domain: 'tuaja-demo.example.com',
  primaryColor: '#7549AD',
  apiKey: 'pif_tuajadem_PublicDemoKey-TuajaDemo-2026',
  tagline: 'Eco and adventure retreats in fictional mountain valleys',
  seo: {
    titleTemplate: '%s | Tuaja Demo Retreats',
    defaultMetaDescription: 'Sustainable eco-resorts and guided adventures in breathtaking mountain valleys. A fictional demo website.',
    defaultOgImage: IMAGES.valley,
    canonicalBaseUrl: 'https://tuaja-demo.example.com',
  },
  social: [
    { platform: 'INSTAGRAM', url: 'https://instagram.com/tuaja.demo' },
    { platform: 'FACEBOOK', url: 'https://facebook.com/tuajademo' },
    { platform: 'X', url: 'https://x.com/tuajademo' },
    { platform: 'YOUTUBE', url: 'https://youtube.com/@tuajademo' },
    { platform: 'LINKEDIN', url: 'https://linkedin.com/company/tuaja-demo' },
  ],
  categories: ['Travel Tips', 'Sustainability', 'Adventure', 'Resort News'],
  pages: [
    {
      title: 'Home',
      slug: 'home',
      status: 'PUBLISHED',
      seo: { metaTitle: 'Eco retreats in the mountains', metaDescription: 'Stay in solar-powered lodges, hike ancient trails and reconnect with nature at Tuaja Demo Retreats.' },
      sections: [
        { type: 'HERO', name: 'Homepage hero', content: { heading: 'Where the mountains meet stillness', subheading: 'Solar-powered lodges, starry skies and guided trails — a fictional retreat built for this demo.', backgroundImage: IMAGES.mountains, ctaLabel: 'Explore resorts', ctaUrl: '/eco-resorts' } },
        { type: 'STATS', name: 'Key numbers', content: { heading: 'Tuaja Demo at a glance', items: [{ value: '3', label: 'Retreats' }, { value: '42', label: 'Eco lodges' }, { value: '120 km', label: 'Marked trails' }, { value: '4.9★', label: 'Guest rating' }] } },
        { type: 'FEATURE_CARDS', name: 'Why stay with us', content: { heading: 'Why guests choose Tuaja Demo', items: [{ icon: 'leaf', title: 'Low-impact stays', description: 'Every lodge runs on solar power and harvested rainwater.' }, { icon: 'compass', title: 'Guided adventures', description: 'Certified local guides lead hikes, climbs and night-sky walks.' }, { icon: 'utensils', title: 'Farm-to-table dining', description: 'Seasonal menus sourced from valley farms within 30 km.' }] } },
        { type: 'TESTIMONIALS', name: 'Guest reviews', content: { heading: 'What our guests say', items: [{ quote: 'The quietest, most restorative weekend we have had in years.', author: 'Maya R.', role: 'Weekend guest' }, { quote: 'Our guide made the summit hike unforgettable — and safe.', author: 'Daniel K.', role: 'Adventure package' }] } },
        { type: 'CTA', name: 'Booking CTA', content: { heading: 'Plan your escape', body: 'Tell us your dates and we will tailor the perfect stay.', buttonLabel: 'Send an enquiry', buttonUrl: '/contact' } },
      ],
    },
    {
      title: 'About Us',
      slug: 'about-us',
      status: 'PUBLISHED',
      sections: [
        { type: 'HERO', name: 'About hero', content: { heading: 'Our story', subheading: 'Founded on the idea that travel can restore the places it touches.', backgroundImage: IMAGES.forest, ctaLabel: '', ctaUrl: '' } },
        { type: 'IMAGE_TEXT', name: 'Mission', content: { heading: 'Hospitality with a lighter footprint', body: 'Tuaja Demo is a fictional collection of retreats used to showcase this admin panel. Its imaginary team partners with valley communities to protect trails, revive heritage crafts and welcome guests responsibly.', image: IMAGES.lake, imageAlt: 'Mountain lake at dawn', imagePosition: 'right' } },
        { type: 'RICH_TEXT', name: 'Values', content: { html: '<h2>Our values</h2><ul><li><strong>Respect</strong> for land and community</li><li><strong>Craft</strong> in every detail of a stay</li><li><strong>Curiosity</strong> that turns trips into stories</li></ul>' } },
      ],
    },
    {
      title: 'Eco Resorts',
      slug: 'eco-resorts',
      status: 'PUBLISHED',
      sections: [
        { type: 'HERO', name: 'Eco hero', content: { heading: 'Eco resorts', subheading: 'Lodges designed to disappear into the landscape.', backgroundImage: IMAGES.resort, ctaLabel: 'Check availability', ctaUrl: '/contact' } },
        { type: 'GALLERY', name: 'Lodge gallery', content: { heading: 'Inside the lodges', images: [{ url: IMAGES.hotel, alt: 'Lodge suite' }, { url: IMAGES.pool, alt: 'Infinity pool' }, { url: IMAGES.lobby, alt: 'Reception lounge' }] } },
        { type: 'FAQ', name: 'Eco FAQ', content: { heading: 'Good to know', items: [{ question: 'Is there Wi-Fi?', answer: 'Yes, in the main lodge. Rooms are intentionally offline.' }, { question: 'Are children welcome?', answer: 'Absolutely — we run family nature programmes every weekend.' }] } },
      ],
    },
    {
      title: 'Adventure Resorts',
      slug: 'adventure-resorts',
      status: 'PUBLISHED',
      sections: [
        { type: 'HERO', name: 'Adventure hero', content: { heading: 'Adventure resorts', subheading: 'Base camps for climbers, divers and trail runners.', backgroundImage: IMAGES.camp, ctaLabel: 'See packages', ctaUrl: '/contact' } },
        { type: 'FEATURE_CARDS', name: 'Activities', content: { heading: 'Activities', items: [{ icon: 'mountain', title: 'Via ferrata', description: 'Fixed-cable routes for every level.' }, { icon: 'waves', title: 'Reef diving', description: 'PADI-certified instructors and gear included.' }, { icon: 'tent', title: 'Desert camping', description: 'Overnight camps under the Milky Way.' }] } },
      ],
    },
    {
      title: 'Contact',
      slug: 'contact',
      status: 'PUBLISHED',
      sections: [
        { type: 'RICH_TEXT', name: 'Contact intro', content: { html: '<h2>Get in touch</h2><p>Questions about a stay, a partnership or a press visit? Send us a message and we will reply within one business day.</p>' } },
        { type: 'CTA', name: 'Call us', content: { heading: 'Prefer to talk?', body: 'Our reservations team is available every day from 9:00 to 18:00.', buttonLabel: 'Call reservations', buttonUrl: 'tel:+10000000000' } },
      ],
    },
    {
      title: 'Careers',
      slug: 'careers',
      status: 'DRAFT',
      sections: [{ type: 'RICH_TEXT', name: 'Careers draft', content: { html: '<h2>Join the team</h2><p>We are preparing this page. Check back soon.</p>' } }],
    },
  ],
  blogs: [
    { title: '10 things to pack for a mountain eco-retreat', excerpt: 'From layers to headlamps — a practical checklist for slow travel at altitude.', category: 'Travel Tips', tags: ['packing', 'mountains', 'checklist'], cover: IMAGES.mountains, status: 'PUBLISHED', daysAgo: 26, author: 'editor', paragraphs: ['Mountain weather changes quickly, so the golden rule is layers. A breathable base, an insulating mid-layer and a waterproof shell will cover almost every scenario.', 'Bring a refillable bottle — every Tuaja Demo lodge has filtered spring water stations — and a headlamp for evening star walks.', 'Finally, pack light. Our lodges provide robes, toiletries made from local herbs and a small library for rainy afternoons.'] },
    { title: 'How our lodges run entirely on sunshine', excerpt: 'A look behind the scenes at the solar micro-grid powering every room.', category: 'Sustainability', tags: ['solar', 'energy', 'green'], cover: IMAGES.valley, status: 'PUBLISHED', daysAgo: 19, author: 'admin', paragraphs: ['Each lodge roof carries photovoltaic panels feeding a shared battery bank sized for three cloudy days.', 'Smart controllers prioritise hot water and refrigeration, while guests see their own energy use on a small display in the room.', 'The result: zero diesel generators and a quieter valley for everyone.'] },
    { title: 'Your first via ferrata: what to expect', excerpt: 'Never clipped into a cable before? Here is how a guided climb works.', category: 'Adventure', tags: ['climbing', 'beginners', 'safety'], cover: IMAGES.camp, status: 'PUBLISHED', daysAgo: 12, author: 'editor', paragraphs: ['A via ferrata is a protected climbing route with steel cables, rungs and ladders. You are always attached to the cable with two lanyards.', 'Our guides start with a 30-minute briefing and a practice wall before the real route.', 'No previous experience is required — just a reasonable level of fitness and a head for heights.'] },
    { title: 'Stargazing season opens this month', excerpt: 'Dark skies, new telescopes and a resident astronomer for guided night walks.', category: 'Resort News', tags: ['stars', 'events'], cover: IMAGES.desert, status: 'PUBLISHED', daysAgo: 6, author: 'admin', paragraphs: ['With the dry season comes the clearest skies of the year. This season we installed two new observatory-grade telescopes.', 'Night walks run three times a week and are free for all resort guests.'] },
    { title: 'Five valley trails for every fitness level', excerpt: 'From a gentle lakeside loop to a full-day ridge traverse.', category: 'Travel Tips', tags: ['hiking', 'trails'], cover: IMAGES.lake, status: 'PUBLISHED', daysAgo: 3, author: 'superadmin', paragraphs: ['The Lakeside Loop (4 km) is flat and perfect for families.', 'The Ridge Traverse (18 km) rewards experienced hikers with panoramic views across three valleys.'] },
    { title: 'Reef diving packages are coming soon', excerpt: 'A sneak peek at our upcoming coastal adventure base.', category: 'Adventure', tags: ['diving', 'coming-soon'], cover: IMAGES.dive, status: 'SCHEDULED', daysAgo: -5, author: 'admin', paragraphs: ['Our coastal adventure base opens next season with guided reef dives and snorkelling safaris.'] },
    { title: 'Draft: winter menu tasting notes', excerpt: 'Internal draft for the winter seasonal menu announcement.', category: 'Resort News', tags: ['food'], cover: IMAGES.lobby, status: 'DRAFT', daysAgo: 1, author: 'editor', paragraphs: ['Working draft — not yet ready for publishing.'] },
  ],
};

export const DAN: SeedSite = {
  name: 'Dan Demo',
  slug: 'dan-demo',
  domain: 'dan-demo.example.com',
  primaryColor: '#824703',
  apiKey: 'pif_dandemo1_PublicDemoKey-DanDemo-2026xx',
  tagline: 'Heritage-inspired destinations and hospitality projects',
  seo: {
    titleTemplate: '%s — Dan Demo',
    defaultMetaDescription: 'Heritage-inspired destinations, oasis retreats and cultural experiences. A fictional demo website.',
    defaultOgImage: IMAGES.dunes,
    canonicalBaseUrl: 'https://dan-demo.example.com',
  },
  social: [
    { platform: 'INSTAGRAM', url: 'https://instagram.com/dan.demo' },
    { platform: 'LINKEDIN', url: 'https://linkedin.com/company/dan-demo' },
    { platform: 'TIKTOK', url: 'https://tiktok.com/@dandemo' },
    { platform: 'SNAPCHAT', url: 'https://snapchat.com/add/dandemo' },
  ],
  categories: ['Heritage', 'Projects', 'Culture', 'Press'],
  pages: [
    {
      title: 'Home',
      slug: 'home',
      status: 'PUBLISHED',
      seo: { metaTitle: 'Heritage destinations', metaDescription: 'Discover oasis retreats and cultural experiences shaped by heritage — a fictional Dan Demo website.' },
      sections: [
        { type: 'HERO', name: 'Homepage hero', content: { heading: 'Rooted in heritage, built for tomorrow', subheading: 'Oasis retreats, adventure parks and cultural districts — a fictional portfolio for this demo.', backgroundImage: IMAGES.dunes, ctaLabel: 'Our projects', ctaUrl: '/our-projects' } },
        { type: 'STATS', name: 'Portfolio stats', content: { heading: 'Our portfolio', items: [{ value: '6', label: 'Destinations' }, { value: '1,200', label: 'Keys planned' }, { value: '35%', label: 'Local hiring' }] } },
        { type: 'IMAGE_TEXT', name: 'Oasis intro', content: { heading: 'The oasis reimagined', body: 'Palm groves, spring-fed pools and mud-brick courtyards inspire every Dan Demo destination.', image: IMAGES.resort, imageAlt: 'Oasis retreat pool', imagePosition: 'left' } },
        { type: 'CTA', name: 'Partner CTA', content: { heading: 'Partner with us', body: 'We collaborate with operators, artisans and investors.', buttonLabel: 'Start a conversation', buttonUrl: '/contact-us' } },
      ],
    },
    {
      title: 'About Us',
      slug: 'about-us',
      status: 'PUBLISHED',
      sections: [
        { type: 'RICH_TEXT', name: 'About text', content: { html: '<h2>Who we are</h2><p>Dan Demo is a fictional destination developer created to demonstrate multi-tenancy in PIF Admin Panel. All names, places and figures are invented.</p>' } },
        { type: 'FEATURE_CARDS', name: 'Pillars', content: { heading: 'Our pillars', items: [{ icon: 'landmark', title: 'Heritage', description: 'Architecture that honours local tradition.' }, { icon: 'users', title: 'Community', description: 'Jobs and training for nearby towns.' }, { icon: 'sprout', title: 'Nature', description: 'Restoring palm groves and water channels.' }] } },
      ],
    },
    {
      title: 'Our Projects',
      slug: 'our-projects',
      status: 'PUBLISHED',
      sections: [
        { type: 'GALLERY', name: 'Projects gallery', content: { heading: 'Featured projects', images: [{ url: IMAGES.pool, alt: 'Oasis Springs resort' }, { url: IMAGES.desert, alt: 'Dune Camp' }, { url: IMAGES.city, alt: 'Cultural district' }] } },
        { type: 'FAQ', name: 'Projects FAQ', content: { heading: 'Project FAQs', items: [{ question: 'When does Oasis Springs open?', answer: 'The fictional opening date is the third quarter of next year.' }] } },
      ],
    },
    {
      title: 'Media Center',
      slug: 'media-center',
      status: 'PUBLISHED',
      sections: [{ type: 'RICH_TEXT', name: 'Press intro', content: { html: '<h2>Media center</h2><p>Press releases, brand assets and media contacts.</p>' } }],
    },
    {
      title: 'Contact Us',
      slug: 'contact-us',
      status: 'PUBLISHED',
      sections: [{ type: 'CTA', name: 'Contact CTA', content: { heading: 'Talk to our team', body: 'Partnerships, careers and media enquiries.', buttonLabel: 'Email us', buttonUrl: 'mailto:hello@dan-demo.example.com' } }],
    },
  ],
  blogs: [
    { title: 'Restoring a 200-year-old water channel', excerpt: 'How traditional falaj engineering inspired our landscape plan.', category: 'Heritage', tags: ['water', 'heritage'], cover: IMAGES.forest, status: 'PUBLISHED', daysAgo: 24, author: 'admin', paragraphs: ['Traditional water channels carried spring water across entire valleys using only gravity.', 'Our fictional landscape team restored a channel section to irrigate a new palm grove.'] },
    { title: 'Oasis Springs: first look at the master plan', excerpt: 'Courtyards, shaded walkways and spring-fed pools.', category: 'Projects', tags: ['oasis', 'architecture'], cover: IMAGES.pool, status: 'PUBLISHED', daysAgo: 15, author: 'superadmin', paragraphs: ['The master plan places guest villas around shaded courtyards to keep temperatures comfortable without heavy air-conditioning.'] },
    { title: 'Artisan residency programme launches', excerpt: 'Twelve craftspeople join our first residency.', category: 'Culture', tags: ['crafts', 'community'], cover: IMAGES.lobby, status: 'PUBLISHED', daysAgo: 8, author: 'admin', paragraphs: ['Weavers, potters and metalworkers will share studio space and teach workshops for guests.'] },
    { title: 'Dan Demo named a "destination to watch"', excerpt: 'A fictional travel magazine highlights our approach.', category: 'Press', tags: ['press', 'awards'], cover: IMAGES.travel, status: 'PUBLISHED', daysAgo: 2, author: 'admin', paragraphs: ['This fictional recognition celebrates heritage-led design and community hiring.'] },
    { title: 'Draft: Dune Camp opening event', excerpt: 'Run-of-show for the opening weekend.', category: 'Projects', tags: ['events'], cover: IMAGES.desert, status: 'DRAFT', daysAgo: 1, author: 'admin', paragraphs: ['Internal planning draft.'] },
  ],
};

export const FORMS = [
  contactForm,
  {
    key: 'booking-enquiry',
    name: 'Booking enquiry',
    description: 'Stay requests from resort pages.',
    successMessage: 'Thanks! A reservations specialist will contact you shortly with availability.',
    fields: [
      { name: 'name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'phone', required: true },
      { name: 'guests', label: 'Guests', type: 'radio', required: true, options: ['1', '2', '3-4', '5+'] },
      { name: 'interests', label: 'Interests', type: 'checkbox', required: false, options: ['Hiking', 'Spa', 'Dining', 'Stargazing'] },
      { name: 'notes', label: 'Anything else?', type: 'textarea', required: false, maxLength: 1000 },
    ],
  },
];

export const LEAD_PEOPLE = [
  ['Aisha Rahman', 'aisha.rahman'], ['Ben Carter', 'ben.carter'], ['Chloe Martin', 'chloe.m'], ['Daniyal Shah', 'daniyal.shah'],
  ['Elena Petrova', 'elena.p'], ['Faisal Qureshi', 'faisal.q'], ['Grace Liu', 'grace.liu'], ['Hassan Ali', 'hassan.ali'],
  ['Isabel Gomez', 'isabel.g'], ['James Wright', 'j.wright'], ['Kiran Patel', 'kiran.patel'], ['Layla Mansour', 'layla.m'],
  ['Mateo Rossi', 'mateo.rossi'], ['Noor Hamdan', 'noor.h'], ['Oliver Brown', 'oliver.b'], ['Priya Nair', 'priya.nair'],
  ['Rami Aziz', 'rami.aziz'], ['Sofia Costa', 'sofia.c'], ['Tariq Hussain', 'tariq.h'], ['Uma Iyer', 'uma.iyer'],
  ['Victor Lemaire', 'victor.l'], ['Wen Zhao', 'wen.zhao'], ['Yara Khalil', 'yara.k'], ['Zain Malik', 'zain.malik'],
  ['Amira Said', 'amira.said'], ['Lucas Meyer', 'lucas.meyer'], ['Hiba Odeh', 'hiba.odeh'], ['Sami Rizk', 'sami.rizk'],
];

export const LEAD_MESSAGES = [
  'We would like to book two nights for a family of four next month. Is there availability?',
  'Do you offer corporate retreat packages for around 20 people?',
  'I am a travel writer and would love to visit for a feature story.',
  'Can you share pricing for the guided summit hike?',
  'Interested in a partnership for our tour company — who should I speak to?',
  'Is the resort accessible for wheelchair users?',
  'Looking for a honeymoon package in early spring.',
  'Do you have vegetarian dining options?',
];

export const LEAD_STATUS_POOL: LeadStatus[] = ['NEW', 'NEW', 'NEW', 'CONTACTED', 'CONTACTED', 'QUALIFIED', 'QUALIFIED', 'WON', 'LOST'];
