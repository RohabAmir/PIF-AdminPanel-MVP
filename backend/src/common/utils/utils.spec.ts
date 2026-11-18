import { toCsv } from './csv';
import { generateOtp, generateTempPassword } from './crypto';
import { diffObjects, sanitizeForLog } from './object';
import { isStrongPassword } from './password-policy';
import { slugify, uniqueSlug } from './slug';

describe('slug', () => {
  it('normalises titles', () => {
    expect(slugify('  Spa & Wellness — Été 2026!  ')).toBe('spa-and-wellness-ete-2026');
    expect(slugify('***')).toBe('untitled');
  });
  it('finds the next free slug', async () => {
    const taken = new Set(['home', 'home-2']);
    expect(await uniqueSlug('Home', async (s) => taken.has(s))).toBe('home-3');
  });
});

describe('crypto helpers', () => {
  it('temp passwords always satisfy the policy and are random', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword(12);
      expect(p).toHaveLength(12);
      expect(isStrongPassword(p)).toBe(true);
      seen.add(p);
    }
    expect(seen.size).toBe(200);
  });
  it('OTPs are six digits', () => {
    for (let i = 0; i < 100; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
});

describe('password policy', () => {
  it.each([
    ['Demo@12345', true],
    ['short1!A', true],
    ['alllowercase1!', false],
    ['NoSpecial123', false],
    ['No#digits', false],
  ])('%s → %s', (p, ok) => expect(isStrongPassword(p)).toBe(ok));
});

describe('audit helpers', () => {
  it('strips secrets and truncates long strings', () => {
    const out = sanitizeForLog({
      email: 'a@b.c',
      passwordHash: 'x',
      nested: { token: 't', ok: 'y' },
      long: 'z'.repeat(600),
    }) as Record<string, unknown>;
    expect(out.passwordHash).toBeUndefined();
    expect((out.nested as Record<string, unknown>).token).toBeUndefined();
    expect(String(out.long)).toMatch(/600 chars/);
  });
  it('diffs only changed keys', () => {
    expect(
      diffObjects({ id: 1, a: 1, b: 2, updatedAt: 'x' }, { id: 1, a: 1, b: 3, updatedAt: 'y' }),
    ).toEqual({ before: { b: 2 }, after: { b: 3 } });
  });
});

describe('csv', () => {
  it('escapes quotes, commas and spreadsheet formulas', () => {
    expect(toCsv(['a', 'b'], [['x,"y"', '=SUM(A1)']])).toBe('a,b\r\n"x,""y""",\'=SUM(A1)\r\n');
  });
});
