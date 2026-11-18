import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CalendarClock, Clock, Eye, EyeOff, Save, X } from 'lucide-react';
import { api, errorMessage, errorStatus, fieldErrors } from '@/lib/api';
import type { BlogCategory, BlogPost, Seo, SeoSettings } from '@/lib/types';
import { cn, fmtDateTime, slugify } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ContentStatusBadge } from '@/components/ui/status';
import { ErrorState, Skeleton } from '@/components/ui/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls';
import { NotFoundInline } from '@/pages/ErrorPages';
import { RichTextEditor } from '@/components/cms/RichTextEditor';
import { ImageField } from '@/components/cms/ImageField';
import { SeoEditor } from '@/components/cms/SeoEditor';

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  content: string;
  categoryId: string;
  tags: string[];
  seo: Seo;
}
const EMPTY: Draft = { title: '', slug: '', excerpt: '', coverImage: '', content: '', categoryId: '', tags: [], seo: {} };
const fromPost = (b: BlogPost): Draft => ({ title: b.title, slug: b.slug, excerpt: b.excerpt, coverImage: b.coverImage ?? '', content: b.content ?? '', categoryId: b.categoryId ?? '', tags: b.tags, seo: b.seo ?? {} });
const words = (html: string) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function BlogEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { site } = useSite();
  const { can } = useAuth();
  const canWrite = can(P.CONTENT_WRITE);

  const postQ = useSiteQuery(['blogs', 'detail', id], async () => (await api.get<BlogPost>(`/blogs/${id}`)).data, { enabled: !isNew, retry: false });
  const categories = useSiteQuery(['categories'], async () => (await api.get<BlogCategory[]>('/blog-categories')).data);
  const seoSettings = useSiteQuery(['seo-settings'], async () => (await api.get<SeoSettings>('/seo/settings')).data);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [initial, setInitial] = useState<Draft>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState('');

  useEffect(() => {
    if (postQ.data) {
      const d = fromPost(postQ.data);
      setDraft(d);
      setInitial(d);
      setSlugTouched(true);
      if (postQ.data.status === 'SCHEDULED' && postQ.data.publishedAt) setSchedule(toLocalInput(new Date(postQ.data.publishedAt)));
    }
  }, [postQ.data]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const blocker = useUnsavedChanges(dirty);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = 'Title is required.';
    if (draft.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) e.slug = 'Use lower-case letters, numbers and single dashes.';
    if (draft.coverImage && !/^(https?:\/\/\S+|\/uploads\/\S+)$/.test(draft.coverImage)) e.coverImage = 'Cover image must be a valid URL.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inv = [['blogs'], ['dashboard']];
  const save = useSiteMutation(
    async () => {
      const body = { ...draft, slug: draft.slug || undefined, coverImage: draft.coverImage || null, categoryId: draft.categoryId || null };
      return isNew ? (await api.post<BlogPost>('/blogs', body)).data : (await api.patch<BlogPost>(`/blogs/${id}`, body)).data;
    },
    {
      success: isNew ? 'Draft created.' : 'Post saved.',
      invalidate: inv,
      onSuccess: (b) => {
        const d = fromPost(b);
        setDraft(d);
        setInitial(d);
        // Defer so the blocker sees the saved (clean) state before navigating.
        if (isNew) setTimeout(() => navigate(`/blogs/${b.id}`, { replace: true }), 0);
      },
      onError: (e) => {
        const fe = fieldErrors(e);
        if (fe.length) {
          setErrors(Object.fromEntries(fe.map((f) => [f.field, f.message])));
          toast.error('Please fix the highlighted fields.');
        } else toast.error(errorMessage(e));
      },
    },
  );
  const publish = useSiteMutation(async (when?: string) => (await api.post<BlogPost>(`/blogs/${id}/publish`, when ? { publishedAt: new Date(when).toISOString() } : {})).data, {
    success: (b) => (b.status === 'SCHEDULED' ? `Scheduled for ${fmtDateTime(b.publishedAt)}.` : 'Post published.'),
    invalidate: inv,
  });
  const unpublish = useSiteMutation(async () => (await api.post<BlogPost>(`/blogs/${id}/unpublish`)).data, { success: 'Post moved back to draft.', invalidate: inv });

  if (!isNew && postQ.isError && errorStatus(postQ.error) === 404) return <NotFoundInline />;
  if (!isNew && postQ.isError) return <Card><ErrorState message={errorMessage(postQ.error)} onRetry={() => postQ.refetch()} /></Card>;
  if (!isNew && !postQ.data) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-20 rounded-card" /><Skeleton className="h-[520px] rounded-card" /></div>;

  const post = postQ.data;
  const reading = Math.max(1, Math.ceil(words(draft.content) / 200));
  const addTag = (raw: string) => {
    const parts = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    set({ tags: [...new Set([...draft.tags, ...parts])].slice(0, 15) });
    setTagInput('');
  };
  const onSave = () => validate() && save.mutate(undefined);
  const previewUrl = `${site?.domain ? `https://${site.domain}` : 'https://example.com'}/blog/${draft.slug || slugify(draft.title) || 'post'}`;

  return (
    <div className="space-y-5">
      {blocker}
      <div className="card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Back to blogs"><Link to="/blogs"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{isNew ? 'New blog post' : post?.title}</h1>
              {post && <ContentStatusBadge status={post.status} />}
              {dirty && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><Clock className="h-3.5 w-3.5" aria-hidden /> {reading} min read · {words(draft.content)} words{post?.author ? ` · by ${post.author.name}` : ''}</p>
          </div>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => { setDraft(initial); setErrors({}); }}>Discard</Button>
            <Button loading={save.isPending} disabled={!dirty && !isNew} onClick={onSave}><Save className="h-4 w-4" /> {isNew ? 'Save draft' : 'Save'}</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <Tabs defaultValue="content">
          <div className="card px-4 sm:px-5"><TabsList className="border-b-0"><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="seo">SEO</TabsTrigger></TabsList></div>
          <TabsContent value="content" className="mt-5">
            <Card>
              <CardBody className="space-y-4">
                <Field label="Title" required error={errors.title} counter={{ value: draft.title.length, max: 200 }}>
                  <Input value={draft.title} disabled={!canWrite} maxLength={200} placeholder="A great headline" onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
                </Field>
                <Field label="Slug" error={errors.slug} hint={previewUrl}>
                  <Input value={draft.slug} disabled={!canWrite} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value }); }} />
                </Field>
                <Field label="Excerpt" counter={{ value: draft.excerpt.length, max: 400 }} hint="Shown in blog listings and as the default meta description.">
                  <Textarea value={draft.excerpt} disabled={!canWrite} rows={2} maxLength={400} onChange={(e) => set({ excerpt: e.target.value })} />
                </Field>
                <Field label="Content">
                  <div><RichTextEditor value={draft.content} onChange={(content) => set({ content })} disabled={!canWrite} placeholder="Tell your story…" /></div>
                </Field>
              </CardBody>
            </Card>
          </TabsContent>
          <TabsContent value="seo" className="mt-5">
            <Card>
              <CardHeader title="Search engine optimisation" description="Saved together with the post" />
              <CardBody>
                <SeoEditor value={draft.seo} onChange={(seo) => set({ seo })} fallbackTitle={draft.title || 'Untitled post'} previewUrl={previewUrl} titleTemplate={seoSettings.data?.titleTemplate} disabled={!canWrite} errors={errors} />
              </CardBody>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-3">
              {isNew ? (
                <p className="text-xs text-muted">Save the draft first, then publish or schedule it.</p>
              ) : post && (
                <>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><ContentStatusBadge status={post.status} /></dd></div>
                    <div className="flex justify-between"><dt className="text-muted">{post.status === 'SCHEDULED' ? 'Goes live' : 'Published'}</dt><dd>{fmtDateTime(post.publishedAt)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Last saved</dt><dd>{fmtDateTime(post.updatedAt)}</dd></div>
                  </dl>
                  {can(P.CONTENT_PUBLISH) ? (
                    <div className="space-y-2 border-t border-line pt-3">
                      {dirty && <p className="text-[11px] text-warning">Save your changes before publishing.</p>}
                      {post.status !== 'PUBLISHED' && <Button className="w-full" variant="success" disabled={dirty} loading={publish.isPending && !publish.variables} onClick={() => publish.mutate(undefined)}><Eye className="h-4 w-4" /> Publish now</Button>}
                      <Field label="Schedule for later" hint="Shown in your local time.">
                        <Input type="datetime-local" value={schedule} min={toLocalInput(new Date())} onChange={(e) => setSchedule(e.target.value)} />
                      </Field>
                      <Button className="w-full" variant="outline" disabled={dirty || !schedule || new Date(schedule) <= new Date()} loading={publish.isPending && !!publish.variables} onClick={() => publish.mutate(schedule)}><CalendarClock className="h-4 w-4" /> Schedule</Button>
                      {post.status !== 'DRAFT' && <Button className="w-full" variant="danger-ghost" loading={unpublish.isPending} onClick={() => unpublish.mutate(undefined)}><EyeOff className="h-4 w-4" /> Unpublish</Button>}
                    </div>
                  ) : (
                    <p className="border-t border-line pt-3 text-[11px] text-muted">Only Admins can publish. Save your draft and ask an Admin to review it.</p>
                  )}
                </>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Organisation" />
            <CardBody className="space-y-4">
              <Field label="Category">
                <Select value={draft.categoryId} disabled={!canWrite} onChange={(e) => set({ categoryId: e.target.value })}>
                  <option value="">Uncategorised</option>
                  {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Tags" hint="Press Enter or comma to add.">
                <Input value={tagInput} disabled={!canWrite || draft.tags.length >= 15} maxLength={30} placeholder="e.g. hiking" onChange={(e) => (e.target.value.includes(',') ? addTag(e.target.value) : setTagInput(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }} onBlur={() => addTag(tagInput)} />
              </Field>
              {draft.tags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                  {draft.tags.map((t) => (
                    <li key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-accent">
                      #{t}
                      {canWrite && <button type="button" className="rounded-full p-0.5 hover:bg-white" aria-label={`Remove tag ${t}`} onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })}><X className="h-3 w-3" /></button>}
                    </li>
                  ))}
                </ul>
              )}
              <ImageField label="Cover image" value={draft.coverImage} onChange={(coverImage) => set({ coverImage })} disabled={!canWrite} error={errors.coverImage} />
              <div className={cn('aspect-video overflow-hidden rounded-lg bg-body', !draft.coverImage && 'hidden')}>{draft.coverImage && <img src={draft.coverImage} alt="Cover preview" className="h-full w-full object-cover" />}</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
