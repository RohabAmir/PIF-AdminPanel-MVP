import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*?-_';

/** Cryptographically random password that always satisfies the password policy. */
export function generateTempPassword(length = 12): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const chars = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SPECIAL[randomInt(SPECIAL.length)],
  ];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
