import { AlignLeft, BarChart3, GalleryHorizontal, HelpCircle, Image, LayoutGrid, Megaphone, MessageSquareQuote, PanelTop } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SectionType } from '@/lib/types';

export type FieldDef =
  | { key: string; label: string; kind: 'text' | 'textarea' | 'url' | 'image' | 'richtext'; required?: boolean; max?: number; placeholder?: string }
  | { key: string; label: string; kind: 'select'; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: 'list'; itemLabel: string; min: number; max: number; itemFields: FieldDef[]; newItem: Record<string, string> };

export interface BlockDef {
  label: string;
  description: string;
  icon: LucideIcon;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
}

const heading: FieldDef = { key: 'heading', label: 'Heading', kind: 'text', required: true, max: 160 };

/** One schema per block type — mirrors backend/src/cms/sections/section-schemas.ts. */
export const BLOCKS: Record<SectionType, BlockDef> = {
  HERO: {
    label: 'Hero',
    description: 'Full-width banner with heading, background and call to action',
    icon: PanelTop,
    fields: [heading, { key: 'subheading', label: 'Subheading', kind: 'textarea', max: 300 }, { key: 'backgroundImage', label: 'Background image', kind: 'image' }, { key: 'ctaLabel', label: 'Button label', kind: 'text', max: 40 }, { key: 'ctaUrl', label: 'Button link', kind: 'url', placeholder: '/contact' }],
    defaults: { heading: 'Welcome to our website', subheading: 'A short supporting line', backgroundImage: '', ctaLabel: 'Learn more', ctaUrl: '/about' },
  },
  RICH_TEXT: {
    label: 'Rich text',
    description: 'Formatted text with headings, lists, links and images',
    icon: AlignLeft,
    fields: [{ key: 'html', label: 'Content', kind: 'richtext' }],
    defaults: { html: '<p>Start writing your content here.</p>' },
  },
  IMAGE_TEXT: {
    label: 'Image & text',
    description: 'Image beside a heading and paragraph',
    icon: Image,
    fields: [heading, { key: 'body', label: 'Body', kind: 'textarea', max: 5000 }, { key: 'image', label: 'Image', kind: 'image' }, { key: 'imageAlt', label: 'Image alt text', kind: 'text', max: 160 }, { key: 'imagePosition', label: 'Image position', kind: 'select', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] }],
    defaults: { heading: 'Tell your story', body: 'Describe what makes you different.', image: '', imageAlt: '', imagePosition: 'left' },
  },
  FEATURE_CARDS: {
    label: 'Feature cards',
    description: 'Grid of cards with an icon, title and description',
    icon: LayoutGrid,
    fields: [heading, { key: 'items', label: 'Cards', kind: 'list', itemLabel: 'Card', min: 1, max: 12, newItem: { icon: 'star', title: 'New feature', description: '' }, itemFields: [{ key: 'title', label: 'Title', kind: 'text', required: true, max: 80 }, { key: 'icon', label: 'Icon name', kind: 'text', max: 40, placeholder: 'leaf, compass…' }, { key: 'description', label: 'Description', kind: 'textarea', max: 400 }] }],
    defaults: { heading: 'Why choose us', items: [{ icon: 'star', title: 'Quality', description: 'Describe this feature.' }] },
  },
  STATS: {
    label: 'Stats',
    description: 'Highlighted numbers with labels',
    icon: BarChart3,
    fields: [{ key: 'heading', label: 'Heading', kind: 'text', max: 160 }, { key: 'items', label: 'Stats', kind: 'list', itemLabel: 'Stat', min: 1, max: 8, newItem: { value: '0', label: 'Label' }, itemFields: [{ key: 'value', label: 'Value', kind: 'text', required: true, max: 20 }, { key: 'label', label: 'Label', kind: 'text', required: true, max: 60 }] }],
    defaults: { heading: 'By the numbers', items: [{ value: '100+', label: 'Happy guests' }] },
  },
  TESTIMONIALS: {
    label: 'Testimonials',
    description: 'Quotes from customers',
    icon: MessageSquareQuote,
    fields: [heading, { key: 'items', label: 'Testimonials', kind: 'list', itemLabel: 'Testimonial', min: 1, max: 12, newItem: { quote: '', author: '', role: '' }, itemFields: [{ key: 'quote', label: 'Quote', kind: 'textarea', required: true, max: 600 }, { key: 'author', label: 'Author', kind: 'text', required: true, max: 80 }, { key: 'role', label: 'Role / context', kind: 'text', max: 80 }] }],
    defaults: { heading: 'What our guests say', items: [{ quote: 'A wonderful experience.', author: 'A happy guest', role: '' }] },
  },
  FAQ: {
    label: 'FAQ',
    description: 'Questions and answers',
    icon: HelpCircle,
    fields: [heading, { key: 'items', label: 'Questions', kind: 'list', itemLabel: 'Question', min: 1, max: 30, newItem: { question: '', answer: '' }, itemFields: [{ key: 'question', label: 'Question', kind: 'text', required: true, max: 200 }, { key: 'answer', label: 'Answer', kind: 'textarea', required: true, max: 2000 }] }],
    defaults: { heading: 'Frequently asked questions', items: [{ question: 'How do I book?', answer: 'Use the booking form on this page.' }] },
  },
  CTA: {
    label: 'Call to action',
    description: 'Short message with a prominent button',
    icon: Megaphone,
    fields: [heading, { key: 'body', label: 'Body', kind: 'textarea', max: 400 }, { key: 'buttonLabel', label: 'Button label', kind: 'text', required: true, max: 40 }, { key: 'buttonUrl', label: 'Button link', kind: 'url', placeholder: '/contact' }],
    defaults: { heading: 'Ready to get started?', body: '', buttonLabel: 'Contact us', buttonUrl: '/contact' },
  },
  GALLERY: {
    label: 'Gallery',
    description: 'Grid of images',
    icon: GalleryHorizontal,
    fields: [{ key: 'heading', label: 'Heading', kind: 'text', max: 160 }, { key: 'images', label: 'Images', kind: 'list', itemLabel: 'Image', min: 1, max: 30, newItem: { url: '', alt: '' }, itemFields: [{ key: 'url', label: 'Image', kind: 'image', required: true }, { key: 'alt', label: 'Alt text', kind: 'text', max: 160 }] }],
    defaults: { heading: 'Gallery', images: [{ url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800', alt: 'Landscape' }] },
  },
};

export const SECTION_TYPES = Object.keys(BLOCKS) as SectionType[];

/** Client-side check of required fields (the server validates the full schema). */
export function validateBlock(type: SectionType, content: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  const walk = (fields: FieldDef[], obj: Record<string, unknown>, prefix: string) => {
    for (const f of fields) {
      const v = obj[f.key];
      const path = `${prefix}${f.key}`;
      if (f.kind === 'list') {
        const arr = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
        if (arr.length < f.min) errors[path] = `Add at least ${f.min} ${f.itemLabel.toLowerCase()}.`;
        arr.forEach((item, i) => walk(f.itemFields, item, `${path}.${i}.`));
      } else if ('required' in f && f.required && !String(v ?? '').trim()) {
        errors[path] = `${f.label} is required.`;
      } else if ((f.kind === 'url' || f.kind === 'image') && v && !/^(https?:\/\/\S+|\/\S*|#\S*)$/.test(String(v))) {
        errors[path] = `${f.label} must be a URL (https://…) or a site path (/…).`;
      }
    }
  };
  walk(BLOCKS[type].fields, content, '');
  return errors;
}
