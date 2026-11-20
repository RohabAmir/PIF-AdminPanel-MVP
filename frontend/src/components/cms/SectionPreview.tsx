import type { SectionType } from '@/lib/types';
import { cn } from '@/lib/utils';

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown) => (Array.isArray(v) ? (v as Obj[]) : []);

/** Simple visual preview of a block as a tenant website might render it. */
export function SectionPreview({
  type,
  content,
  accent = '#4A4A89',
}: {
  type: SectionType;
  content: Obj;
  accent?: string;
}) {
  switch (type) {
    case 'HERO': {
      const buttons = list(content.buttons);
      return (
        <div className="relative overflow-hidden rounded-lg bg-sidebar px-6 py-12 text-center text-white">
          {str(content.backgroundVideo) ? (
            <video
              src={str(content.backgroundVideo)}
              poster={str(content.backgroundImage) || undefined}
              muted
              autoPlay
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          ) : (
            str(content.backgroundImage) && (
              <img
                src={str(content.backgroundImage)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
            )
          )}
          <div className="relative">
            {str(content.overlayImage) && (
              <img src={str(content.overlayImage)} alt="" className="mx-auto mb-3 max-h-20" />
            )}
            <h3 className="text-xl font-bold text-white">{str(content.heading)}</h3>
            {str(content.subheading) && (
              <p className="mx-auto mt-2 max-w-md text-xs text-white/85">{str(content.subheading)}</p>
            )}
            {str(content.body) && (
              <p className="mx-auto mt-2 line-clamp-4 max-w-lg text-[11px] text-white/80">
                {str(content.body)}
              </p>
            )}
            {(str(content.ctaLabel) || buttons.length > 0) && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {str(content.ctaLabel) && (
                  <span
                    className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {str(content.ctaLabel)}
                  </span>
                )}
                {buttons.map((b, i) => (
                  <span
                    key={i}
                    className="inline-block rounded px-3 py-1.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: str(b.color) || accent }}
                  >
                    {str(b.label)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    case 'RICH_TEXT':
      return (
        <div
          className="prose-content rounded-lg bg-white p-4"
          dangerouslySetInnerHTML={{ __html: str(content.html) }}
        />
      );
    case 'IMAGE_TEXT':
      return (
        <div
          className={cn(
            'flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center',
            content.imagePosition === 'right' && 'sm:flex-row-reverse',
            content.background === 'dark'
              ? 'bg-sidebar text-white'
              : content.background === 'accent'
                ? 'bg-qa-soft'
                : 'bg-white',
          )}
        >
          <div className="aspect-video w-full overflow-hidden rounded-md bg-body sm:w-2/5">
            {str(content.image) && (
              <img
                src={str(content.image)}
                alt={str(content.imageAlt)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex-1">
            <h3 className={cn('font-bold', content.background === 'dark' && 'text-white')}>
              {str(content.heading)}
            </h3>
            {str(content.eyebrow) && <p className="mt-1 text-xs font-semibold">{str(content.eyebrow)}</p>}
            <p
              className={cn(
                'mt-1 line-clamp-6 whitespace-pre-line text-xs',
                content.background === 'dark' ? 'text-white/75' : 'text-muted',
              )}
            >
              {str(content.body)}
            </p>
            {str(content.ctaLabel) && (
              <span
                className="mt-3 inline-block rounded px-3 py-1 text-[11px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {str(content.ctaLabel)}
              </span>
            )}
          </div>
        </div>
      );
    case 'FEATURE_CARDS':
      return (
        <div className="rounded-lg bg-white p-4">
          <h3 className="mb-3 text-center font-bold">{str(content.heading)}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {list(content.items).map((it, i) => (
              <div key={i} className="rounded-md border border-line p-3">
                <span
                  className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold uppercase text-white"
                  style={{ backgroundColor: accent }}
                >
                  {str(it.icon).slice(0, 2) || '★'}
                </span>
                <p className="text-sm font-semibold">{str(it.title)}</p>
                <p className="mt-1 text-xs text-muted">{str(it.description)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'STATS':
      return (
        <div className="rounded-lg p-4 text-white" style={{ backgroundColor: accent }}>
          {str(content.heading) && (
            <h3 className="mb-3 text-center font-bold text-white">{str(content.heading)}</h3>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {list(content.items).map((it, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold">{str(it.value)}</p>
                <p className="text-[11px] text-white/80">{str(it.label)}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case 'TESTIMONIALS':
      return (
        <div className="rounded-lg bg-white p-4">
          <h3 className="mb-3 text-center font-bold">{str(content.heading)}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list(content.items).map((it, i) => (
              <figure key={i} className="rounded-md bg-body/70 p-3">
                <blockquote className="text-xs italic">“{str(it.quote)}”</blockquote>
                <figcaption className="mt-2 text-[11px] font-semibold">
                  — {str(it.author)}
                  {str(it.role) && <span className="font-normal text-muted">, {str(it.role)}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      );
    case 'FAQ':
      return (
        <div className="rounded-lg bg-white p-4">
          <h3 className="mb-3 font-bold">{str(content.heading)}</h3>
          <div className="divide-y divide-line">
            {list(content.items).map((it, i) => (
              <details key={i} className="py-2" open={i === 0}>
                <summary className="cursor-pointer text-sm font-semibold">{str(it.question)}</summary>
                <p className="mt-1 text-xs text-muted">{str(it.answer)}</p>
              </details>
            ))}
          </div>
        </div>
      );
    case 'CTA':
      return (
        <div className="rounded-lg bg-qa-soft p-6 text-center">
          <h3 className="font-bold">{str(content.heading)}</h3>
          {str(content.body) && <p className="mt-1 text-xs text-muted">{str(content.body)}</p>}
          <span
            className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {str(content.buttonLabel)}
          </span>
        </div>
      );
    case 'GALLERY':
      return (
        <div className="rounded-lg bg-white p-4">
          {str(content.heading) && <h3 className="mb-3 font-bold">{str(content.heading)}</h3>}
          {content.layout === 'logos' ? (
            <div className="flex flex-wrap items-center justify-center gap-4 rounded-md bg-body/60 p-3">
              {list(content.images).map(
                (it, i) =>
                  str(it.url) && (
                    <img
                      key={i}
                      src={str(it.url)}
                      alt={str(it.alt)}
                      className="h-8 max-w-[110px] object-contain"
                    />
                  ),
              )}
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-2',
                content.layout === 'collage' ? 'auto-rows-[60px] grid-cols-4' : 'grid-cols-3',
              )}
            >
              {list(content.images).map((it, i) => (
                <div
                  key={i}
                  className={cn(
                    'overflow-hidden rounded-md bg-body',
                    content.layout === 'collage'
                      ? i % 5 === 0
                        ? 'col-span-2 row-span-2'
                        : ''
                      : 'aspect-square',
                  )}
                >
                  {str(it.url) && (
                    <img src={str(it.url)} alt={str(it.alt)} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    case 'IMAGE_CARDS':
      return (
        <div className="rounded-lg bg-white p-4">
          {str(content.heading) && <h3 className="mb-3 font-bold">{str(content.heading)}</h3>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {list(content.items).map((it, i) => (
              <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-md bg-sidebar">
                {str(it.image) && (
                  <img src={str(it.image)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2 text-center">
                  {str(it.icon) && (
                    <img src={str(it.icon)} alt="" className="mx-auto mb-1 h-6 w-6 object-contain" />
                  )}
                  <p
                    className="text-[11px] font-bold text-white"
                    style={str(it.color) ? { color: str(it.color) } : undefined}
                  >
                    {str(it.title)}
                  </p>
                  {str(it.linkLabel) && (
                    <span className="mt-1 inline-block rounded bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-ink">
                      {str(it.linkLabel)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'LATEST_POSTS':
      return (
        <div className="rounded-lg bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{str(content.heading)}</h3>
            {str(content.linkLabel) && (
              <span className="text-[11px] font-semibold underline" style={{ color: accent }}>
                {str(content.linkLabel)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: Math.min(3, Number(content.count) || 3) }, (_, i) => (
              <div key={i} className="rounded-md border border-line p-2">
                <div className="aspect-video rounded bg-body" />
                <div className="mt-2 h-2 w-3/4 rounded bg-body" />
                <div className="mt-1 h-2 w-1/2 rounded bg-body" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Shows the {Number(content.count) || 3} newest published blog posts
            {str(content.category) ? ` in “${str(content.category)}”` : ''}.
          </p>
        </div>
      );
    case 'FORM':
      return (
        <div
          className={cn(
            'rounded-lg p-5 text-center',
            content.background === 'dark'
              ? 'bg-sidebar text-white'
              : content.background === 'accent'
                ? 'bg-qa-soft'
                : 'bg-white',
          )}
        >
          <h3 className={cn('font-bold', content.background === 'dark' && 'text-white')}>
            {str(content.heading)}
          </h3>
          {str(content.body) && <p className="mt-1 text-xs opacity-75">{str(content.body)}</p>}
          <div className="mx-auto mt-3 max-w-xs space-y-2 text-left">
            <div className="h-7 rounded border border-line bg-white" />
            <div className="h-7 rounded border border-line bg-white" />
            <div className="h-14 rounded border border-line bg-white" />
            <span
              className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Send
            </span>
          </div>
          <p className="mt-2 text-[11px] opacity-70">
            Form “{str(content.formKey)}” — submissions arrive in Leads.
          </p>
        </div>
      );
  }
}
