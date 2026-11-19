/**
 * Hosted tenant websites. Each one is a separate front end that reads its content from the
 * public content API with its own public API key — exactly how the real tuaja.com /
 * dancompany.sa would integrate. The admin panel links to them by the tenant's site slug.
 */
export type WebsiteTheme = 'tuaja' | 'dan';

export interface WebsiteConfig {
  /** URL segment: /websites/<path> */
  path: string;
  /** Slug of the tenant (Site) in the admin panel */
  siteSlug: string;
  theme: WebsiteTheme;
  apiKey: string;
  name: string;
}

const env = import.meta.env as Record<string, string | undefined>;

export const WEBSITES: WebsiteConfig[] = [
  {
    path: 'tuaja',
    siteSlug: 'tuaja-demo',
    theme: 'tuaja',
    name: 'Tuaja Luxury Resorts',
    apiKey: env.VITE_TUAJA_API_KEY || 'pif_tuajadem_PublicDemoKey-TuajaDemo-2026',
  },
  {
    path: 'dan',
    siteSlug: 'dan-demo',
    theme: 'dan',
    name: 'Dan Company',
    apiKey: env.VITE_DAN_API_KEY || 'pif_dandemo1_PublicDemoKey-DanDemo-2026xx',
  },
];

export const websiteByPath = (path: string | undefined) => WEBSITES.find((w) => w.path === path);
export const websiteBySiteSlug = (slug: string | undefined) => WEBSITES.find((w) => w.siteSlug === slug);

/** Public URL of a CMS page on its website (home → website root). */
export function websitePageUrl(w: WebsiteConfig, pageSlug?: string): string {
  return pageSlug && pageSlug !== 'home' ? `/websites/${w.path}/${pageSlug}` : `/websites/${w.path}`;
}
