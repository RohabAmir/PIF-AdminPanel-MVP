import * as Joi from 'joi';
import { SectionType } from '@prisma/client';
import { sanitizeRichText } from '../sanitize';

const url = Joi.string()
  .trim()
  .max(1000)
  .allow('')
  .pattern(/^(https?:\/\/[^\s]+|\/uploads\/[^\s]+|\/[^\s]*|#[^\s]*)$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid URL' });
const text = (max: number) => Joi.string().trim().max(max).allow('');
const heading = Joi.string().trim().min(1).max(160).required();
const color = Joi.string()
  .trim()
  .allow('')
  .pattern(/^#[0-9a-fA-F]{6}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a hex colour like #67B93F' });
const background = Joi.string().valid('light', 'dark', 'accent').default('light');

/** One JSON schema per block type. Content is validated and normalised before it is stored. */
export const SECTION_SCHEMAS: Record<SectionType, Joi.ObjectSchema> = {
  HERO: Joi.object({
    heading,
    subheading: text(300).default(''),
    body: text(3000).default(''),
    backgroundImage: url.default(''),
    backgroundVideo: url.default(''),
    overlayImage: url.default(''),
    ctaLabel: text(40).default(''),
    ctaUrl: url.default(''),
    buttons: Joi.array()
      .items(
        Joi.object({
          label: Joi.string().trim().min(1).max(60).required(),
          url: url.default(''),
          color: color.default(''),
        }),
      )
      .max(4)
      .default([]),
  }),
  RICH_TEXT: Joi.object({ html: Joi.string().max(100_000).allow('').required() }),
  IMAGE_TEXT: Joi.object({
    heading,
    body: text(5000).default(''),
    image: url.default(''),
    imageAlt: text(160).default(''),
    imagePosition: Joi.string().valid('left', 'right').default('left'),
    eyebrow: text(200).default(''),
    ctaLabel: text(40).default(''),
    ctaUrl: url.default(''),
    background,
  }),
  FEATURE_CARDS: Joi.object({
    heading,
    items: Joi.array()
      .items(
        Joi.object({
          icon: text(40).default(''),
          title: Joi.string().trim().min(1).max(80).required(),
          description: text(400).default(''),
        }),
      )
      .min(1)
      .max(12)
      .required(),
  }),
  STATS: Joi.object({
    heading: text(160).default(''),
    items: Joi.array()
      .items(
        Joi.object({
          value: Joi.string().trim().min(1).max(20).required(),
          label: Joi.string().trim().min(1).max(60).required(),
        }),
      )
      .min(1)
      .max(8)
      .required(),
  }),
  TESTIMONIALS: Joi.object({
    heading,
    items: Joi.array()
      .items(
        Joi.object({
          quote: Joi.string().trim().min(1).max(600).required(),
          author: Joi.string().trim().min(1).max(80).required(),
          role: text(80).default(''),
        }),
      )
      .min(1)
      .max(12)
      .required(),
  }),
  FAQ: Joi.object({
    heading,
    items: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().trim().min(1).max(200).required(),
          answer: Joi.string().trim().min(1).max(2000).required(),
        }),
      )
      .min(1)
      .max(30)
      .required(),
  }),
  CTA: Joi.object({
    heading,
    body: text(400).default(''),
    buttonLabel: Joi.string().trim().min(1).max(40).required(),
    buttonUrl: url.required(),
  }),
  GALLERY: Joi.object({
    heading: text(160).default(''),
    layout: Joi.string().valid('grid', 'collage', 'logos').default('grid'),
    images: Joi.array()
      .items(Joi.object({ url: url.min(1).required(), alt: text(160).default('') }))
      .min(1)
      .max(30)
      .required(),
  }),
  IMAGE_CARDS: Joi.object({
    heading: text(160).default(''),
    items: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().trim().min(1).max(80).required(),
          description: text(600).default(''),
          image: url.default(''),
          icon: url.default(''),
          linkLabel: text(40).default(''),
          linkUrl: url.default(''),
          color: color.default(''),
        }),
      )
      .min(1)
      .max(12)
      .required(),
  }),
  LATEST_POSTS: Joi.object({
    heading,
    count: Joi.number().integer().min(1).max(12).default(3),
    category: text(80).default(''),
    linkLabel: text(40).default(''),
    linkUrl: url.default(''),
  }),
  FORM: Joi.object({
    heading,
    body: text(1000).default(''),
    formKey: Joi.string()
      .trim()
      .min(1)
      .max(60)
      .pattern(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
      .required()
      .messages({ 'string.pattern.base': '{{#label}} must be a form key like contact' }),
    background,
  }),
};

export const SECTION_DEFAULTS: Record<SectionType, Record<string, unknown>> = {
  HERO: {
    heading: 'Welcome to our website',
    subheading: 'A short supporting line',
    body: '',
    backgroundImage: '',
    backgroundVideo: '',
    overlayImage: '',
    ctaLabel: 'Learn more',
    ctaUrl: '/about',
    buttons: [],
  },
  RICH_TEXT: { html: '<p>Start writing your content here.</p>' },
  IMAGE_TEXT: {
    heading: 'Tell your story',
    body: 'Describe what makes you different.',
    image: '',
    imageAlt: '',
    imagePosition: 'left',
    eyebrow: '',
    ctaLabel: '',
    ctaUrl: '',
    background: 'light',
  },
  FEATURE_CARDS: {
    heading: 'Why choose us',
    items: [{ icon: 'star', title: 'Quality', description: 'Describe this feature.' }],
  },
  STATS: { heading: 'By the numbers', items: [{ value: '100+', label: 'Happy guests' }] },
  TESTIMONIALS: {
    heading: 'What our guests say',
    items: [{ quote: 'A wonderful experience.', author: 'A happy guest', role: '' }],
  },
  FAQ: {
    heading: 'Frequently asked questions',
    items: [{ question: 'How do I book?', answer: 'Use the booking form on this page.' }],
  },
  CTA: {
    heading: 'Ready to get started?',
    body: '',
    buttonLabel: 'Contact us',
    buttonUrl: '/contact',
  },
  GALLERY: {
    heading: 'Gallery',
    layout: 'grid',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
        alt: 'Landscape',
      },
    ],
  },
  IMAGE_CARDS: {
    heading: 'Our experiences',
    items: [
      {
        title: 'New experience',
        description: 'Describe this experience.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
        icon: '',
        linkLabel: 'Read more',
        linkUrl: '/',
        color: '',
      },
    ],
  },
  LATEST_POSTS: {
    heading: 'Media Center',
    count: 3,
    category: '',
    linkLabel: 'All news',
    linkUrl: '/media-center',
  },
  FORM: {
    heading: 'Get in touch',
    body: 'Send us a message and our team will reply shortly.',
    formKey: 'contact',
    background: 'light',
  },
};

export function validateSectionContent(
  type: SectionType,
  content: unknown,
): { value?: Record<string, unknown>; errors?: { field: string; errors: string[] }[] } {
  const { value, error } = SECTION_SCHEMAS[type].validate(content, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return {
      errors: error.details.map((d) => ({
        field: `content.${d.path.join('.')}`,
        errors: [d.message.replace(/"/g, '')],
      })),
    };
  }
  if (type === SectionType.RICH_TEXT) value.html = sanitizeRichText(value.html as string);
  return { value };
}
