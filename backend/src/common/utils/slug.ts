/** URL-safe slug: lower-case ASCII letters, digits and single dashes. */
export function slugify(input: string): string {
  const s = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s || 'untitled';
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Finds a free slug by appending -2, -3… using the provided existence check.
 * Keeps slugs unique per site without racing on the unique index in normal use.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let i = 2; i < 500; i++) {
    const candidate = `${root.slice(0, 74)}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root.slice(0, 70)}-${Date.now().toString(36)}`;
}
