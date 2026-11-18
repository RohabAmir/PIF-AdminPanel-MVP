import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import type { SeoSettings } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { ImageField } from '@/components/cms/ImageField';
import { SearchPreview } from '@/components/cms/SeoEditor';

type Draft = { titleTemplate: string; defaultMetaDescription: string; defaultOgImage: string; robotsTxt: string; canonicalBaseUrl: string; googleVerification: string };
const toDraft = (s: SeoSettings): Draft => ({ titleTemplate: s.titleTemplate, defaultMetaDescription: s.defaultMetaDescription, defaultOgImage: s.defaultOgImage ?? '', robotsTxt: s.robotsTxt, canonicalBaseUrl: s.canonicalBaseUrl ?? '', googleVerification: s.googleVerification ?? '' });

export default function SeoPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const canManage = can(P.SETTINGS_MANAGE);
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['seo-settings'], async () => (await api.get<SeoSettings>('/seo/settings')).data);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setDraft(toDraft(data)); }, [data]);
  const dirty = useMemo(() => !!data && !!draft && JSON.stringify(toDraft(data)) !== JSON.stringify(draft), [data, draft]);
  const blocker = useUnsavedChanges(dirty);
  const save = useSiteMutation(async (d: Draft) => (await api.put<SeoSettings>('/seo/settings', d)).data, {
    success: 'SEO settings saved.',
    invalidate: [['seo-settings']],
    onSuccess: () => setErrors({}),
    onError: (e) => { const fe = fieldErrors(e); if (fe.length) { setErrors(Object.fromEntries(fe.map((f) => [f.field, f.message]))); toast.error('Please fix the highlighted fields.'); } else toast.error(errorMessage(e)); },
  });

  if (isError) return <Card><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></Card>;
  const set = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const validate = (d: Draft) => {
    const e: Record<string, string> = {};
    if (!d.titleTemplate.includes('%s')) e.titleTemplate = 'The template must contain %s where the page title goes.';
    if (d.canonicalBaseUrl && !/^https?:\/\/[^\s/]+(\/\S*)?$/.test(d.canonicalBaseUrl)) e.canonicalBaseUrl = 'Must start with https://';
    if (d.googleVerification && !/^[A-Za-z0-9_-]{10,100}$/.test(d.googleVerification)) e.googleVerification = 'Paste only the content value of the verification meta tag.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <>
      {blocker}
      <PageHeader title="SEO Settings" description={`Website-wide search defaults for ${site?.name}. Pages and posts can override them.`} crumbs={[{ label: 'SEO Settings' }]} />
      {isLoading || !draft ? <Skeleton className="h-[520px] rounded-card" /> : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader
              title="Global SEO"
              description={canManage ? `Last updated ${fmtDateTime(data?.updatedAt)}` : 'Read-only — only Admins can change global SEO'}
              actions={canManage && <><Button size="sm" variant="outline" disabled={!dirty} onClick={() => data && setDraft(toDraft(data))}>Discard</Button><Button size="sm" loading={save.isPending} disabled={!dirty} onClick={() => validate(draft) && save.mutate(draft)}><Save className="h-4 w-4" /> Save</Button></>}
            />
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Title template" required error={errors.titleTemplate} hint="%s is replaced by each page's title." className="md:col-span-2">
                <Input value={draft.titleTemplate} disabled={!canManage} maxLength={80} onChange={(e) => set({ titleTemplate: e.target.value })} />
              </Field>
              <Field label="Default meta description" className="md:col-span-2" error={errors.defaultMetaDescription} counter={{ value: draft.defaultMetaDescription.length, max: 170, ideal: [70, 160] }}>
                <Textarea rows={3} value={draft.defaultMetaDescription} disabled={!canManage} maxLength={170} onChange={(e) => set({ defaultMetaDescription: e.target.value })} />
              </Field>
              <div className="md:col-span-2"><ImageField label="Default social share image" value={draft.defaultOgImage} disabled={!canManage} onChange={(u) => set({ defaultOgImage: u })} error={errors.defaultOgImage} /></div>
              <Field label="Canonical base URL" error={errors.canonicalBaseUrl} hint="Used to build canonical links for every page.">
                <Input value={draft.canonicalBaseUrl} disabled={!canManage} placeholder="https://www.example.com" onChange={(e) => set({ canonicalBaseUrl: e.target.value })} />
              </Field>
              <Field label="Google site verification" error={errors.googleVerification} hint="From Search Console's HTML-tag method.">
                <Input value={draft.googleVerification} disabled={!canManage} onChange={(e) => set({ googleVerification: e.target.value })} />
              </Field>
              <Field label="robots.txt" className="md:col-span-2" error={errors.robotsTxt}>
                <Textarea rows={6} value={draft.robotsTxt} disabled={!canManage} maxLength={5000} className="font-mono text-xs" onChange={(e) => set({ robotsTxt: e.target.value })} />
              </Field>
            </CardBody>
          </Card>
          <div className="space-y-5">
            <SearchPreview title={draft.titleTemplate.replace('%s', 'Home')} description={draft.defaultMetaDescription} url={draft.canonicalBaseUrl || `https://${site?.domain ?? 'example.com'}`} />
            <Card>
              <CardHeader title="Social share card" />
              <CardBody>
                <div className="overflow-hidden rounded-lg border border-line">
                  <div className="aspect-[1.91/1] bg-body">{draft.defaultOgImage && <img src={draft.defaultOgImage} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="space-y-0.5 bg-[#F2F3F5] px-3 py-2">
                    <p className="text-[10px] uppercase text-muted">{(draft.canonicalBaseUrl || site?.domain || 'example.com').replace(/^https?:\/\//, '')}</p>
                    <p className="text-[0.8125rem] font-semibold">{draft.titleTemplate.replace('%s', 'Home')}</p>
                    <p className="line-clamp-2 text-[11px] text-muted">{draft.defaultMetaDescription}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
