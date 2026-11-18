import { SectionType } from '@prisma/client';
import { extractContact, FormField, validateSubmission } from './forms/form-fields';
import { readingTime, sanitizeRichText } from './sanitize';
import { SECTION_DEFAULTS, validateSectionContent } from './sections/section-schemas';
import { validatePlatformUrl } from './social/social';

describe('section schemas', () => {
  it('accepts the default content of every block type', () => {
    for (const type of Object.values(SectionType)) {
      expect(validateSectionContent(type, SECTION_DEFAULTS[type]).errors).toBeUndefined();
    }
  });
  it('reports field-level errors', () => {
    const { errors } = validateSectionContent(SectionType.CTA, {
      heading: '',
      buttonUrl: 'not a url',
    });
    expect(errors?.map((e) => e.field)).toEqual(
      expect.arrayContaining(['content.heading', 'content.buttonLabel', 'content.buttonUrl']),
    );
  });
});

describe('rich text', () => {
  it('removes scripts and event handlers but keeps formatting', () => {
    const html = sanitizeRichText(
      '<h2>T</h2><p><strong>b</strong><img src="https://x/y.png" onerror="a()"></p><script>x</script>',
    );
    expect(html).toBe('<h2>T</h2><p><strong>b</strong><img src="https://x/y.png" /></p>');
  });
  it('estimates reading time at 200 wpm', () => {
    expect(readingTime(`<p>${'w '.repeat(401)}</p>`)).toBe(3);
    expect(readingTime('')).toBe(1);
  });
});

describe('form submission validation', () => {
  const fields: FormField[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'phone', required: false },
    { name: 'size', label: 'Size', type: 'radio', required: true, options: ['S', 'M'] },
    { name: 'tags', label: 'Tags', type: 'checkbox', required: false, options: ['a', 'b'] },
    { name: 'agree', label: 'Agree', type: 'checkbox', required: true },
  ];
  it('accepts valid input and extracts contact details', () => {
    const { values, errors } = validateSubmission(fields, {
      name: ' Ann ',
      email: 'ann@example.com',
      size: 'S',
      tags: ['a'],
      agree: 'on',
      extra: 'ignored',
    });
    expect(errors).toEqual([]);
    expect(values).toEqual({
      name: 'Ann',
      email: 'ann@example.com',
      phone: '',
      size: 'S',
      tags: ['a'],
      agree: true,
    });
    expect(extractContact(fields, values)).toEqual({
      name: 'Ann',
      email: 'ann@example.com',
      phone: undefined,
    });
  });
  it('rejects bad values', () => {
    const { errors } = validateSubmission(fields, {
      email: 'nope',
      phone: 'abc',
      size: 'XL',
      tags: ['z'],
    });
    expect(errors.map((e) => e.field)).toEqual(['name', 'email', 'phone', 'size', 'tags', 'agree']);
  });
});

describe('social URL validation', () => {
  it.each([
    ['INSTAGRAM', 'https://www.instagram.com/demo', null],
    ['X', 'https://twitter.com/demo', null],
    ['WHATSAPP', 'https://wa.me/10000000000', null],
    ['FACEBOOK', 'http://facebook.com/demo', 'https'],
    ['YOUTUBE', 'https://vimeo.com/demo', 'expected'],
    ['LINKEDIN', 'https://linkedin.com/', 'path'],
  ] as const)('%s %s', (platform, url, expected) => {
    const err = validatePlatformUrl(platform, url);
    if (expected === null) expect(err).toBeNull();
    else expect(err).toMatch(new RegExp(expected, 'i'));
  });
});
