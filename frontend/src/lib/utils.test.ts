import { describe, expect, it } from 'vitest';
import { initials, safeReturnTo, slugify, formatBytes } from './utils';
import { PASSWORD_RULES, newPasswordSchema } from './password';

describe('utils', () => {
  it('slugifies titles', () => {
    expect(slugify('Spa & Wellness — Été!')).toBe('spa-and-wellness-ete');
  });
  it('only allows internal return-to paths', () => {
    expect(safeReturnTo('/leads?status=NEW')).toBe('/leads?status=NEW');
    expect(safeReturnTo('https://evil.example')).toBe('/dashboard');
    expect(safeReturnTo('//evil.example')).toBe('/dashboard');
    expect(safeReturnTo('/login')).toBe('/dashboard');
    expect(safeReturnTo(null)).toBe('/dashboard');
  });
  it('builds initials and sizes', () => {
    expect(initials('Sara Al-Mansour')).toBe('SA');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
});

describe('password policy (mirrors the API)', () => {
  it('requires every rule', () => {
    const ok = (p: string) => PASSWORD_RULES.every((r) => r.test(p));
    expect(ok('Demo@12345')).toBe(true);
    expect(ok('demo@12345')).toBe(false);
    expect(ok('Demo12345')).toBe(false);
  });
  it('checks the confirmation', () => {
    expect(newPasswordSchema.safeParse({ password: 'Demo@12345', confirm: 'Demo@12345' }).success).toBe(true);
    const r = newPasswordSchema.safeParse({ password: 'Demo@12345', confirm: 'nope' });
    expect(r.success).toBe(false);
  });
});
