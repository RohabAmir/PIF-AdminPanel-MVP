import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BLOCKS, SECTION_TYPES, validateBlock } from '@/components/cms/section-config';
import { navTree } from './data';
import { resolveHref, WebsiteProvider } from './kit';
import { WEBSITES, websiteBySiteSlug, websitePageUrl } from './registry';
import { danTheme } from './themes/dan';
import { tuajaTheme } from './themes/tuaja';

const tuaja = WEBSITES.find((w) => w.path === 'tuaja')!;

describe('website registry and links', () => {
  it('maps tenants to websites and pages to URLs', () => {
    expect(websiteBySiteSlug('dan-demo')?.theme).toBe('dan');
    expect(websiteBySiteSlug('unknown')).toBeUndefined();
    expect(websitePageUrl(tuaja, 'home')).toBe('/websites/tuaja');
    expect(websitePageUrl(tuaja, 'eco-resort')).toBe('/websites/tuaja/eco-resort');
  });

  it('resolves CMS links relative to the website', () => {
    expect(resolveHref(tuaja, '/eco-resort')).toEqual({ to: '/websites/tuaja/eco-resort', external: false });
    expect(resolveHref(tuaja, '/')).toEqual({ to: '/websites/tuaja', external: false });
    expect(resolveHref(tuaja, '/websites/dan')).toEqual({ to: '/websites/dan', external: false });
    expect(resolveHref(tuaja, '#booking-enquiry')).toEqual({ to: '#booking-enquiry', external: false });
    expect(resolveHref(tuaja, 'https://pif.gov.sa')).toEqual({ to: 'https://pif.gov.sa', external: true });
    expect(resolveHref(tuaja, '  ')).toBeNull();
  });

  it('builds a two-level menu without the home page', () => {
    const tree = navTree([
      { id: 'h', title: 'Home', slug: 'home', parentId: null, order: 0 },
      { id: 'b', title: 'The Brand', slug: 'the-brand', parentId: null, order: 1 },
      { id: 'a', title: 'About Us', slug: 'about-us', parentId: 'b', order: 2 },
      { id: 'o', title: 'Orphan', slug: 'orphan', parentId: 'unpublished-parent', order: 3 },
    ]);
    expect(tree.map((t) => t.slug)).toEqual(['the-brand', 'orphan']);
    expect(tree[0]!.children.map((c) => c.slug)).toEqual(['about-us']);
  });
});

describe('website themes', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  for (const [name, theme] of [
    ['tuaja', tuajaTheme],
    ['dan', danTheme],
  ] as const) {
    it(`${name} renders every section type`, () => {
      const site = WEBSITES.find((w) => w.theme === name)!;
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      for (const type of SECTION_TYPES) {
        const { container, unmount } = render(
          <QueryClientProvider client={qc}>
            <MemoryRouter>
              <WebsiteProvider value={site}>
                <theme.Section type={type} content={BLOCKS[type].defaults} />
              </WebsiteProvider>
            </MemoryRouter>
          </QueryClientProvider>,
        );
        expect(container.innerHTML, `${name} ${type}`).not.toBe('');
        unmount();
      }
    });
  }

  it('Tuaja hero shows coloured resort buttons linking inside the website', () => {
    const content = {
      ...BLOCKS.HERO.defaults,
      heading: 'Tuaja Luxury Resort,',
      body: 'Intro',
      buttons: [{ label: 'Al-Ahsa Eco Resort', url: '/eco-resort', color: '#62BFAB' }],
    };
    expect(validateBlock('HERO', content)).toEqual({});
    render(
      <MemoryRouter>
        <WebsiteProvider value={tuaja}>
          <tuajaTheme.Section type="HERO" content={content} />
        </WebsiteProvider>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Al-Ahsa Eco Resort' });
    expect(link).toHaveAttribute('href', '/websites/tuaja/eco-resort');
    expect(link).toHaveStyle({ backgroundColor: '#62BFAB' });
  });
});
