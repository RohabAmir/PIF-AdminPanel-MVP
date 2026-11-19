import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
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

const A = (f: string) => `/websites/tuaja/${f}`;
const GOLD = '#C8985A';
const GOLD_BTN = '#D5A66B';
const INK = '#575757';
// Plain class (not an arbitrary Tailwind value) so tailwind-merge never drops it next to font-weight classes.
const serif = 'ws-serif';

const H2 = ({
  children,
  className,
  color = GOLD,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) => (
  <h2
    className={cn(serif, 'text-2xl font-semibold uppercase tracking-wide md:text-[1.75rem]', className)}
    style={{ color }}
  >
    {children}
  </h2>
);

const GoldButton = ({ to, children, dark }: { to: string; children: ReactNode; dark?: boolean }) => (
  <SiteLink
    to={to}
    className={cn(
      serif,
      'inline-block rounded px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:brightness-110',
    )}
    style={{ backgroundColor: dark ? INK : GOLD_BTN }}
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
        solid ? 'bg-black/75 backdrop-blur' : 'bg-gradient-to-b from-black/50 to-transparent',
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 md:px-8">
        <SiteLink to="/" ariaLabel="Tuaja Luxury Resorts — home">
          <img src={A('nav-logo.webp')} alt="Tuaja Luxury Resorts" className="h-9 w-auto md:h-10" />
        </SiteLink>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                <SiteLink
                  to={`/${item.slug}`}
                  className={cn(
                    serif,
                    'flex items-center gap-1 py-6 text-[12px] font-medium uppercase tracking-wider text-white/90 hover:text-white',
                  )}
                >
                  {item.title}
                  {item.children.length > 0 && <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />}
                </SiteLink>
                {item.children.length > 0 && (
                  <ul className="invisible absolute left-1/2 top-full min-w-[220px] -translate-x-1/2 rounded-b bg-black/85 py-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.id}>
                        <SiteLink
                          to={`/${c.slug}`}
                          className={cn(
                            serif,
                            'block px-5 py-2 text-[11px] uppercase tracking-wider text-white/85 hover:bg-white/10 hover:text-white',
                          )}
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
          {nav.map((item) => (
            <div key={item.id} className="py-2">
              <SiteLink
                to={`/${item.slug}`}
                className={cn(serif, 'block py-1 text-sm uppercase tracking-wider text-white')}
              >
                {item.title}
              </SiteLink>
              {item.children.map((c) => (
                <SiteLink key={c.id} to={`/${c.slug}`} className="block py-1 pl-4 text-[13px] text-white/75">
                  {c.title}
                </SiteLink>
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}

function Footer({ nav, social }: { nav: NavItem[]; social: PublicSocial[] }) {
  return (
    <footer className="bg-white">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 md:grid-cols-[1.2fr_2fr] md:px-12">
        <div>
          <img src={A('footer-logo.webp')} alt="Tuaja Luxury Resorts" className="h-10 w-auto" />
          <p className="mt-4 max-w-md text-[13px] leading-relaxed" style={{ color: INK }}>
            With a vision to create rich and unforgettable experiences that connect guests to the Kingdom’s
            stunning natural landscapes, culture, and hospitality, Tuaja Luxury Resorts is an exquisite
            creation under the patronage of Dan Company, a PIF company.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {nav.map((item) => (
            <div key={item.id}>
              <p className={cn(serif, 'mb-3 text-[13px] font-semibold')} style={{ color: '#1A202C' }}>
                {item.title}
              </p>
              <ul className="space-y-1.5">
                {(item.children.length ? item.children : [item]).map((c) => (
                  <li key={c.id}>
                    <SiteLink
                      to={`/${c.slug}`}
                      className="text-[13px] hover:underline"
                      style={{ color: INK }}
                    >
                      {c.title}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#4A4A4A] text-white/85">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center gap-3 px-5 py-4 text-[11px] md:flex-row md:justify-between md:px-12">
          <div className="flex gap-5">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <SiteLink to="/">© Tuaja Luxury Resorts</SiteLink>
          </div>
          <SocialIcons
            links={social}
            className="flex items-center gap-6"
            iconClassName="h-5 w-5 text-[#D5A66B]"
          />
          <span className="opacity-70">Powered by PIF Admin Panel</span>
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
    <div className="ws bg-white font-['Montserrat',_sans-serif] font-light" style={{ color: INK }}>
      <Header nav={nav} overlay={overlayHeader} />
      <main className={overlayHeader ? undefined : 'pt-[72px]'}>{children}</main>
      <Footer nav={nav} social={social} />
    </div>
  );
}

// ───────────── sections ─────────────

function Hero({ c }: { c: Obj }) {
  const video = str(c.backgroundVideo);
  const body = paragraphs(c.body);
  const buttons = list(c.buttons);
  if (video)
    return (
      <div className="relative h-[100svh] min-h-[520px] overflow-hidden bg-black">
        <BackgroundVideo
          src={video}
          poster={str(c.backgroundImage)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
        <div className="relative flex h-full flex-col items-center justify-end pb-24 text-center text-white">
          {str(c.overlayImage) && <img src={str(c.overlayImage)} alt="" className="mb-6 max-h-40 w-auto" />}
          <h1 className={cn(serif, 'px-6 text-3xl uppercase tracking-[0.2em] md:text-5xl')}>
            {str(c.heading)}
          </h1>
          {str(c.subheading) && (
            <p className="mt-3 text-sm tracking-wide text-white/85">{str(c.subheading)}</p>
          )}
          {str(c.ctaLabel) && (
            <div className="mt-6">
              <GoldButton to={str(c.ctaUrl)}>{str(c.ctaLabel)}</GoldButton>
            </div>
          )}
        </div>
      </div>
    );
  const intro = body.length > 0 || buttons.length > 0;
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        intro ? 'py-20 md:py-28' : 'flex h-[62vh] min-h-[380px] items-end pb-16',
      )}
    >
      {str(c.backgroundImage) && (
        <img src={str(c.backgroundImage)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className={cn(
          'absolute inset-0',
          intro ? 'bg-[#0d2a2a]/55' : 'bg-gradient-to-t from-black/70 via-black/20 to-black/30',
        )}
      />
      <div className="relative mx-auto w-full max-w-4xl px-6 text-center text-white">
        <h1 className={cn(serif, 'text-2xl uppercase tracking-wide md:text-[2rem]')}>
          {str(c.heading)}
          {str(c.subheading) && (
            <span className="mt-2 block" style={{ color: intro ? GOLD_BTN : undefined }}>
              {str(c.subheading)}
            </span>
          )}
        </h1>
        {body.map((p, i) => (
          <p key={i} className="mx-auto mt-5 max-w-3xl text-[13px] leading-relaxed text-white/90 md:text-sm">
            {p}
          </p>
        ))}
        {(buttons.length > 0 || str(c.ctaLabel)) && (
          <div className="mt-10 flex flex-wrap justify-center gap-4 md:gap-6">
            {str(c.ctaLabel) && <GoldButton to={str(c.ctaUrl)}>{str(c.ctaLabel)}</GoldButton>}
            {buttons.map((b, i) => (
              <SiteLink
                key={i}
                to={str(b.url)}
                className={cn(
                  serif,
                  'flex min-h-[46px] w-full max-w-[250px] items-center justify-center rounded px-4 py-2 text-center text-[12px] uppercase leading-tight tracking-wide text-white shadow-lg transition hover:brightness-110 sm:w-[250px]',
                )}
                style={{ backgroundColor: str(b.color) || GOLD }}
              >
                {str(b.label)}
              </SiteLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageCards({ c }: { c: Obj }) {
  const items = list(c.items);
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-12">
      {str(c.heading) && (
        <div className="mb-8 flex items-center gap-3">
          <H2 color="#3d3d3d">{str(c.heading)}</H2>
          <img src={A('lotus.svg')} alt="" className="h-8 w-8" />
        </div>
      )}
      <div
        className={cn(
          'grid grid-cols-1 gap-5 sm:grid-cols-2',
          items.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        )}
      >
        {items.map((it, i) => {
          const color = str(it.color) || GOLD;
          const words = str(it.title).split(' ');
          return (
            <article key={i} className="group">
              <div className="relative aspect-[1/1.6] overflow-hidden bg-neutral-200 sm:aspect-[1/2] lg:aspect-[1/2]">
                {str(it.image) && (
                  <img
                    src={str(it.image)}
                    alt={str(it.title)}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                {str(it.icon) && (
                  <img
                    src={str(it.icon)}
                    alt=""
                    className="absolute -right-10 top-[48%] h-36 w-36 opacity-90"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white">
                  {str(it.description) && (
                    <p className="text-[12px] leading-relaxed text-white/90">{str(it.description)}</p>
                  )}
                  {str(it.linkLabel) && (
                    <div className="mt-4">
                      <GoldButton to={str(it.linkUrl)}>{str(it.linkLabel)}</GoldButton>
                    </div>
                  )}
                </div>
              </div>
              <SiteLink to={str(it.linkUrl)} className="mt-4 flex flex-col items-center text-center">
                {str(it.icon) && <img src={str(it.icon)} alt="" className="mb-2 h-8 w-8" />}
                <span
                  className={cn(serif, 'text-lg uppercase leading-tight tracking-wide')}
                  style={{ color }}
                >
                  {words.length > 1 ? (
                    <>
                      {words.slice(0, -1).join(' ')}
                      <br />
                      {words[words.length - 1]}
                    </>
                  ) : (
                    str(it.title)
                  )}
                </span>
              </SiteLink>
            </article>
          );
        })}
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
      className={cn('relative', dark ? 'mt-10 bg-black text-white' : accent ? 'bg-[#f6efe6]' : 'bg-white')}
    >
      <div
        className={cn(
          'mx-auto grid max-w-[1320px] items-center gap-10 px-5 md:grid-cols-2 md:px-12',
          dark ? 'py-12' : 'py-16',
        )}
      >
        <div className={cn(right ? 'md:order-1' : 'md:order-2', !right && 'md:pl-8')}>
          <H2>{str(c.heading)}</H2>
          {str(c.eyebrow) && (
            <p className={cn('mt-2 text-[13px] font-medium', dark ? 'text-white' : 'text-[#3d3d3d]')}>
              {str(c.eyebrow)}
            </p>
          )}
          {paragraphs(c.body).map((p, i) => (
            <p key={i} className={cn('mt-4 text-[13px] leading-relaxed', dark ? 'text-white/80' : '')}>
              {p}
            </p>
          ))}
          {str(c.ctaLabel) && (
            <div className="mt-6">
              <GoldButton to={str(c.ctaUrl)} dark={!dark}>
                {str(c.ctaLabel)}
              </GoldButton>
            </div>
          )}
        </div>
        <div className={cn(right ? 'md:order-2' : 'md:order-1', dark && 'relative md:-mb-24 md:-mt-6')}>
          {str(c.image) && (
            <img
              src={str(c.image)}
              alt={str(c.imageAlt)}
              loading="lazy"
              className={cn(
                'mx-auto w-full object-contain',
                dark ? 'max-h-[440px] object-bottom md:scale-110' : 'max-h-[520px]',
              )}
            />
          )}
        </div>
      </div>
      {dark && <div className="hidden h-16 bg-white md:block" />}
    </div>
  );
}

const COLLAGE = [
  'md:col-span-4 md:row-span-1',
  'md:col-span-4 md:row-span-1',
  'md:col-span-4 md:row-span-1',
  'md:col-span-4 md:row-span-2',
  'md:col-span-8 md:row-span-1',
  'md:col-span-4 md:row-span-1',
  'md:col-span-4 md:row-span-1',
];

function Gallery({ c }: { c: Obj }) {
  const images = list(c.images);
  if (c.layout === 'logos')
    return (
      <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-12">
        {str(c.heading) && <H2 className="mb-8 text-center">{str(c.heading)}</H2>}
        <div className="flex flex-wrap items-center justify-center gap-10">
          {images.map((im, i) => (
            <img key={i} src={str(im.url)} alt={str(im.alt)} className="h-14 w-auto object-contain" />
          ))}
        </div>
      </div>
    );
  if (c.layout === 'collage')
    return (
      <div
        className="relative overflow-hidden bg-[#D9AE7C] bg-cover bg-center py-14"
        style={{ backgroundImage: `url(${A('rosegold.svg')})` }}
      >
        <div className="mx-auto max-w-[1180px] px-5 md:px-12">
          {str(c.heading) && (
            <H2 color="#6b4a2b" className="mb-6 max-w-xs leading-snug">
              {str(c.heading)}
            </H2>
          )}
          <div className="grid auto-rows-[160px] grid-cols-2 gap-4 md:auto-rows-[200px] md:grid-cols-12">
            {images.map((im, i) => (
              <div key={i} className={cn('overflow-hidden shadow-md', COLLAGE[i % COLLAGE.length])}>
                <img
                  src={str(im.url)}
                  alt={str(im.alt)}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-12">
      {str(c.heading) && <H2 className="mb-6">{str(c.heading)}</H2>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((im, i) => (
          <img
            key={i}
            src={str(im.url)}
            alt={str(im.alt)}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        ))}
      </div>
    </div>
  );
}

function LatestPosts({ c }: { c: Obj }) {
  const w = useWebsite();
  const posts = usePosts(w, Number(c.count) || 3, str(c.category) || undefined);
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) =>
    track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <H2>{str(c.heading)}</H2>
        {str(c.linkLabel) && (
          <SiteLink
            to={str(c.linkUrl)}
            className={cn(serif, 'text-xs uppercase tracking-wider underline')}
            style={{ color: GOLD }}
          >
            {str(c.linkLabel)}
          </SiteLink>
        )}
      </div>
      {posts.data && posts.data.length === 0 && (
        <p className="py-6 text-center text-sm">No press releases yet.</p>
      )}
      <div ref={track} className="ws-scroller flex gap-6 overflow-x-auto pb-2">
        {(posts.data ?? []).map((p) => (
          <article key={p.id} className="w-[280px] shrink-0 sm:w-[340px]">
            <SiteLink to={`/news/${p.slug}`} className="group block">
              <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
                {p.coverImage && (
                  <img
                    src={p.coverImage}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-wider" style={{ color: GOLD }}>
                {p.category?.name ?? 'Press'} · {fmtDate(p.publishedAt)}
              </p>
              <h3
                className={cn(
                  serif,
                  'mt-1 line-clamp-3 text-[15px] font-semibold leading-snug text-[#2d2d2d] group-hover:underline',
                )}
              >
                {p.title}
              </h3>
            </SiteLink>
          </article>
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-8">
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous">
          <img src={A('arrow-left.svg')} alt="" className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next">
          <img src={A('arrow-right.svg')} alt="" className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

function FormBlock({ c }: { c: Obj }) {
  const accent = c.background === 'accent' || c.background === 'dark';
  return (
    <div className={accent ? 'bg-[#f6efe6]' : 'bg-white'}>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <H2 className="text-center">{str(c.heading)}</H2>
        {str(c.body) && (
          <p className="mx-auto mt-3 max-w-xl text-center text-[13px] leading-relaxed">{str(c.body)}</p>
        )}
        <div className="mt-10">
          <PublicFormView
            formKey={str(c.formKey)}
            buttonStyle={{ backgroundColor: GOLD_BTN }}
            classes={{
              label: cn(
                serif,
                'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#3d3d3d]',
              ),
              input:
                'w-full border-0 border-b border-[#c9b79c] bg-transparent px-0 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#C8985A] focus:ring-0',
              option: 'inline-flex items-center gap-2 text-[13px]',
              button: cn(
                serif,
                'rounded px-8 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60',
              ),
              error: 'mt-1 text-xs font-medium text-[#9D405F]',
              success: cn(
                serif,
                'rounded border border-[#C8985A]/40 bg-[#C8985A]/10 p-6 text-center text-sm text-[#6b4a2b]',
              ),
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
        <div
          className="ws-prose mx-auto max-w-3xl px-5 py-14 text-[14px] leading-relaxed [&_h2]:font-['Cinzel',_serif] [&_h2]:uppercase [&_h2]:text-[#C8985A]"
          dangerouslySetInnerHTML={{ __html: str(c.html) }}
        />
      );
    case 'FEATURE_CARDS':
      return (
        <div className="mx-auto max-w-[1180px] px-5 py-14 text-center md:px-12">
          <H2>{str(c.heading)}</H2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {list(c.items).map((it, i) => (
              <div key={i} className="flex flex-col items-center">
                <img src={A(`lotus-${(i % 3) + 1}.svg`)} alt="" className="h-12 w-12" />
                <h3 className={cn(serif, 'mt-4 text-lg uppercase text-[#3d3d3d]')}>{str(it.title)}</h3>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed">{str(it.description)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'STATS':
      return (
        <div
          className="bg-cover bg-center py-14 text-white"
          style={{ backgroundColor: GOLD, backgroundImage: `url(${A('rosegold.svg')})` }}
        >
          <div className="mx-auto max-w-[1180px] px-5 text-center">
            {str(c.heading) && <H2 color="#fff">{str(c.heading)}</H2>}
            <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
              {list(c.items).map((it, i) => (
                <div key={i}>
                  <p className={cn(serif, 'text-4xl')}>{str(it.value)}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-white/85">{str(it.label)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'TESTIMONIALS':
      return (
        <div className="bg-[#f6efe6] py-14">
          <div className="mx-auto max-w-[1180px] px-5 text-center">
            <H2>{str(c.heading)}</H2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {list(c.items).map((it, i) => (
                <figure key={i} className="bg-white p-8 shadow-sm">
                  <blockquote className={cn(serif, 'text-[15px] leading-relaxed text-[#3d3d3d]')}>
                    “{str(it.quote)}”
                  </blockquote>
                  <figcaption className="mt-4 text-xs uppercase tracking-wider" style={{ color: GOLD }}>
                    {str(it.author)}
                    {str(it.role) && ` · ${str(it.role)}`}
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
            <details key={i} className="group border-b border-[#e7dccb] py-4">
              <summary
                className={cn(
                  serif,
                  'flex cursor-pointer list-none items-center justify-between text-[15px] text-[#3d3d3d]',
                )}
              >
                {str(it.question)}
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" style={{ color: GOLD }} />
              </summary>
              <p className="mt-3 text-[13px] leading-relaxed">{str(it.answer)}</p>
            </details>
          ))}
        </div>
      );
    case 'CTA':
      return (
        <div
          className="bg-cover bg-center py-16 text-center"
          style={{ backgroundColor: '#D9AE7C', backgroundImage: `url(${A('rosegold.svg')})` }}
        >
          <H2 color="#4a3320">{str(c.heading)}</H2>
          {str(c.body) && <p className="mx-auto mt-3 max-w-xl text-sm text-[#4a3320]">{str(c.body)}</p>}
          <div className="mt-6">
            <GoldButton to={str(c.buttonUrl)} dark>
              {str(c.buttonLabel)}
            </GoldButton>
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
    <article>
      <div className="relative flex h-[52vh] min-h-[340px] items-end overflow-hidden bg-black pb-12">
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="relative mx-auto w-full max-w-4xl px-6 text-white">
          <p className="text-xs uppercase tracking-wider" style={{ color: GOLD_BTN }}>
            {post.category?.name ?? 'Press'} · {fmtDate(post.publishedAt)} · {post.readingTime} min read
          </p>
          <h1 className={cn(serif, 'mt-3 text-2xl leading-snug md:text-4xl')}>{post.title}</h1>
        </div>
      </div>
      <div
        className="ws-prose mx-auto max-w-3xl px-5 py-14 text-[15px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <GoldButton to="/media-center">← Back to Media Center</GoldButton>
      </div>
    </article>
  );
}

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <img src={A('lotus.svg')} alt="" className="h-14 w-14" />
      <H2 className="mt-5">{title}</H2>
      {body && <p className="mt-3 text-sm">{body}</p>}
      <div className="mt-6">
        <GoldButton to="/">Back to home</GoldButton>
      </div>
    </div>
  );
}

export const tuajaTheme: ThemeModule = {
  fonts:
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap',
  Layout,
  Section,
  PostView,
  Message,
};
