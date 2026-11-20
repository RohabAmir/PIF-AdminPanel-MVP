import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import type { SectionType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { usePosts, type NavItem, type PublicPost, type PublicSocial } from '../data';
import {
  BackgroundVideo,
  fmtDate,
  list,
  paragraphs,
  PublicFormView,
  SiteLink,
  SocialIcons,
  str,
  useWebsite,
  type Obj,
} from '../kit';
import type { ThemeModule } from './theme';

const A = (f: string) => `/websites/dan/${f}`;
const BROWN = '#552A0E';
const INK = '#562E15';
const CREAM = '#F7F3EE';
const PEACH = '#F6DFCF';
const NAVY = '#1D3A6B';

const H2 = ({
  children,
  className,
  center,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) => (
  <h2
    className={cn('text-2xl font-semibold md:text-[1.75rem]', center && 'text-center', className)}
    style={{ color: INK }}
  >
    {children}
  </h2>
);

const BrownButton = ({ to, children, light }: { to: string; children: ReactNode; light?: boolean }) => (
  <SiteLink
    to={to}
    className={cn(
      'inline-block rounded-full border px-6 py-2 text-sm font-medium transition',
      light
        ? 'border-white text-white hover:bg-white hover:text-[#552A0E]'
        : 'border-[#552A0E] bg-[#552A0E] text-white hover:bg-[#6d3a1a]',
    )}
  >
    {children}
  </SiteLink>
);

// ───────────── layout ─────────────

function Header({ nav, overlay }: { nav: NavItem[]; overlay: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const solid = scrolled || !overlay || open;
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        solid ? 'bg-[#552A0E]/90 shadow-lg backdrop-blur' : 'bg-gradient-to-b from-black/45 to-transparent',
      )}
    >
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 md:px-10">
        <SiteLink to="/" ariaLabel="Dan Company — home">
          <img src={A('dan-logo.webp')} alt="Dan Company" className="h-12 w-auto" />
        </SiteLink>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-9">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                <SiteLink
                  to={`/${item.slug}`}
                  className="flex items-center gap-1 py-6 text-[13px] font-medium text-white/90 hover:text-white"
                >
                  {item.title}
                  {item.children.length > 0 && <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />}
                </SiteLink>
                {item.children.length > 0 && (
                  <ul className="invisible absolute left-1/2 top-full min-w-[200px] -translate-x-1/2 rounded-b-lg bg-[#552A0E] py-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.id}>
                        <SiteLink
                          to={`/${c.slug}`}
                          className="block px-5 py-2 text-[13px] text-white/85 hover:bg-white/10 hover:text-white"
                        >
                          {c.title}
                        </SiteLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <span className="hidden w-[88px] md:block" aria-hidden />
        <button
          type="button"
          className="p-2 text-white md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-white/10 px-5 pb-5 md:hidden"
          onClick={() => setOpen(false)}
        >
          {nav
            .flatMap((item) => [item, ...item.children])
            .map((p) => (
              <SiteLink
                key={p.id}
                to={`/${p.slug}`}
                className={cn('block py-2 text-[15px] text-white', p.parentId && 'pl-4 text-white/75')}
              >
                {p.title}
              </SiteLink>
            ))}
        </nav>
      )}
    </header>
  );
}

function Footer({ nav, social }: { nav: NavItem[]; social: PublicSocial[] }) {
  return (
    <footer style={{ backgroundColor: BROWN }} className="text-white">
      <div className="mx-auto max-w-[1320px] px-5 md:px-10">
        <ul className="flex flex-wrap gap-x-10 gap-y-3 py-10 text-[13px] font-semibold">
          {nav.map((p) => (
            <li key={p.id}>
              <SiteLink to={`/${p.slug}`} className="hover:underline">
                {p.title}
              </SiteLink>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-6 border-t border-white/20 py-8 md:flex-row md:justify-between">
          <a
            href="https://www.pif.gov.sa/en/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
            aria-label="A PIF company"
          >
            <img src={A('pif-company.webp')} alt="" className="h-9 w-auto" />
            <img src={A('pif-company.svg')} alt="A PIF Company" className="h-5 w-auto" />
          </a>
          <SocialIcons
            links={social}
            className="flex items-center gap-3"
            iconClassName="h-6 w-6 rounded-full bg-white p-1 text-[#552A0E]"
          />
          <div className="flex gap-6 text-[13px] text-white/85">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Layout({
  nav,
  social,
  overlayHeader,
  children,
}: {
  nav: NavItem[];
  social: PublicSocial[];
  overlayHeader: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="ws font-['Readex_Pro',_sans-serif] font-light"
      style={{ color: INK, backgroundColor: CREAM }}
    >
      <Header nav={nav} overlay={overlayHeader} />
      <main className={overlayHeader ? undefined : 'pt-[76px]'}>{children}</main>
      <Footer nav={nav} social={social} />
    </div>
  );
}

// ───────────── sections ─────────────

function Hero({ c }: { c: Obj }) {
  const video = str(c.backgroundVideo);
  const overlay = str(c.overlayImage);
  const body = paragraphs(c.body);
  const buttons = list(c.buttons);
  const tall = !!video || !!overlay;
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black',
        tall ? 'h-[92svh] min-h-[520px]' : 'flex h-[56vh] min-h-[360px] items-end pb-14',
      )}
    >
      {video ? (
        <BackgroundVideo
          src={video}
          poster={str(c.backgroundImage)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        str(c.backgroundImage) && (
          <img src={str(c.backgroundImage)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )
      )}
      <div
        className={cn(
          'absolute inset-0',
          tall ? 'bg-black/25' : 'bg-gradient-to-t from-[#2a1406]/85 via-black/20 to-black/30',
        )}
      />
      <div
        className={cn(
          'relative mx-auto flex w-full max-w-[1320px] flex-col px-6 text-white md:px-10',
          tall ? 'h-full items-center justify-center text-center' : '',
        )}
      >
        {overlay ? (
          <>
            <img src={overlay} alt={str(c.heading)} className="w-[min(70vw,560px)]" />
            <h1 className="sr-only">{str(c.heading)}</h1>
          </>
        ) : (
          <h1 className="text-3xl font-semibold md:text-5xl">{str(c.heading)}</h1>
        )}
        {str(c.subheading) && (
          <p className={cn('mt-3 text-base text-white/90 md:text-lg', tall && 'tracking-wide')}>
            {str(c.subheading)}
          </p>
        )}
        {body.map((p, i) => (
          <p key={i} className="mt-4 max-w-3xl text-sm leading-relaxed text-white/85">
            {p}
          </p>
        ))}
        {(str(c.ctaLabel) || buttons.length > 0) && (
          <div className={cn('mt-8 flex flex-wrap gap-3', tall && 'justify-center')}>
            {str(c.ctaLabel) && (
              <BrownButton to={str(c.ctaUrl)} light>
                {str(c.ctaLabel)}
              </BrownButton>
            )}
            {buttons.map((b, i) => (
              <SiteLink
                key={i}
                to={str(b.url)}
                className="rounded-full px-6 py-2 text-sm font-medium text-white transition hover:brightness-110"
                style={{ backgroundColor: str(b.color) || BROWN }}
              >
                {str(b.label)}
              </SiteLink>
            ))}
          </div>
        )}
      </div>
      {tall && (
        <a href="#content" aria-label="Scroll down" className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <img src={A('header-logo.webp')} alt="" className="w-[110px]" />
        </a>
      )}
    </div>
  );
}

function ImageCards({ c }: { c: Obj }) {
  const items = list(c.items);
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-10 md:px-8">
      {str(c.heading) && <H2 className="mb-8">{str(c.heading)}</H2>}
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', items.length >= 3 ? 'lg:grid-cols-3' : '')}>
        {items.map((it, i) => (
          <SiteLink
            key={i}
            to={str(it.linkUrl)}
            className="group relative block aspect-[4/3] overflow-hidden rounded-sm bg-neutral-300"
          >
            {str(it.image) && (
              <img
                src={str(it.image)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
            )}
            <div
              className="absolute inset-0 bg-black/20 transition group-hover:bg-black/55"
              style={str(it.color) ? { backgroundColor: `${str(it.color)}55` } : undefined}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
              {str(it.icon) && (
                <img
                  src={str(it.icon)}
                  alt=""
                  className="h-16 w-16 object-contain transition duration-500 group-hover:-translate-y-2"
                />
              )}
              <h3 className="mt-3 text-lg font-normal drop-shadow">{str(it.title)}</h3>
              {str(it.description) && (
                <p className="mt-2 max-h-0 max-w-sm overflow-hidden text-[13px] leading-relaxed text-white/90 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100">
                  {str(it.description)}
                </p>
              )}
              {str(it.linkLabel) && (
                <span className="mt-3 rounded-full border border-white px-4 py-1 text-xs">
                  {str(it.linkLabel)}
                </span>
              )}
            </div>
          </SiteLink>
        ))}
      </div>
    </div>
  );
}

function ImageText({ c }: { c: Obj }) {
  const dark = c.background === 'dark';
  const accent = c.background === 'accent';
  const right = c.imagePosition === 'right';
  return (
    <div
      style={{ backgroundColor: dark ? BROWN : accent ? PEACH : CREAM }}
      className={dark ? 'text-white' : ''}
    >
      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-10">
        <div className={right ? 'md:order-1' : 'md:order-2'}>
          {str(c.eyebrow) && <p className="mb-2 text-sm font-medium opacity-80">{str(c.eyebrow)}</p>}
          <h2 className="text-2xl font-semibold md:text-[1.75rem]" style={{ color: dark ? '#fff' : INK }}>
            {str(c.heading)}
          </h2>
          {paragraphs(c.body).map((p, i) => (
            <p key={i} className="mt-4 text-[15px] leading-loose">
              {p}
            </p>
          ))}
          {str(c.ctaLabel) && (
            <div className="mt-6">
              <BrownButton to={str(c.ctaUrl)} light={dark}>
                {str(c.ctaLabel)}
              </BrownButton>
            </div>
          )}
        </div>
        <div className={right ? 'md:order-2' : 'md:order-1'}>
          {str(c.image) && (
            <img
              src={str(c.image)}
              alt={str(c.imageAlt)}
              loading="lazy"
              className="w-full rounded-sm object-cover shadow-md"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Gallery({ c }: { c: Obj }) {
  const images = list(c.images);
  if (c.layout === 'logos')
    return (
      <div className="overflow-hidden py-10" style={{ backgroundColor: PEACH }}>
        {str(c.heading) && (
          <H2 center className="mb-8">
            {str(c.heading)}
          </H2>
        )}
        <div className="ws-marquee flex w-max items-center">
          {[...images, ...images, ...images, ...images].map((im, i) => (
            <div key={i} className="flex h-20 w-[260px] shrink-0 items-center justify-center px-8">
              <img
                src={str(im.url)}
                alt={i < images.length ? str(im.alt) : ''}
                aria-hidden={i >= images.length}
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    );
  const collage = c.layout === 'collage';
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
      {str(c.heading) && <H2 className="mb-6">{str(c.heading)}</H2>}
      <div
        className={cn(
          'grid grid-cols-2 gap-4',
          collage ? 'auto-rows-[180px] md:grid-cols-4' : 'md:grid-cols-3',
        )}
      >
        {images.map((im, i) => (
          <img
            key={i}
            src={str(im.url)}
            alt={str(im.alt)}
            loading="lazy"
            className={cn(
              'h-full w-full rounded-sm object-cover',
              collage ? (i % 5 === 0 ? 'col-span-2 row-span-2' : '') : 'aspect-[4/3]',
            )}
          />
        ))}
      </div>
    </div>
  );
}

function NewsCard({
  p,
}: {
  p: {
    slug: string;
    title: string;
    coverImage: string | null;
    publishedAt: string;
    category: { name: string } | null;
  };
}) {
  return (
    <article className="flex w-[290px] shrink-0 flex-col overflow-hidden rounded-md bg-white shadow-[0_2px_14px_rgba(0,0,0,0.08)] sm:w-[400px]">
      <SiteLink to={`/news/${p.slug}`} className="group flex h-full flex-col">
        <div className="aspect-[16/9] overflow-hidden bg-neutral-100">
          {p.coverImage && (
            <img
              src={p.coverImage}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="rounded-full px-3 py-0.5 text-white" style={{ backgroundColor: NAVY }}>
              {p.category?.name ?? 'News'}
            </span>
            <span className="text-neutral-500">{fmtDate(p.publishedAt)}</span>
          </div>
          <h3 className="mt-3 line-clamp-3 text-[15px] font-medium leading-relaxed text-black">{p.title}</h3>
          <span className="mt-auto pt-4 text-right text-xs font-medium text-black underline">
            Read More ...
          </span>
        </div>
      </SiteLink>
    </article>
  );
}

function LatestPosts({ c }: { c: Obj }) {
  const w = useWebsite();
  const count = Number(c.count) || 3;
  const posts = usePosts(w, count, str(c.category) || undefined);
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  const grid = count > 6;
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-12 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <H2>{str(c.heading)}</H2>
        <div className="flex items-center gap-3">
          {str(c.linkLabel) && (
            <SiteLink to={str(c.linkUrl)} className="text-sm text-black underline">
              {str(c.linkLabel)}
            </SiteLink>
          )}
          {!grid && (
            <>
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Previous news"
                className="rounded-full border border-[#552A0E]/30 p-1.5 hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Next news"
                className="rounded-full border border-[#552A0E]/30 p-1.5 hover:bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {posts.data && posts.data.length === 0 && <p className="py-6 text-sm">No news yet.</p>}
      <div
        ref={track}
        className={
          grid
            ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 [&>article]:w-auto'
            : 'ws-scroller flex gap-6 overflow-x-auto pb-4'
        }
      >
        {(posts.data ?? []).map((p) => (
          <NewsCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function FormBlock({ c }: { c: Obj }) {
  const tone = c.background === 'dark' ? BROWN : c.background === 'accent' ? PEACH : CREAM;
  const dark = c.background === 'dark';
  return (
    <div style={{ backgroundColor: tone }} className={dark ? 'text-white' : ''}>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h2
          className="text-center text-2xl font-semibold md:text-[1.75rem]"
          style={{ color: dark ? '#fff' : INK }}
        >
          {str(c.heading)}
        </h2>
        {str(c.body) && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed">{str(c.body)}</p>
        )}
        <div className="mt-10 rounded-lg bg-white p-6 text-[#562E15] shadow-[0_2px_14px_rgba(0,0,0,0.06)] md:p-8">
          <PublicFormView
            formKey={str(c.formKey)}
            classes={{
              label: 'mb-1 block text-[13px] font-medium',
              input:
                'w-full rounded-md border border-[#e3d6cb] bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-[#552A0E] focus:ring-2 focus:ring-[#552A0E]/15',
              option: 'inline-flex items-center gap-2 text-sm',
              button:
                'rounded-full bg-[#552A0E] px-8 py-2.5 text-sm font-medium text-white transition hover:brightness-125 disabled:opacity-60',
              error: 'mt-1 text-xs font-medium text-[#b42318]',
              success: 'rounded-md bg-[#F6DFCF] p-6 text-center text-[15px] font-medium',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Generic({ type, c }: { type: SectionType; c: Obj }) {
  switch (type) {
    case 'RICH_TEXT':
      return (
        <div className="mx-auto max-w-5xl px-6 py-14 text-center">
          <div
            className="ws-prose text-[15px] leading-loose [&_h2]:mb-5 [&_h2]:font-semibold [&_h2]:text-[#562E15]"
            dangerouslySetInnerHTML={{ __html: str(c.html) }}
          />
        </div>
      );
    case 'FEATURE_CARDS':
      return (
        <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
          <H2 center>{str(c.heading)}</H2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {list(c.items).map((it, i) => (
              <div key={i} className="rounded-md bg-white p-6 shadow-[0_2px_14px_rgba(0,0,0,0.06)]">
                <img src={A(`icon-${(i % 3) + 1}.webp`)} alt="" className="h-10 w-10 object-contain" />
                <h3 className="mt-4 text-lg font-medium">{str(it.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed">{str(it.description)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'STATS':
      return (
        <div style={{ backgroundColor: BROWN }} className="py-14 text-white">
          <div className="mx-auto max-w-[1320px] px-5 text-center md:px-10">
            {str(c.heading) && <h2 className="text-2xl font-semibold">{str(c.heading)}</h2>}
            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
              {list(c.items).map((it, i) => (
                <div key={i}>
                  <p className="text-4xl font-semibold">{str(it.value)}</p>
                  <p className="mt-1 text-sm text-white/80">{str(it.label)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'TESTIMONIALS':
      return (
        <div style={{ backgroundColor: PEACH }} className="py-14">
          <div className="mx-auto max-w-[1320px] px-5 md:px-10">
            <H2 center>{str(c.heading)}</H2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {list(c.items).map((it, i) => (
                <figure key={i} className="rounded-md bg-white p-6">
                  <blockquote className="text-[15px] leading-relaxed">“{str(it.quote)}”</blockquote>
                  <figcaption className="mt-4 text-sm font-medium">
                    {str(it.author)}
                    {str(it.role) && <span className="font-light opacity-70"> · {str(it.role)}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      );
    case 'FAQ':
      return (
        <div className="mx-auto max-w-3xl px-5 py-14">
          <H2 className="mb-6">{str(c.heading)}</H2>
          {list(c.items).map((it, i) => (
            <details key={i} className="group mb-3 rounded-md bg-white px-5 py-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {str(it.question)}
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed">{str(it.answer)}</p>
            </details>
          ))}
        </div>
      );
    case 'CTA':
      return (
        <div style={{ backgroundColor: PEACH }} className="px-5 py-16 text-center">
          <H2 center>{str(c.heading)}</H2>
          {str(c.body) && <p className="mx-auto mt-3 max-w-xl text-[15px]">{str(c.body)}</p>}
          <div className="mt-6">
            <BrownButton to={str(c.buttonUrl)}>{str(c.buttonLabel)}</BrownButton>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function Section({ type, content }: { type: SectionType; content: Obj }) {
  switch (type) {
    case 'HERO':
      return <Hero c={content} />;
    case 'IMAGE_CARDS':
      return <ImageCards c={content} />;
    case 'IMAGE_TEXT':
      return <ImageText c={content} />;
    case 'GALLERY':
      return <Gallery c={content} />;
    case 'LATEST_POSTS':
      return <LatestPosts c={content} />;
    case 'FORM':
      return <FormBlock c={content} />;
    default:
      return <Generic type={type} c={content} />;
  }
}

function PostView({ post }: { post: PublicPost }) {
  return (
    <article className="pb-16">
      <div className="mx-auto max-w-4xl px-5 pt-12">
        <SiteLink to="/media-center" className="text-sm underline">
          ← Media Center
        </SiteLink>
        <div className="mt-6 flex items-center gap-3 text-xs">
          <span className="rounded-full px-3 py-0.5 text-white" style={{ backgroundColor: NAVY }}>
            {post.category?.name ?? 'News'}
          </span>
          <span className="text-neutral-500">{fmtDate(post.publishedAt)}</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold leading-snug md:text-[2rem]" style={{ color: INK }}>
          {post.title}
        </h1>
        {post.coverImage && (
          <img src={post.coverImage} alt="" className="mt-8 w-full rounded-md object-cover" />
        )}
        <div
          className="ws-prose mt-8 text-[15px] leading-loose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </article>
  );
}

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <img src={A('icon-1.webp')} alt="" className="h-14 w-14 object-contain" />
      <H2 center className="mt-5">
        {title}
      </H2>
      {body && <p className="mt-3 text-sm">{body}</p>}
      <div className="mt-6">
        <BrownButton to="/">Back to home</BrownButton>
      </div>
    </div>
  );
}

export const danTheme: ThemeModule = {
  fonts: 'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap',
  Layout,
  Section,
  PostView,
  Message,
};
