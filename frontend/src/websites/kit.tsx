import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { FormField, SocialPlatform } from '@/lib/types';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/BrandIcons';
import { publicApi, PublicApiError, usePublicForm, type PublicSeo, type PublicSocial } from './data';
import type { WebsiteConfig } from './registry';

export type Obj = Record<string, unknown>;
export const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
export const list = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
export const paragraphs = (v: unknown): string[] =>
  str(v)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

// ───────────── website context & links ─────────────

const WebsiteCtx = createContext<WebsiteConfig | null>(null);
export const WebsiteProvider = WebsiteCtx.Provider;
export function useWebsite(): WebsiteConfig {
  const w = useContext(WebsiteCtx);
  if (!w) throw new Error('useWebsite must be used inside a website');
  return w;
}

/** Maps a CMS link to a URL on this website: `/eco-resort` → `/websites/tuaja/eco-resort`. */
export function resolveHref(w: WebsiteConfig, url: string): { to: string; external: boolean } | null {
  const u = url.trim();
  if (!u) return null;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return { to: u, external: true };
  if (u.startsWith('#') || u.startsWith('/websites/')) return { to: u, external: false };
  if (u === '/' || u === '/home') return { to: `/websites/${w.path}`, external: false };
  if (u.startsWith('/')) return { to: `/websites/${w.path}${u}`, external: false };
  return { to: `/websites/${w.path}/${u}`, external: false };
}

export function SiteLink({
  to,
  className,
  style,
  children,
  ariaLabel,
}: {
  to: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const w = useWebsite();
  const r = resolveHref(w, to);
  if (!r)
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  if (r.external)
    return (
      <a
        href={r.to}
        className={className}
        style={style}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  if (r.to.startsWith('#'))
    return (
      <a href={r.to} className={className} style={style} aria-label={ariaLabel}>
        {children}
      </a>
    );
  return (
    <Link to={r.to} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

// ───────────── media ─────────────

/** Muted, looping background video; falls back to the poster image. */
export function BackgroundVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    // Some browsers ignore the autoplay attribute after a src change; nudge playback.
    ref.current?.play().catch(() => {});
  }, [src]);
  return (
    <video
      ref={ref}
      key={src}
      className={className}
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
    />
  );
}

const SOCIAL_ICON: Partial<Record<SocialPlatform, (p: { className?: string }) => ReactNode>> = {
  YOUTUBE: YoutubeIcon,
  X: XIcon,
  INSTAGRAM: InstagramIcon,
  LINKEDIN: LinkedinIcon,
  FACEBOOK: FacebookIcon,
  TIKTOK: TiktokIcon,
};

export function SocialIcons({
  links,
  className,
  iconClassName,
}: {
  links: PublicSocial[];
  className?: string;
  iconClassName?: string;
}) {
  return (
    <ul className={className}>
      {links.map((l) => {
        const Icon = SOCIAL_ICON[l.platform];
        return (
          <li key={l.platform}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              aria-label={l.platform.toLowerCase()}
              className="block transition-opacity hover:opacity-70"
            >
              {Icon ? (
                <Icon className={iconClassName} />
              ) : (
                <span className="text-xs font-semibold">{l.platform}</span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────── document head ─────────────

function setMeta(attr: 'name' | 'property', key: string, value: string | null | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!value) return el?.remove();
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

/** Applies the SEO block returned by the public API to the document head. */
export function useSeo(seo: PublicSeo | undefined, fallbackTitle: string) {
  useEffect(() => {
    document.title = seo?.title || fallbackTitle;
    setMeta('name', 'description', seo?.description);
    setMeta('name', 'robots', seo?.robots);
    setMeta('property', 'og:title', seo?.og.title);
    setMeta('property', 'og:description', seo?.og.description);
    setMeta('property', 'og:image', seo?.og.image);
  }, [seo, fallbackTitle]);
}

/** Loads a theme's web fonts once. */
export function useFonts(href: string) {
  useEffect(() => {
    if (document.querySelector(`link[data-website-fonts="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.websiteFonts = href;
    document.head.appendChild(link);
  }, [href]);
}

/** Scrolls to the top on page change, or to the #anchor when present. */
export function useScrollRestore() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0 });
  }, [pathname, hash]);
}

export const fmtDate = (iso: string) => (iso ? iso.slice(0, 10) : '');

// ───────────── public form ─────────────

export interface FormClasses {
  label: string;
  input: string;
  button: string;
  error: string;
  success: string;
  option: string;
}

/** Renders a CMS form from the public API; submissions become leads in the admin panel. */
export function PublicFormView({
  formKey,
  classes,
  buttonStyle,
}: {
  formKey: string;
  classes: FormClasses;
  buttonStyle?: CSSProperties;
}) {
  const w = useWebsite();
  const { pathname } = useLocation();
  const form = usePublicForm(w, formKey);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [hp, setHp] = useState('');

  if (form.isLoading) return <p className="opacity-70">Loading form…</p>;
  if (form.isError || !form.data)
    return <p className={classes.error}>This form is not available right now.</p>;

  const set = (name: string, v: unknown) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors(({ [name]: _x, ...rest }) => rest);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const sourcePage = pathname.replace(`/websites/${w.path}`, '') || '/';
      const res = await publicApi.submit(w, formKey, values, sourcePage, hp);
      setStatus({ ok: true, message: res.message });
      setValues({});
      setErrors({});
    } catch (err) {
      if (err instanceof PublicApiError && err.details.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.errors[0] ?? 'Invalid value'])));
      }
      setStatus({ ok: false, message: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setSending(false);
    }
  };

  if (status?.ok)
    return (
      <p role="status" className={classes.success}>
        {status.message}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {form.data.fields.map((f) => (
        <FormFieldView
          key={f.name}
          field={f}
          value={values[f.name]}
          onChange={(v) => set(f.name, v)}
          error={errors[f.name]}
          classes={classes}
        />
      ))}
      {/* Honeypot: invisible to people, tempting to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden
      />
      {status && !status.ok && (
        <p role="alert" className={`${classes.error} sm:col-span-2`}>
          {status.message}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={sending} className={classes.button} style={buttonStyle}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}

function FormFieldView({
  field: f,
  value,
  onChange,
  error,
  classes,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  classes: FormClasses;
}) {
  const id = `f-${f.name}`;
  const wide = f.type === 'textarea' || f.type === 'radio' || (f.type === 'checkbox' && !f.options?.length);
  const label = (
    <>
      {f.label}
      {f.required && <span aria-hidden> *</span>}
    </>
  );
  const err = error && (
    <p id={`${id}-err`} className={classes.error}>
      {error}
    </p>
  );
  const common = {
    id,
    name: f.name,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-err` : undefined,
  };
  const s = typeof value === 'string' ? value : '';

  if (f.type === 'checkbox' && !f.options?.length)
    return (
      <div className="sm:col-span-2">
        <label className={classes.option}>
          <input
            type="checkbox"
            {...common}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />{' '}
          <span>{label}</span>
        </label>
        {err}
      </div>
    );
  if (f.type === 'checkbox' || f.type === 'radio') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className={wide ? 'sm:col-span-2' : undefined} aria-invalid={!!error}>
        <legend className={classes.label}>{label}</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
          {(f.options ?? []).map((o) => (
            <label key={o} className={classes.option}>
              {f.type === 'radio' ? (
                <input type="radio" name={f.name} checked={s === o} onChange={() => onChange(o)} />
              ) : (
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))}
                />
              )}{' '}
              <span>{o}</span>
            </label>
          ))}
        </div>
        {err}
      </fieldset>
    );
  }
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      {f.type === 'textarea' ? (
        <textarea
          {...common}
          rows={5}
          className={classes.input}
          placeholder={f.placeholder}
          maxLength={f.maxLength}
          value={s}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : f.type === 'select' ? (
        <select {...common} className={classes.input} value={s} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(f.options ?? []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
          className={classes.input}
          placeholder={f.placeholder}
          maxLength={f.maxLength}
          value={s}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {err}
    </div>
  );
}
