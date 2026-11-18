import type { SectionType } from '@/lib/types';
import { cn } from '@/lib/utils';

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown) => (Array.isArray(v) ? (v as Obj[]) : []);

/** Simple visual preview of a block as a tenant website might render it. */
export function SectionPreview({ type, content, accent = '#4A4A89' }: { type: SectionType; content: Obj; accent?: string }) {
  switch (type) {
    case 'HERO':
      return (
        <div className="relative overflow-hidden rounded-lg bg-sidebar px-6 py-12 text-center text-white">
          {str(content.backgroundImage) && <img src={str(content.backgroundImage)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
          <div className="relative">
            <h3 className="text-xl font-bold text-white">{str(content.heading)}</h3>
            {str(content.subheading) && <p className="mx-auto mt-2 max-w-md text-xs text-white/85">{str(content.subheading)}</p>}
            {str(content.ctaLabel) && <span className="mt-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: accent }}>{str(content.ctaLabel)}</span>}
          </div>
        </div>
      );
    case 'RICH_TEXT':
      return <div className="prose-content rounded-lg bg-white p-4" dangerouslySetInnerHTML={{ __html: str(content.html) }} />;
    case 'IMAGE_TEXT':
      return (
        <div className={cn('flex flex-col gap-4 rounded-lg bg-white p-4 sm:flex-row sm:items-center', content.imagePosition === 'right' && 'sm:flex-row-reverse')}>
          <div className="aspect-video w-full overflow-hidden rounded-md bg-body sm:w-2/5">{str(content.image) && <img src={str(content.image)} alt={str(content.imageAlt)} className="h-full w-full object-cover" />}</div>
          <div className="flex-1">
            <h3 className="font-bold">{str(content.heading)}</h3>
            <p className="mt-1 whitespace-pre-line text-xs text-muted">{str(content.body)}</p>
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
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold uppercase text-white" style={{ backgroundColor: accent }}>{str(it.icon).slice(0, 2) || '★'}</span>
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
          {str(content.heading) && <h3 className="mb-3 text-center font-bold text-white">{str(content.heading)}</h3>}
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
                <figcaption className="mt-2 text-[11px] font-semibold">— {str(it.author)}{str(it.role) && <span className="font-normal text-muted">, {str(it.role)}</span>}</figcaption>
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
          <span className="mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: accent }}>{str(content.buttonLabel)}</span>
        </div>
      );
    case 'GALLERY':
      return (
        <div className="rounded-lg bg-white p-4">
          {str(content.heading) && <h3 className="mb-3 font-bold">{str(content.heading)}</h3>}
          <div className="grid grid-cols-3 gap-2">
            {list(content.images).map((it, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-md bg-body">{str(it.url) && <img src={str(it.url)} alt={str(it.alt)} className="h-full w-full object-cover" />}</div>
            ))}
          </div>
        </div>
      );
  }
}
