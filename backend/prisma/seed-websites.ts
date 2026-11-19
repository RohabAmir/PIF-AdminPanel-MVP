/**
 * Website content for the two demo tenants. Mirrors the structure, copy and imagery of
 * tuaja.com and dancompany.sa so the bundled website replicas (/websites/tuaja and
 * /websites/dan in the admin app) look like the real sites while being fully CMS-driven.
 * Images live in frontend/public/websites/<site>/ and are referenced by site-relative path.
 */
import type { SeedBlog, SeedPage, SeedSite } from './seed-data';

const T = (f: string) => `/websites/tuaja/${f}`;
const D = (f: string) => `/websites/dan/${f}`;

const SOCIAL: SeedSite['social'] = [
  { platform: 'YOUTUBE', url: 'https://www.youtube.com/@DanCompanySA' },
  { platform: 'X', url: 'https://x.com/DanCompanySA' },
  { platform: 'INSTAGRAM', url: 'https://www.instagram.com/dancompanysa/' },
  { platform: 'LINKEDIN', url: 'https://www.linkedin.com/company/dan-company-sa/' },
];

const RESORT_COLORS = { farm: '#67B93F', eco: '#62BFAB', adventure: '#9D405F' };

const TUAJA_INTRO =
  'Tawaja Luxury Resorts in Al-Ahsa is a haven of enchanting experiences that blends the fragrance of the past with the renewal of the present. Nestled within the world’s largest palm oasis, a UNESCO World Heritage Site in the heart of Al-Ahsa, the resorts awaken the senses, where the sands meet the greenery of palm trees and flowing water to create a world of adventure, exploration, and relaxation.\n\nDrawing inspiration from the authentic heritage of Al-Ahsa, Tawaja Resorts redefine the concept of luxury in unprecedented ways, celebrating heritage and culture through architectural designs and unique experiences.';

const TUAJA_STORY =
  'A lady who was passionate about the wonders of nature, from observing things all the way to mindful, spiritual exploration. Lady Tuaja visited Al Madinah, and from her passion for little things, she collected date seeds and made a rosary. With time, the dates fell from this rosary and grew to thousands of palm trees, producing the most delicious dates. We draw inspiration from Tuaja’s story to create new experiences in hospitality in Saudi Arabia, embodying the generous nature of our land.';

const TUAJA_COMMUNITY =
  'At Tuaja Resorts, local communities are not just a backdrop for our experiences; they are the heartbeat of everything we offer. Drawing profound inspiration from the rich heritage of each city we are in, we meticulously weave the local essence into every facet of the Tuaja Experience. Our resorts embrace and celebrate local communities by integrating their unique culture and heritage into our architectural designs and guest experiences.';

const RESORTS = {
  farm: {
    title: 'Premium Farm Resorts',
    short:
      'With agricultural lands that reach the horizon, Tuaja Premium Farm Resorts welcomes you to discover unseen travesties and untold tales at the home of agritourism.',
  },
  eco: {
    title: 'Eco Resorts',
    short:
      'Where you will feel your body unwinding at our spas and connect with your mind at our special yoga and meditation sessions, Tuaja Eco Resorts invites you to unwind and reconnect with your inner self and re-explore all nature has to offer.',
  },
  adventure: {
    title: 'Adventure Resorts',
    short:
      'Where you feel the rocks beneath you as you climb your way to the top and watch stars sparkling in the dark, wonderous sky, Tuaja Adventure Resorts will be packed with delightful experiences that suit your taste.',
  },
};

const GALLERY = [1, 2, 3, 4, 5, 6, 7].map((i) => ({
  url: T(`gallery-${i}.jpg`),
  alt: `Tuaja experience ${i}`,
}));

function resortPage(
  key: keyof typeof RESORTS,
  slug: string,
  hero: string,
  body: string,
  gallery: number[],
): SeedPage {
  const r = RESORTS[key];
  return {
    title: `Al-Ahsa ${r.title.replace(/s$/, '')}`,
    slug,
    parent: 'experiences',
    status: 'PUBLISHED',
    seo: { metaTitle: `Al-Ahsa ${r.title.replace(/s$/, '')}`, metaDescription: r.short },
    sections: [
      {
        type: 'HERO',
        name: 'Resort banner',
        content: {
          heading: `Al-Ahsa ${r.title.replace(/s$/, '')}`,
          subheading: 'Tuaja Luxury Resorts',
          backgroundImage: T(hero),
          buttons: [{ label: 'Enquire now', url: '#booking-enquiry', color: RESORT_COLORS[key] }],
        },
      },
      {
        type: 'IMAGE_TEXT',
        name: 'Resort story',
        content: {
          heading: r.title,
          body: `${r.short}\n\n${body}`,
          image: T(`exp-${key === 'farm' ? 1 : key === 'eco' ? 2 : 3}.jpg`),
          imageAlt: r.title,
          imagePosition: 'right',
          background: 'light',
        },
      },
      {
        type: 'GALLERY',
        name: 'Resort gallery',
        content: { heading: 'Moments', layout: 'grid', images: gallery.map((i) => GALLERY[i - 1]) },
      },
      {
        type: 'FORM',
        name: 'Booking enquiry',
        content: {
          heading: 'Plan your stay',
          body: 'Tell us when you would like to visit and our reservations team will be in touch.',
          formKey: 'booking-enquiry',
          background: 'accent',
        },
      },
    ],
  };
}

// ───────────────────────────── Press / news (published on dancompany.sa) ─────────────────────────────

const NEWS = {
  hail: {
    title:
      'Under the Patronage of the Governor of Hail, Dan Company and Hail Chamber Sign Strategic Partnership Agreement to Advance Tourism Development and Investment',
    date: '2026-04-29',
    paragraphs: [
      'Under the patronage of His Royal Highness Prince Abdulaziz bin Saad bin Abdulaziz, Governor of Hail Region, the Hail Chamber and Dan Company, a PIF company, signed a strategic partnership agreement today at the Emirate headquarters, alongside the signing of several memoranda of understanding between the company and a number of investors in the region.',
      'The agreement aims for Dan Company to serve as a main sponsor of the Chamber’s events and programs, contributing to the stimulation of economic activity and the enhancement of a high-quality events ecosystem in the region.',
      'Dan Company CEO, Abdulrahman Abaalkhail, emphasized that the agreement reflects the company’s commitment to expanding its developmental impact, noting that its strategic direction focuses on maximizing the natural assets of the Hail region and transforming them into tourism investment opportunities that enhance quality of life and align with the objectives of Saudi Vision 2030.',
      'He further stated that the company is working to develop a sustainable model for rural and eco-tourism by empowering local communities and supporting entrepreneurs and high-potential ventures, thereby contributing to sustainable economic growth.',
    ],
  },
  ahsaMeeting: {
    title: 'Dan Company CEO and Governor of Al-Ahsa meet',
    date: '2024-03-04',
    paragraphs: [
      'The meeting included a discussion on ways to develop the tourism sector by investing in the rich agricultural and natural diversity in the Kingdom. An agri-resort, an eco-resort, and an adventure resort will be the first properties to launch as Dan Company’s first three resorts in Al-Ahsa.',
      'His Royal Highness Prince Saud bin Talal, Governor of Al-Ahsa and Abdulrahman Abaalkhail, CEO of Dan Company, a Public Investment Fund (PIF) company specializing in agritourism, ecotourism, and adventure tourism met to discuss the company’s plans to create a premium farm-based tourism destination in the heart of the Al-Ahsa Governate, a significant agricultural region in Saudi Arabia’s Eastern Province and UNESCO World Heritage site.',
      'The meeting comes after Dan Company recently announced the signing of a partnership with Hilton to operate Dan Company’s first projects, represented by three resorts in Al-Ahsa Governorate that attract visitors who are looking to connect with nature.',
      'By 2030, Dan is anticipated to contribute approximately $1.6 billion (SR6 billion) to Saudi Arabia’s non-oil GDP as it expands its footprint.',
    ],
  },
  hilton: {
    title:
      'Dan Company and Hilton sign agreement to operate Dan’s first three resorts at unique farm-based tourism destination in Al-Ahsa',
    date: '2024-03-03',
    paragraphs: [
      'An agri-resort, an eco-resort, and an adventure resort will be the first properties to launch as Dan Company’s first three resorts in Al-Ahsa: Al-Ahsa Agritourism Resort, LXR Hotels & Resorts; Al-Ahsa Eco Resort, Curio Collection by Hilton; and Al-Ahsa Adventure Resort, Curio Collection by Hilton.',
      'The resorts will be in Al-Ahsa, home to Al-Ahsa Oasis — the largest date palm oasis in the world. With lush surroundings and homegrown farms at its doorstep, the 1.8 million square meter master development aims to create a premium farm-based tourism destination in the heart of Al-Ahsa.',
      'Each resort will have a distinct offering, from luxury at the LXR Hotels & Resorts Agritourism Resort, wellness and wellbeing at the Curio Collection by Hilton Eco Resort, and outdoor adventure at the Curio Collection by Hilton Adventure Resort. A central activation area will include a nature garden, an amphitheater, dining and retail options and a farmers’ market.',
      'The resorts will be easily accessible via main roads, with Riyadh, Dammam, Khobar, Jubail, Bahrain, and Qatar within a one-and-a-half to three-and-a-half-hour drive away.',
    ],
  },
  tdf: {
    title: 'Tourism Development Fund signs MoU with Dan Company',
    date: '2024-02-28',
    paragraphs: [
      'The Tourism Development Fund has signed a memorandum of understanding with Dan Company, one of the Public Investment Fund companies specializing in agri, eco, and adventure tourism, with the aim of supporting investments in the agritourism sector in the Kingdom, in line with the objectives of the National Tourism Strategy.',
      'The agreement was signed by the CEO of the Tourism Development Fund, Qusai bin Abdullah Al-Fakhri, and the CEO of Dan Company, Abdulrahman Abaalkhail, within the framework of the Fund’s goal to support the private sector by providing financing programs for farm owners.',
      '“The agreement with the Tourism Development Fund aims to contribute to the development of a sustainable local tourism system by providing financing solutions to our partners, farm owners, to enable them to diversify their activities and build prosperous businesses,” said Abdulrahman Abaalkhail.',
    ],
  },
  forum: {
    title:
      'Dan Company concludes participation in PIF Private Sector Forum with signing of Memorandum of Understanding with Abdulmohsen bin Abdulaziz AlJabr Trading Company',
    date: '2024-02-08',
    paragraphs: [
      'Dan Company announced the signing of a Memorandum of Understanding covering several potential areas of cooperation, including management and operation of lodges and farm stays, during its participation in the second edition of the PIF Private Sector Forum.',
      'Dan Company hosted a demand signaling workshop attended by 250 people, where CEO Abdulrahman Abaalkhail discussed the company’s aim to establish a world-class tourism ecosystem that promotes sustainable, social, and economic growth.',
      'Established in 2022, Dan Company will have a rich mix of assets and experiences that includes luxury resorts, lodges, and farm stays, including both daytime hospitality experiences and overnight stays.',
    ],
  },
  nakhla: {
    title:
      'Dan Company: Fostering Cultural Authenticity, Sustainability, and Community Empowerment',
    date: '2023-12-11',
    paragraphs: [
      'Dan Company is synonymous with cultural authenticity, sustainability, and community empowerment. Benefiting local communities is at the heart of our mandate and we are committed to fostering a sense of community pride within the areas in which we operate.',
      'We were honoured to support the Nakhla racing team as a Diamond Sponsor of the F1 in Schools Competition, a globally recognized educational program that introduces students to STEM subjects by challenging them to design, build, and race miniature F1 cars.',
      'Ten talented students aged 15 and 16 from Al Ahsa made up the Nakhla racing team that took part in the national heats of the competition held at the King Abdulaziz Center for World Culture (Ithra).',
    ],
  },
  launch: {
    title: 'PIF Launches Dan Company to Develop Agritourism and Ecotourism Across the Kingdom',
    date: '2023-12-11',
    paragraphs: [
      'The Public Investment Fund (PIF) has announced the establishment of “Dan Company,” specializing in agritourism and ecotourism. The company plans to develop unique tourism projects around cities across Saudi Arabia with attractive natural and farmed landscapes.',
      'Dan’s first project will be located in Al-Ahsa region and will cover 1.8 million square meters. It will feature an eco-resort, an agri-resort and an adventure resort, each catering for a niche market in the tourism sector.',
      'The company is also expected to contribute approximately $1.6 billion (SAR 6 billion) to Saudi Arabia’s non-oil GDP by 2030, as it expands to other locations.',
    ],
  },
};

const post = (
  n: (typeof NEWS)[keyof typeof NEWS],
  cover: string,
  category: string,
  extra: Partial<SeedBlog> = {},
): SeedBlog => ({
  title: n.title,
  excerpt: n.paragraphs[0].slice(0, 280),
  category,
  tags: ['Dan Company', 'Al-Ahsa'],
  cover,
  status: 'PUBLISHED',
  daysAgo: 0,
  date: n.date,
  author: 'admin',
  paragraphs: n.paragraphs,
  ...extra,
});

// ───────────────────────────── Tuaja ─────────────────────────────

export const TUAJA: SeedSite = {
  name: 'Tuaja Demo',
  slug: 'tuaja-demo',
  domain: 'tuaja-demo.example.com',
  primaryColor: '#C8985A',
  apiKey: 'pif_tuajadem_PublicDemoKey-TuajaDemo-2026',
  tagline: 'Tuaja Luxury Resorts — Al-Ahsa',
  seo: {
    titleTemplate: '%s | Tuaja Luxury Resorts',
    defaultMetaDescription:
      'Tuaja Luxury Resorts in Al-Ahsa: premium farm, eco and adventure resorts in the world’s largest palm oasis.',
    defaultOgImage: T('intro-palms.jpg'),
    canonicalBaseUrl: 'https://tuaja.com/en',
  },
  social: SOCIAL,
  categories: ['Press', 'Gallery'],
  media: [
    ...GALLERY.map((g, i) => ({ url: g.url, filename: `gallery-${i + 1}.jpg`, alt: g.alt })),
    { url: T('intro-palms.jpg'), filename: 'intro-palms.jpg', alt: 'Al-Ahsa palm oasis' },
    { url: T('exp-1.jpg'), filename: 'exp-1.jpg', alt: 'Premium farm resort' },
    { url: T('exp-2.jpg'), filename: 'exp-2.jpg', alt: 'Eco resort' },
    { url: T('exp-3.jpg'), filename: 'exp-3.jpg', alt: 'Adventure resort' },
    { url: T('story.webp'), filename: 'story.webp', alt: 'Hands holding dates' },
    { url: T('community.webp'), filename: 'community.webp', alt: 'Our local community' },
  ],
  pages: [
    {
      title: 'Home',
      slug: 'home',
      status: 'PUBLISHED',
      seo: {
        metaTitle: 'Experience nature. Heartfully.',
        metaDescription:
          'Tuaja Luxury Resorts in Al-Ahsa — premium farm, eco and adventure resorts nestled within the world’s largest palm oasis.',
      },
      sections: [
        {
          type: 'HERO',
          name: 'Hero video',
          content: {
            heading: 'Experience nature. Heartfully.',
            subheading: '',
            backgroundVideo: T('hero.mp4'),
            backgroundImage: T('hero-poster.jpg'),
          },
        },
        {
          type: 'HERO',
          name: 'Al-Ahsa introduction',
          content: {
            heading: 'Tuaja Luxury Resort,',
            subheading: 'Al Ahsa',
            body: TUAJA_INTRO,
            backgroundImage: T('intro-palms.jpg'),
            buttons: [
              {
                label: 'Al-Ahsa Premium Farm Resort',
                url: '/premium-farm-resort',
                color: RESORT_COLORS.farm,
              },
              { label: 'Al-Ahsa Eco Resort', url: '/eco-resort', color: RESORT_COLORS.eco },
              {
                label: 'Al-Ahsa Adventure Resort',
                url: '/adventure-resort',
                color: RESORT_COLORS.adventure,
              },
            ],
          },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Resort experiences',
          content: {
            heading: 'Tuaja Resorts Experiences',
            items: [
              {
                title: 'Premium Farm Resorts',
                description: RESORTS.farm.short,
                image: T('exp-1.jpg'),
                icon: T('lotus-3.svg'),
                linkLabel: 'Read more',
                linkUrl: '/premium-farm-resort',
                color: RESORT_COLORS.farm,
              },
              {
                title: 'Eco Resorts',
                description: RESORTS.eco.short,
                image: T('exp-2.jpg'),
                icon: T('lotus-2.svg'),
                linkLabel: 'Read more',
                linkUrl: '/eco-resort',
                color: RESORT_COLORS.eco,
              },
              {
                title: 'Adventure Resorts',
                description: RESORTS.adventure.short,
                image: T('exp-3.jpg'),
                icon: T('lotus-1.svg'),
                linkLabel: 'Read more',
                linkUrl: '/adventure-resort',
                color: RESORT_COLORS.adventure,
              },
            ],
          },
        },
        {
          type: 'IMAGE_TEXT',
          name: 'The story of Tuaja',
          content: {
            heading: 'The Story of Tuaja',
            eyebrow: 'Let us introduce you to a long-forgotten tale about Tuaja,',
            body: TUAJA_STORY,
            image: T('story.webp'),
            imageAlt: 'Hands holding fresh Al-Ahsa dates',
            imagePosition: 'right',
            ctaLabel: 'Read more',
            ctaUrl: '/about-us',
            background: 'dark',
          },
        },
        {
          type: 'IMAGE_TEXT',
          name: 'Our local community',
          content: {
            heading: 'Our Local Community',
            body: TUAJA_COMMUNITY,
            image: T('community.webp'),
            imageAlt: 'A child holding a basket of berries',
            imagePosition: 'left',
            ctaLabel: 'Read more',
            ctaUrl: '/our-philosophy',
            background: 'light',
          },
        },
        {
          type: 'GALLERY',
          name: 'Experience nature gallery',
          content: {
            heading: 'Experience Nature. Heartfully.',
            layout: 'collage',
            images: GALLERY,
          },
        },
        {
          type: 'LATEST_POSTS',
          name: 'Press center',
          content: {
            heading: 'Press Center',
            count: 6,
            category: '',
            linkLabel: 'View all',
            linkUrl: '/media-center',
          },
        },
      ],
    },
    {
      title: 'The Brand',
      slug: 'the-brand',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Brand banner',
          content: {
            heading: 'The Brand',
            subheading: 'Inspired by the generous nature of our land',
            backgroundImage: T('gallery-7.jpg'),
          },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Brand pages',
          content: {
            heading: '',
            items: [
              {
                title: 'About Us',
                description: 'The story behind Tuaja Luxury Resorts and the lady who inspired it.',
                image: T('gallery-1.jpg'),
                linkLabel: 'Read more',
                linkUrl: '/about-us',
                color: '#C8985A',
              },
              {
                title: 'Our Philosophy',
                description: 'Local communities are the heartbeat of every Tuaja experience.',
                image: T('gallery-4.jpg'),
                linkLabel: 'Read more',
                linkUrl: '/our-philosophy',
                color: '#C8985A',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'About Us',
      slug: 'about-us',
      parent: 'the-brand',
      status: 'PUBLISHED',
      seo: { metaTitle: 'About Us', metaDescription: TUAJA_STORY.slice(0, 155) },
      sections: [
        {
          type: 'HERO',
          name: 'About banner',
          content: {
            heading: 'About Us',
            subheading: 'A haven of enchanting experiences in Al-Ahsa',
            backgroundImage: T('gallery-2.jpg'),
          },
        },
        {
          type: 'IMAGE_TEXT',
          name: 'The story of Tuaja',
          content: {
            heading: 'The Story of Tuaja',
            eyebrow: 'Let us introduce you to a long-forgotten tale about Tuaja,',
            body: TUAJA_STORY,
            image: T('story.webp'),
            imageAlt: 'Hands holding fresh Al-Ahsa dates',
            imagePosition: 'right',
            background: 'dark',
          },
        },
        {
          type: 'RICH_TEXT',
          name: 'Who we are',
          content: {
            html: `<h2>Who we are</h2><p>${TUAJA_INTRO.replace('\n\n', '</p><p>')}</p><p>With a vision to create rich and unforgettable experiences that connect guests to the Kingdom’s stunning natural landscapes, culture, and hospitality, Tuaja Luxury Resorts is an exquisite creation under the patronage of Dan Company, a PIF company.</p>`,
          },
        },
      ],
    },
    {
      title: 'Our Philosophy',
      slug: 'our-philosophy',
      parent: 'the-brand',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Philosophy banner',
          content: {
            heading: 'Our Philosophy',
            subheading: 'Experience nature. Heartfully.',
            backgroundImage: T('gallery-4.jpg'),
          },
        },
        {
          type: 'IMAGE_TEXT',
          name: 'Our local community',
          content: {
            heading: 'Our Local Community',
            body: TUAJA_COMMUNITY,
            image: T('community.webp'),
            imageAlt: 'A child holding a basket of berries',
            imagePosition: 'left',
            background: 'light',
          },
        },
        {
          type: 'FEATURE_CARDS',
          name: 'Our pillars',
          content: {
            heading: 'What guides us',
            items: [
              {
                icon: 'leaf',
                title: 'Nature',
                description: 'Where the sands meet the greenery of palm trees and flowing water.',
              },
              {
                icon: 'landmark',
                title: 'Heritage',
                description:
                  'Architecture and experiences inspired by the authentic heritage of Al-Ahsa.',
              },
              {
                icon: 'users',
                title: 'Community',
                description: 'Local communities are the heartbeat of everything we offer.',
              },
            ],
          },
        },
      ],
    },
    {
      title: 'Experiences',
      slug: 'experiences',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Experiences banner',
          content: {
            heading: 'Tuaja Resorts Experiences',
            subheading: 'Premium farm, eco and adventure resorts in Al-Ahsa',
            backgroundImage: T('gallery-3.jpg'),
          },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Resorts',
          content: {
            heading: '',
            items: (['farm', 'eco', 'adventure'] as const).map((k, i) => ({
              title: RESORTS[k].title,
              description: RESORTS[k].short,
              image: T(`exp-${i + 1}.jpg`),
              icon: T(`lotus-${3 - i}.svg`),
              linkLabel: 'Read more',
              linkUrl: ['/premium-farm-resort', '/eco-resort', '/adventure-resort'][i],
              color: RESORT_COLORS[k],
            })),
          },
        },
      ],
    },
    resortPage(
      'farm',
      'premium-farm-resort',
      'gallery-5.jpg',
      'Celebrating the unique produce of Al-Ahsa — famous for its rice and dates — the resort connects guests hands-on with earth and nature through seasonal farming, harvesting and cooking farm-sourced products, emphasizing the field-to-plate experience.',
      [5, 6, 7],
    ),
    resortPage(
      'eco',
      'eco-resort',
      'gallery-4.jpg',
      'Built with local materials with low carbon emissions and preserving the region’s flora and fauna, the eco resort is a place for wellness, wellbeing and mindful reconnection with nature.',
      [4, 6, 1],
    ),
    resortPage(
      'adventure',
      'adventure-resort',
      'gallery-1.jpg',
      'From horse riding and star-gazing to climbing the rocky hills nearby, the adventure resort offers compelling and environmentally-friendly experiences for every taste.',
      [1, 2, 3],
    ),
    {
      title: 'Media Center',
      slug: 'media-center',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Media banner',
          content: {
            heading: 'Media Center',
            subheading: 'Press releases and news',
            backgroundImage: T('gallery-2.jpg'),
          },
        },
        {
          type: 'LATEST_POSTS',
          name: 'Press releases',
          content: { heading: 'Press Center', count: 12, category: '', linkLabel: '', linkUrl: '' },
        },
        {
          type: 'GALLERY',
          name: 'Gallery',
          content: { heading: 'Gallery', layout: 'grid', images: GALLERY },
        },
      ],
    },
    {
      title: 'Contact Us',
      slug: 'contact-us',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Contact banner',
          content: {
            heading: 'Contact Us',
            subheading: 'We would love to hear from you',
            backgroundImage: T('intro-palms.jpg'),
          },
        },
        {
          type: 'FORM',
          name: 'Contact form',
          content: {
            heading: 'Connect With Us',
            body: 'Questions about our resorts, partnerships or media enquiries? Send us a message.',
            formKey: 'contact',
            background: 'light',
          },
        },
      ],
    },
    {
      title: 'Careers',
      slug: 'careers',
      status: 'DRAFT',
      sections: [
        {
          type: 'RICH_TEXT',
          name: 'Careers draft',
          content: { html: '<h2>Join Tuaja</h2><p>Openings will be listed here soon.</p>' },
        },
      ],
    },
  ],
  blogs: [
    post(NEWS.hilton, D('news-3.jpg'), 'Press', { tags: ['Hilton', 'Al-Ahsa'] }),
    post(NEWS.ahsaMeeting, D('news-2.jpg'), 'Press'),
    post(NEWS.launch, T('gallery-5.jpg'), 'Press', { tags: ['PIF', 'Agritourism'] }),
    post(
      {
        title: 'Gallery: experience nature, heartfully',
        date: '',
        paragraphs: [
          'A new collection of photographs from across Al-Ahsa — palm groves, desert dunes and the people who make every Tuaja experience special.',
        ],
      },
      T('gallery-7.jpg'),
      'Gallery',
      { status: 'SCHEDULED', date: undefined, daysAgo: -7, author: 'editor' },
    ),
    post(
      {
        title: 'Draft: press kit refresh',
        date: '',
        paragraphs: ['Updated brand assets and fact sheets for media partners.'],
      },
      T('gallery-3.jpg'),
      'Press',
      { status: 'DRAFT', date: undefined, author: 'editor' },
    ),
  ],
};

// ───────────────────────────── Dan Company ─────────────────────────────

const DAN_ABOUT =
  'Dan Company is a PIF company that aims to contribute to the development of the tourism sector by embracing the Kingdom’s captivating nature and introducing its rich agricultural diversity through agriculture, adventure, and eco-tourism, strengthening the connection between people and nature. Dan’s unique integrated business model includes owned and franchised assets, a pioneering approach in the global tourism industry, and aims to develop a tourism ecosystem consisting of luxury resorts and granting franchises to farmers and tourist lodge operators across various regions of the Kingdom of Saudi Arabia.';

const PILLARS = [
  {
    title: 'Agritourism',
    description:
      'Visitor experiences related to traditional farming — seasonal harvests, farm-to-plate dining and hands-on time with the land.',
    image: D('tile-1.jpg'),
    icon: D('icon-1.webp'),
  },
  {
    title: 'Adventure Tourism',
    description:
      'Horse riding, star-gazing and climbing — compelling, environmentally-friendly experiences in the Kingdom’s landscapes.',
    image: D('tile-2.jpg'),
    icon: D('icon-2.webp'),
  },
  {
    title: 'Eco Tourism',
    description:
      'Experiencing nature while minimizing environmental impact, with lodges built from local, low-carbon materials.',
    image: D('tile-3.jpg'),
    icon: D('icon-3.webp'),
  },
];

const PARTNERS = [
  { url: D('partner-3.svg'), alt: 'Ministry of Environment, Water and Agriculture' },
  { url: D('partner-4.webp'), alt: 'Social Development Bank' },
  { url: D('partner-1.webp'), alt: 'Tourism Development Fund' },
  { url: D('partner-2.svg'), alt: 'Hilton' },
];

export const DAN: SeedSite = {
  name: 'Dan Demo',
  slug: 'dan-demo',
  domain: 'dan-demo.example.com',
  primaryColor: '#552A0E',
  apiKey: 'pif_dandemo1_PublicDemoKey-DanDemo-2026xx',
  tagline: 'Dan Company — a PIF company',
  seo: {
    titleTemplate: '%s | Dan Company',
    defaultMetaDescription:
      'Dan Company, a PIF company, develops agritourism, adventure and eco-tourism across the Kingdom of Saudi Arabia.',
    defaultOgImage: D('hero-poster.jpg'),
    canonicalBaseUrl: 'https://dancompany.sa/en',
  },
  social: SOCIAL,
  categories: ['News', 'Press releases'],
  media: [
    ...PILLARS.map((p, i) => ({ url: p.image, filename: `tile-${i + 1}.jpg`, alt: p.title })),
    ...[1, 2, 3, 4, 5].map((i) => ({
      url: D(`news-${i}.jpg`),
      filename: `news-${i}.jpg`,
      alt: `News photo ${i}`,
    })),
    { url: D('hero-poster.jpg'), filename: 'hero-poster.jpg', alt: 'Let Nature Be' },
  ],
  pages: [
    {
      title: 'Home',
      slug: 'home',
      status: 'PUBLISHED',
      seo: {
        metaTitle: 'Let Nature Be',
        metaDescription:
          'Dan Company, a PIF company, develops agritourism, adventure and eco-tourism across Saudi Arabia.',
      },
      sections: [
        {
          type: 'HERO',
          name: 'Hero slider',
          content: {
            heading: 'Let Nature Be',
            subheading: 'Farms and lodges across Saudi Arabia',
            backgroundVideo: D('hero.mp4'),
            backgroundImage: D('hero-poster.jpg'),
            overlayImage: D('hero-slide.webp'),
          },
        },
        {
          type: 'RICH_TEXT',
          name: 'About Dan',
          content: { html: `<h2>About Dan</h2><p>${DAN_ABOUT}</p>` },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Tourism pillars',
          content: {
            heading: '',
            items: PILLARS.map((p) => ({
              ...p,
              linkLabel: '',
              linkUrl: '/our-brands',
              color: '',
            })),
          },
        },
        {
          type: 'GALLERY',
          name: 'Our partners',
          content: { heading: 'Our Partners', layout: 'logos', images: PARTNERS },
        },
        {
          type: 'LATEST_POSTS',
          name: 'Media center',
          content: {
            heading: 'Media Center',
            count: 6,
            category: '',
            linkLabel: 'All News',
            linkUrl: '/media-center',
          },
        },
      ],
    },
    {
      title: 'About Dan',
      slug: 'about-us',
      status: 'PUBLISHED',
      seo: { metaTitle: 'About Dan', metaDescription: DAN_ABOUT.slice(0, 155) },
      sections: [
        {
          type: 'HERO',
          name: 'About banner',
          content: {
            heading: 'About Dan',
            subheading: 'A PIF company',
            backgroundImage: D('tile-3.jpg'),
          },
        },
        {
          type: 'RICH_TEXT',
          name: 'Who we are',
          content: { html: `<h2>Who we are</h2><p>${DAN_ABOUT}</p>` },
        },
        {
          type: 'STATS',
          name: 'Dan in numbers',
          content: {
            heading: 'Dan in numbers',
            items: [
              { value: '2022', label: 'Established' },
              { value: '3', label: 'Resorts in Al-Ahsa' },
              { value: '1.8M m²', label: 'First master development' },
              { value: 'SAR 6B', label: 'Non-oil GDP contribution by 2030' },
            ],
          },
        },
        {
          type: 'IMAGE_TEXT',
          name: 'Community',
          content: {
            heading: 'Enabling local communities',
            body: 'Dan’s projects provide Saudi and international visitors with new experiences by granting franchises to farmers and tourist lodge operators, who receive the training and knowledge they need to start and build their own facilities.',
            image: D('tile-1.jpg'),
            imageAlt: 'A farmer tending a palm tree',
            imagePosition: 'left',
            background: 'light',
          },
        },
      ],
    },
    {
      title: 'Our Brands',
      slug: 'our-brands',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'HERO',
          name: 'Brands banner',
          content: {
            heading: 'Our Brands',
            subheading: 'Agritourism, adventure tourism and eco tourism',
            backgroundImage: D('tile-2.jpg'),
          },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Brands',
          content: {
            heading: 'Tuaja Luxury Resorts',
            items: [
              {
                title: 'Tuaja Luxury Resorts',
                description:
                  'Premium farm, eco and adventure resorts in the world’s largest palm oasis in Al-Ahsa.',
                image: T('exp-1.jpg'),
                icon: '',
                linkLabel: 'Visit website',
                linkUrl: '/websites/tuaja',
                color: '#C8985A',
              },
            ],
          },
        },
        {
          type: 'IMAGE_CARDS',
          name: 'Tourism pillars',
          content: {
            heading: 'What we do',
            items: PILLARS.map((p) => ({ ...p, linkLabel: '', linkUrl: '', color: '' })),
          },
        },
      ],
    },
    {
      title: 'Media Center',
      slug: 'media-center',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'LATEST_POSTS',
          name: 'All news',
          content: { heading: 'Media Center', count: 12, category: '', linkLabel: '', linkUrl: '' },
        },
      ],
    },
    {
      title: 'Contact Us',
      slug: 'contact-us',
      status: 'PUBLISHED',
      sections: [
        {
          type: 'FORM',
          name: 'Contact form',
          content: {
            heading: 'Contact Us',
            body: 'For partnerships, franchising, media or general enquiries, send us a message.',
            formKey: 'contact',
            background: 'light',
          },
        },
      ],
    },
  ],
  blogs: [
    post(NEWS.hail, D('news-1.jpg'), 'News', { tags: ['Hail', 'Partnership'] }),
    post(NEWS.ahsaMeeting, D('news-2.jpg'), 'News'),
    post(NEWS.hilton, D('news-3.jpg'), 'News', { tags: ['Hilton', 'Al-Ahsa'] }),
    post(NEWS.tdf, D('news-4.jpg'), 'News', { tags: ['Tourism Development Fund'] }),
    post(NEWS.forum, D('news-5.jpg'), 'News', { tags: ['PIF', 'Partnership'] }),
    post(NEWS.nakhla, D('news-6.webp'), 'News', { tags: ['Community', 'STEM'] }),
    post(NEWS.launch, D('tile-2.jpg'), 'Press releases', { tags: ['PIF'] }),
    post(
      {
        title: 'Draft: Hail destination announcement',
        date: '',
        paragraphs: ['Details of the next destination will be shared soon.'],
      },
      D('tile-3.jpg'),
      'News',
      { status: 'DRAFT', date: undefined, author: 'editor' },
    ),
  ],
};
