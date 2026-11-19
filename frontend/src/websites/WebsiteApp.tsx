import { Fragment, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './websites.css';
import {
  navTree,
  PublicApiError,
  useLiveContent,
  useNav,
  usePage,
  usePost,
  useSocial,
  type PublicSection,
} from './data';
import { useFonts, useScrollRestore, useSeo, WebsiteProvider } from './kit';
import { websiteByPath, type WebsiteConfig, type WebsiteTheme } from './registry';
import { danTheme } from './themes/dan';
import type { ThemeModule } from './themes/theme';
import { tuajaTheme } from './themes/tuaja';

const THEMES: Record<WebsiteTheme, ThemeModule> = { tuaja: tuajaTheme, dan: danTheme };

export const sectionAnchor = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Ids of sections whose content changed since the previous render (new ones included). */
function useChangedSections(sections: PublicSection[] | undefined): Set<string> {
  const prev = useRef<Map<string, string> | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!sections) return;
    const next = new Map(sections.map((s) => [s.id, JSON.stringify([s.content, s.order])]));
    if (prev.current) {
      const ids = sections.filter((s) => prev.current!.get(s.id) !== next.get(s.id)).map((s) => s.id);
      if (ids.length) {
        setChanged(new Set(ids));
        const t = setTimeout(() => setChanged(new Set()), 1700);
        prev.current = next;
        return () => clearTimeout(t);
      }
    }
    prev.current = next;
  }, [sections]);
  return changed;
}

function PageView({ site, theme, slug }: { site: WebsiteConfig; theme: ThemeModule; slug: string }) {
  const page = usePage(site, slug);
  useSeo(page.data?.seo, site.name);
  const changed = useChangedSections(page.data?.sections);
  if (page.isLoading) return <div className="min-h-[80vh]" aria-busy="true" aria-label="Loading" />;
  if (page.error instanceof PublicApiError && page.error.status === 404)
    return <theme.Message title="Page not found" body="This page does not exist or is not published yet." />;
  if (page.isError || !page.data)
    return <theme.Message title="Something went wrong" body="Please try again in a moment." />;
  if (page.data.sections.length === 0)
    return <theme.Message title={page.data.title} body="This page has no visible sections yet." />;
  return (
    <>
      {page.data.sections.map((s, i) => (
        <Fragment key={s.id}>
          <section
            id={sectionAnchor(s.name)}
            data-section-type={s.type}
            className={changed.has(s.id) ? 'ws-updated' : undefined}
          >
            <theme.Section type={s.type} content={s.content} />
          </section>
          {i === 0 && <span id="content" />}
        </Fragment>
      ))}
    </>
  );
}

function PostRoute({ site, theme, slug }: { site: WebsiteConfig; theme: ThemeModule; slug: string }) {
  const post = usePost(site, slug);
  useSeo(post.data?.seo, site.name);
  if (post.isLoading) return <div className="min-h-[80vh]" aria-busy="true" aria-label="Loading" />;
  if (!post.data)
    return (
      <theme.Message title="Article not found" body="This article does not exist or is not published yet." />
    );
  return <theme.PostView post={post.data} />;
}

function Website({ site }: { site: WebsiteConfig }) {
  const theme = THEMES[site.theme];
  const rest = (useParams()['*'] ?? '').replace(/\/+$/, '');
  useFonts(theme.fonts);
  useLiveContent(site);
  useScrollRestore();
  const nav = useNav(site);
  const social = useSocial(site);

  const [first, second] = rest.split('/');
  const isPost = first === 'news' && !!second;
  const slug = isPost ? '' : first || 'home';
  // Pages that open with a hero let the header float over it.
  const page = usePage(site, slug || 'home');
  const overlay = !isPost && page.data?.sections[0]?.type === 'HERO';

  return (
    <theme.Layout nav={navTree(nav.data ?? [])} social={social.data ?? []} overlayHeader={!!overlay}>
      {isPost ? (
        <PostRoute site={site} theme={theme} slug={second!} />
      ) : (
        <PageView site={site} theme={theme} slug={slug} />
      )}
    </theme.Layout>
  );
}

export default function WebsiteApp() {
  const { site: path } = useParams();
  const site = websiteByPath(path);
  if (!site)
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center font-sans">
        <div>
          <h1 className="text-xl font-semibold text-black">Website not found</h1>
          <p className="mt-2 text-sm text-neutral-600">
            No hosted website is configured at /websites/{path}.
          </p>
        </div>
      </div>
    );
  return (
    <WebsiteProvider value={site}>
      <Website site={site} />
    </WebsiteProvider>
  );
}
