/* Shared seed types, forms and fictional lead data. Website content lives in seed-websites.ts. */
import { BlogStatus, LeadStatus, PageStatus, SectionType, SocialPlatform } from '@prisma/client';

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
  /** Slug of the parent page (must appear earlier in the list). */
  parent?: string;
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
  /** Exact publish date (YYYY-MM-DD); overrides daysAgo. */
  date?: string;
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
  media: { url: string; filename: string; alt: string }[];
  seo: {
    titleTemplate: string;
    defaultMetaDescription: string;
    defaultOgImage: string;
    canonicalBaseUrl: string;
  };
}

const contactForm = {
  key: 'contact',
  name: 'Contact us',
  description: 'General enquiries from the contact page.',
  successMessage: 'Thank you! Our team will get back to you within one business day.',
  fields: [
    {
      name: 'name',
      label: 'Full name',
      type: 'text',
      required: true,
      placeholder: 'Your name',
      maxLength: 80,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'you@example.com',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'phone',
      required: false,
      placeholder: '+971 50 000 0000',
    },
    {
      name: 'topic',
      label: 'Topic',
      type: 'select',
      required: true,
      options: ['General', 'Bookings', 'Partnerships', 'Media'],
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      placeholder: 'How can we help?',
      minLength: 10,
      maxLength: 2000,
    },
    {
      name: 'consent',
      label: 'I agree to be contacted about my enquiry',
      type: 'checkbox',
      required: true,
    },
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
      {
        name: 'guests',
        label: 'Guests',
        type: 'radio',
        required: true,
        options: ['1', '2', '3-4', '5+'],
      },
      {
        name: 'interests',
        label: 'Interests',
        type: 'checkbox',
        required: false,
        options: ['Hiking', 'Spa', 'Dining', 'Stargazing'],
      },
      {
        name: 'notes',
        label: 'Anything else?',
        type: 'textarea',
        required: false,
        maxLength: 1000,
      },
    ],
  },
];

export const LEAD_PEOPLE = [
  ['Aisha Rahman', 'aisha.rahman'],
  ['Ben Carter', 'ben.carter'],
  ['Chloe Martin', 'chloe.m'],
  ['Daniyal Shah', 'daniyal.shah'],
  ['Elena Petrova', 'elena.p'],
  ['Faisal Qureshi', 'faisal.q'],
  ['Grace Liu', 'grace.liu'],
  ['Hassan Ali', 'hassan.ali'],
  ['Isabel Gomez', 'isabel.g'],
  ['James Wright', 'j.wright'],
  ['Kiran Patel', 'kiran.patel'],
  ['Layla Mansour', 'layla.m'],
  ['Mateo Rossi', 'mateo.rossi'],
  ['Noor Hamdan', 'noor.h'],
  ['Oliver Brown', 'oliver.b'],
  ['Priya Nair', 'priya.nair'],
  ['Rami Aziz', 'rami.aziz'],
  ['Sofia Costa', 'sofia.c'],
  ['Tariq Hussain', 'tariq.h'],
  ['Uma Iyer', 'uma.iyer'],
  ['Victor Lemaire', 'victor.l'],
  ['Wen Zhao', 'wen.zhao'],
  ['Yara Khalil', 'yara.k'],
  ['Zain Malik', 'zain.malik'],
  ['Amira Said', 'amira.said'],
  ['Lucas Meyer', 'lucas.meyer'],
  ['Hiba Odeh', 'hiba.odeh'],
  ['Sami Rizk', 'sami.rizk'],
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

export const LEAD_STATUS_POOL: LeadStatus[] = [
  'NEW',
  'NEW',
  'NEW',
  'CONTACTED',
  'CONTACTED',
  'QUALIFIED',
  'QUALIFIED',
  'WON',
  'LOST',
];
