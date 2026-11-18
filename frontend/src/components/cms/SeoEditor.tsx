import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Seo } from '@/lib/types';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/controls';
import { ImageField } from './ImageField';

export function seoHints(title: string, description: string): { ok: boolean; text: string }[] {
  const hints: { ok: boolean; text: string }[] = [];
  if (!title) hints.push({ ok: false, text: 'Add a meta title — search engines will otherwise guess one.' });
  else if (title.length < 30)
    hints.push({ ok: false, text: `Meta title is short (${title.length} chars). Aim for 30–60.` });
  else if (title.length > 60)
    hints.push({ ok: false, text: `Meta title may be cut off in results (${title.length} > 60 chars).` });
  else hints.push({ ok: true, text: 'Meta title length looks good.' });
  if (!description) hints.push({ ok: false, text: 'Add a meta description to control the search snippet.' });
  else if (description.length < 70)
    hints.push({
      ok: false,
      text: `Meta description is short (${description.length} chars). Aim for 70–160.`,
    });
  else if (description.length > 160)
    hints.push({ ok: false, text: `Meta description may be truncated (${description.length} > 160 chars).` });
  else hints.push({ ok: true, text: 'Meta description length looks good.' });
  return hints;
}

/** Google-style search result preview. */
export function SearchPreview({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  const t = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  const d = description.length > 160 ? `${description.slice(0, 157)}…` : description;
  return (
    <div className="rounded-xl border border-line bg-white p-4" aria-label="Search result preview">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Google preview</p>
      <p className="truncate text-xs text-[#202124]">{url}</p>
      <p className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{t || 'Untitled page'}</p>
      <p className="mt-1 text-[13px] leading-snug text-[#4d5156]">
        {d || 'No description — search engines will pick text from the page.'}
      </p>
    </div>
  );
}

interface Props {
  value: Seo;
  onChange: (v: Seo) => void;
  fallbackTitle: string;
  previewUrl: string;
  titleTemplate?: string;
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function SeoEditor({
  value,
  onChange,
  fallbackTitle,
  previewUrl,
  titleTemplate = '%s',
  disabled,
  errors = {},
}: Props) {
  const set = (patch: Partial<Seo>) => onChange({ ...value, ...patch });
  const title = value.metaTitle ?? '';
  const desc = value.metaDescription ?? '';
  const shownTitle = titleTemplate.replace('%s', title || fallbackTitle);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Field
          label="Meta title"
          counter={{ value: title.length, max: 70, ideal: [30, 60] }}
          error={errors['seo.metaTitle']}
          hint="Shown as the clickable headline in search results."
        >
          <Input
            value={title}
            disabled={disabled}
            maxLength={70}
            onChange={(e) => set({ metaTitle: e.target.value })}
            placeholder={fallbackTitle}
          />
        </Field>
        <Field
          label="Meta description"
          counter={{ value: desc.length, max: 170, ideal: [70, 160] }}
          error={errors['seo.metaDescription']}
        >
          <Textarea
            value={desc}
            disabled={disabled}
            rows={3}
            maxLength={170}
            onChange={(e) => set({ metaDescription: e.target.value })}
            placeholder="Summarise the page in one or two sentences."
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Open Graph title" hint="Used when the page is shared on social media.">
            <Input
              value={value.ogTitle ?? ''}
              disabled={disabled}
              maxLength={95}
              onChange={(e) => set({ ogTitle: e.target.value })}
              placeholder={title || fallbackTitle}
            />
          </Field>
          <Field label="Canonical URL" error={errors['seo.canonicalUrl']}>
            <Input
              value={value.canonicalUrl ?? ''}
              disabled={disabled}
              onChange={(e) => set({ canonicalUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>
        <Field label="Open Graph description">
          <Textarea
            value={value.ogDescription ?? ''}
            disabled={disabled}
            rows={2}
            maxLength={200}
            onChange={(e) => set({ ogDescription: e.target.value })}
          />
        </Field>
        <ImageField
          label="Open Graph image"
          value={value.ogImage ?? ''}
          onChange={(url) => set({ ogImage: url })}
          disabled={disabled}
          error={errors['seo.ogImage']}
        />
        <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
          <div>
            <p className="text-[0.8125rem] font-semibold">Hide from search engines</p>
            <p className="text-[11px] text-muted">Adds a noindex, nofollow robots tag.</p>
          </div>
          <Switch
            label="Hide from search engines"
            checked={!!value.noindex}
            disabled={disabled}
            onCheckedChange={(v) => set({ noindex: v })}
          />
        </div>
      </div>
      <div className="space-y-4 lg:col-span-2">
        <SearchPreview title={shownTitle} description={desc} url={previewUrl} />
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">SEO health</p>
          <ul className="space-y-2">
            {seoHints(title, desc).map((h) => (
              <li key={h.text} className="flex items-start gap-2 text-xs">
                {h.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-ink" aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-ink" aria-hidden />
                )}
                {h.text}
              </li>
            ))}
            {value.noindex && (
              <li className="flex items-start gap-2 text-xs text-danger-ink">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> This page is hidden from
                search engines.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
