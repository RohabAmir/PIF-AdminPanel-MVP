import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Loads .env.test (falls back to .env.test.example) and makes it authoritative for the e2e run. */
export function loadTestEnv(): void {
  process.env.NODE_ENV = 'test';
  const dir = join(__dirname, '..');
  let raw: string;
  try {
    raw = readFileSync(join(dir, '.env.test'), 'utf8');
  } catch {
    raw = readFileSync(join(dir, '.env.test.example'), 'utf8');
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const value = m[2].replace(/^"(.*)"$/, '$1');
    process.env[m[1]] = value;
  }
}

loadTestEnv();
