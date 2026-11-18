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

/** One JSON schema per block type. Content is validated and normalised before it is stored. */
export const SECTION_SCHEMAS: Record<SectionType, Joi.ObjectSchema> = {
  HERO: Joi.object({
    heading,
    subheading: text(300).default(''),
    backgroundImage: url.default(''),
    ctaLabel: text(40).default(''),
    ctaUrl: url.default(''),
  }),
  RICH_TEXT: Joi.object({ html: Joi.string().max(100_000).allow('').required() }),
  IMAGE_TEXT: Joi.object({
    heading,
    body: text(5000).default(''),
    image: url.default(''),
    imageAlt: text(160).default(''),
    imagePosition: Joi.string().valid('left', 'right').default('left'),
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
    images: Joi.array()
      .items(Joi.object({ url: url.min(1).required(), alt: text(160).default('') }))
      .min(1)
      .max(30)
      .required(),
  }),
};

export const SECTION_DEFAULTS: Record<SectionType, Record<string, unknown>> = {
  HERO: {
    heading: 'Welcome to our website',
    subheading: 'A short supporting line',
    backgroundImage: '',
    ctaLabel: 'Learn more',
    ctaUrl: '/about',
  },
  RICH_TEXT: { html: '<p>Start writing your content here.</p>' },
  IMAGE_TEXT: {
    heading: 'Tell your story',
    body: 'Describe what makes you different.',
    image: '',
    imageAlt: '',
    imagePosition: 'left',
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
    images: [
      {
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
        alt: 'Landscape',
      },
    ],
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
