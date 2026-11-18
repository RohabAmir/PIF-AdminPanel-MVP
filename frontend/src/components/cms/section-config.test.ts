import { describe, expect, it } from 'vitest';
import { BLOCKS, SECTION_TYPES, validateBlock } from './section-config';
import { validateSocialUrl } from '@/pages/cms/SocialPage';

describe('section blocks', () => {
  it('defaults of every block type are valid', () => {
    for (const t of SECTION_TYPES) expect(validateBlock(t, BLOCKS[t].defaults)).toEqual({});
  });
  it('reports required fields and nested list items', () => {
    const e = validateBlock('FAQ', { heading: '', items: [{ question: '', answer: 'x' }] });
    expect(e.heading).toMatch(/required/);
    expect(e['items.0.question']).toMatch(/required/);
  });
  it('rejects malformed links', () => {
    expect(
      validateBlock('CTA', { heading: 'h', buttonLabel: 'Go', buttonUrl: 'not a url' }).buttonUrl,
    ).toBeDefined();
  });
});

describe('social URL validation', () => {
  it('checks the platform host', () => {
    expect(validateSocialUrl('INSTAGRAM', 'https://www.instagram.com/demo')).toBeNull();
    expect(validateSocialUrl('YOUTUBE', 'https://vimeo.com/demo')).toMatch(/YouTube/);
    expect(validateSocialUrl('FACEBOOK', 'http://facebook.com/demo')).toMatch(/https/);
  });
});
