const SENSITIVE = /^(password|passwordHash|token|tokenHash|codeHash|apiKey|apiKeyHash|secret|otp|code|refreshToken|accessToken|tempPassword)$/i;
const MAX_STRING = 500;

/** Deep-copies a value into plain JSON, stripping secrets and truncating long strings. */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (depth > 5) return '[…]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitizeForLog(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE.test(k)) continue;
    out[k] = sanitizeForLog(v, depth + 1);
  }
  return out;
}

const IGNORED_DIFF_KEYS = new Set(['updatedAt', 'createdAt']);

/** Returns only the top-level keys that changed between two objects. */
export function diffObjects(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): { before: Record<string, unknown> | null; after: Record<string, unknown> | null } {
  if (!before || !after) return { before: before ?? null, after: after ?? null };
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (IGNORED_DIFF_KEYS.has(k)) continue;
    if (!(k in after)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k] ?? null;
      a[k] = after[k] ?? null;
    }
  }
  return { before: b, after: a };
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
