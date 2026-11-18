import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Braces,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { api, errorMessage, errorStatus, fieldErrors } from '@/lib/api';
import type { Page, Paginated, SectionType, Section, Seo, SeoSettings } from '@/lib/types';
import { cn, fmtDateTime } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger, Switch, Tooltip } from '@/components/ui/controls';
import { ContentStatusBadge } from '@/components/ui/status';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { NotFoundInline } from '@/pages/ErrorPages';
import { SeoEditor } from '@/components/cms/SeoEditor';
import { SectionEditor } from '@/components/cms/SectionEditor';
import { SectionPreview } from '@/components/cms/SectionPreview';
import { BLOCKS, SECTION_TYPES, validateBlock } from '@/components/cms/section-config';

type Obj = Record<string, unknown>;

function SortableRow({
  section,
  selected,
  onSelect,
  onToggle,
  canWrite,
  dirty,
}: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
  onToggle: (v: boolean) => void;
  canWrite: boolean;
  dirty: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: !canWrite,
  });
  const Icon = BLOCKS[section.type].icon;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-white px-2 py-2 transition-shadow',
        selected ? 'border-primary ring-2 ring-primary/15' : 'border-line hover:border-accent-border',
        isDragging && 'z-10 shadow-pop',
        !section.isVisible && 'opacity-60',
      )}
    >
      {canWrite && (
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted hover:bg-body hover:text-accent active:cursor-grabbing"
          aria-label={`Drag to reorder ${section.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        aria-current={selected}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-semibold">
            {section.name}
            {dirty && (
              <span className="ml-1 text-warning-ink" aria-label="unsaved changes">
                ●
              </span>
            )}
          </span>
          <span className="block text-[11px] text-muted">{BLOCKS[section.type].label}</span>
        </span>
      </button>
      <Switch
        label={section.isVisible ? `Hide ${section.name}` : `Show ${section.name}`}
        checked={section.isVisible}
        disabled={!canWrite}
        onCheckedChange={onToggle}
      />
    </li>
  );
}

const detailsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required.')
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and single dashes.'),
  parentId: z.string(),
});
type Details = z.infer<typeof detailsSchema>;

export default function PageEditorPage() {
  const { id = '' } = useParams();
  const { site } = useSite();
  const { can } = useAuth();
  const canWrite = can(P.CONTENT_WRITE);
  const [tab, setTab] = useState('sections');

  const pageQ = useSiteQuery(
    ['pages', 'detail', id],
    async () => (await api.get<Page>(`/pages/${id}`)).data,
    { retry: false },
  );
  const sectionsQ = useSiteQuery(
    ['pages', 'detail', id, 'sections'],
    async () => (await api.get<Section[]>(`/pages/${id}/sections`)).data,
    { retry: false },
  );
  const allPages = useSiteQuery(
    ['pages', 'all'],
    async () => (await api.get<Paginated<Page>>('/pages', { params: { pageSize: 100 } })).data,
  );
  const seoSettings = useSiteQuery(
    ['seo-settings'],
    async () => (await api.get<SeoSettings>('/seo/settings')).data,
  );

  // ── sections state
  const [order, setOrder] = useState<Section[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; content: Obj }>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showJson, setShowJson] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Section | null>(null);

  useEffect(() => {
    if (sectionsQ.data) {
      setOrder(sectionsQ.data);
      setSelectedId((cur) =>
        cur && sectionsQ.data.some((s) => s.id === cur) ? cur : (sectionsQ.data[0]?.id ?? null),
      );
    }
  }, [sectionsQ.data]);

  const selected = order.find((s) => s.id === selectedId) ?? null;
  const draft = selected ? (drafts[selected.id] ?? { name: selected.name, content: selected.content }) : null;
  const clientErrors = selected && draft ? validateBlock(selected.type, draft.content) : {};
  const sectionErrors = { ...clientErrors, ...serverErrors };

  // ── details & SEO forms
  const details = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: '', slug: '', parentId: '' },
  });
  const [seo, setSeo] = useState<Seo>({});
  const [seoDirty, setSeoDirty] = useState(false);
  useEffect(() => {
    if (pageQ.data) {
      details.reset({ title: pageQ.data.title, slug: pageQ.data.slug, parentId: pageQ.data.parentId ?? '' });
      setSeo(pageQ.data.seo ?? {});
      setSeoDirty(false);
    }
  }, [pageQ.data, details]);

  const dirtySections = Object.keys(drafts);
  const dirty = dirtySections.length > 0 || details.formState.isDirty || seoDirty;
  const blockerDialog = useUnsavedChanges(dirty);

  const inv = [['pages'], ['dashboard']];
  const saveDetails = useSiteMutation(
    async (v: Details) =>
      (await api.patch<Page>(`/pages/${id}`, { title: v.title, slug: v.slug, parentId: v.parentId || null }))
        .data,
    {
      success: 'Page details saved.',
      invalidate: inv,
      onError: (e) => {
        const fe = fieldErrors(e);
        if (fe.length) fe.forEach((f) => details.setError(f.field as keyof Details, { message: f.message }));
        else toast.error(errorMessage(e));
      },
    },
  );
  const saveSeo = useSiteMutation(async () => (await api.patch<Page>(`/pages/${id}`, { seo })).data, {
    success: 'SEO settings saved.',
    invalidate: inv,
    onSuccess: () => setSeoDirty(false),
  });
  const statusAction = useSiteMutation(
    async (op: 'publish' | 'unpublish' | 'archive') => (await api.post<Page>(`/pages/${id}/${op}`)).data,
    {
      success: (_p, op) =>
        ({ publish: 'Page published.', unpublish: 'Page moved back to draft.', archive: 'Page archived.' })[
          op
        ],
      invalidate: inv,
    },
  );

  const saveSection = useSiteMutation(
    async (s: Section) => {
      const d = drafts[s.id]!;
      return (await api.patch<Section>(`/sections/${s.id}`, { name: d.name, content: d.content })).data;
    },
    {
      success: 'Section saved.',
      invalidate: [['pages', 'detail', id, 'sections']],
      onSuccess: (s) => {
        setDrafts(({ [s.id]: _done, ...rest }) => rest);
        setServerErrors({});
      },
      onError: (e) => {
        const fe = fieldErrors(e);
        if (fe.length) {
          setServerErrors(Object.fromEntries(fe.map((f) => [f.field.replace(/^content\./, ''), f.message])));
          toast.error('Please fix the highlighted fields.');
        } else toast.error(errorMessage(e));
      },
    },
  );
  const toggleVisible = useSiteMutation(
    async ({ s, v }: { s: Section; v: boolean }) =>
      (await api.patch<Section>(`/sections/${s.id}`, { isVisible: v })).data,
    {
      success: (s) => (s.isVisible ? `"${s.name}" is visible.` : `"${s.name}" is hidden.`),
      invalidate: [['pages', 'detail', id, 'sections']],
    },
  );
  const addSection = useSiteMutation(
    async (type: SectionType) =>
      (await api.post<Section>(`/pages/${id}/sections`, { type, content: BLOCKS[type].defaults })).data,
    {
      success: (s) => `${BLOCKS[s.type].label} section added.`,
      invalidate: [['pages', 'detail', id, 'sections'], ['pages']],
      onSuccess: (s) => {
        setSelectedId(s.id);
        setAdding(false);
      },
    },
  );
  const duplicate = useSiteMutation(
    async (s: Section) => (await api.post<Section>(`/sections/${s.id}/duplicate`)).data,
    {
      success: 'Section duplicated.',
      invalidate: [['pages', 'detail', id, 'sections'], ['pages']],
      onSuccess: (s) => setSelectedId(s.id),
    },
  );
  const remove = useSiteMutation(async (s: Section) => api.delete(`/sections/${s.id}`), {
    success: 'Section deleted.',
    invalidate: [['pages', 'detail', id, 'sections'], ['pages']],
    onSuccess: (_d, s) => {
      setDrafts(({ [s.id]: _x, ...rest }) => rest);
      setToDelete(null);
    },
  });
  const reorder = useSiteMutation(
    async (ids: string[]) => (await api.put<Section[]>(`/pages/${id}/sections/order`, { ids })).data,
    {
      success: 'Section order saved.',
      invalidate: [['pages', 'detail', id, 'sections']],
      onError: (e) => {
        toast.error(errorMessage(e));
        if (sectionsQ.data) setOrder(sectionsQ.data);
      },
    },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((s) => s.id === active.id);
    const to = order.findIndex((s) => s.id === over.id);
    const next = arrayMove(order, from, to);
    setOrder(next); // optimistic
    reorder.mutate(next.map((s) => s.id));
  };

  const parentOptions = useMemo(
    () => (allPages.data?.data ?? []).filter((p) => p.id !== id && p.parentId !== id),
    [allPages.data, id],
  );

  if (pageQ.isError && errorStatus(pageQ.error) === 404) return <NotFoundInline />;
  if (pageQ.isError)
    return (
      <Card>
        <ErrorState message={errorMessage(pageQ.error)} onRetry={() => pageQ.refetch()} />
      </Card>
    );
  if (!pageQ.data) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading page">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-[480px] rounded-card" />
      </div>
    );
  }
  const page = pageQ.data;
  const previewUrl = `${site?.domain ? `https://${site.domain}` : 'https://example.com'}/${page.slug === 'home' ? '' : page.slug}`;

  return (
    <div className="space-y-5">
      {blockerDialog}
      <div className="card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Back to pages">
            <Link to="/pages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{page.title}</h1>
              <ContentStatusBadge status={page.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              /{page.slug} · Updated {fmtDateTime(page.updatedAt)}
              {page.publishedAt ? ` · First published ${fmtDateTime(page.publishedAt)}` : ''}
            </p>
          </div>
        </div>
        {can(P.CONTENT_PUBLISH) && (
          <div className="flex flex-wrap gap-2">
            {page.status !== 'ARCHIVED' && (
              <Button
                variant="outline"
                size="sm"
                loading={statusAction.isPending && statusAction.variables === 'archive'}
                onClick={() => statusAction.mutate('archive')}
              >
                Archive
              </Button>
            )}
            {page.status === 'PUBLISHED' ? (
              <Button
                variant="outline"
                size="sm"
                loading={statusAction.isPending && statusAction.variables === 'unpublish'}
                onClick={() => statusAction.mutate('unpublish')}
              >
                <EyeOff className="h-4 w-4" /> Unpublish
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                loading={statusAction.isPending && statusAction.variables === 'publish'}
                onClick={() => statusAction.mutate('publish')}
              >
                <Eye className="h-4 w-4" /> Publish
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="card px-4 sm:px-5">
          <TabsList className="border-b-0">
            <TabsTrigger value="sections">
              Sections ({order.length})
              {dirtySections.length > 0 && <span className="text-warning-ink">●</span>}
            </TabsTrigger>
            <TabsTrigger value="details">
              Details{details.formState.isDirty && <span className="text-warning-ink">●</span>}
            </TabsTrigger>
            <TabsTrigger value="seo">
              SEO{seoDirty && <span className="text-warning-ink">●</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sections" className="mt-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
            <Card className="h-fit">
              <CardHeader
                title="Page sections"
                description={canWrite ? 'Drag to reorder · toggle to show/hide' : 'Read-only'}
                actions={
                  canWrite && (
                    <Button size="sm" variant="violet" onClick={() => setAdding(true)}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )
                }
              />
              <CardBody className="p-3 sm:p-3">
                {sectionsQ.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : order.length === 0 ? (
                  <EmptyState
                    icon={<LayoutTemplate />}
                    title="No sections yet"
                    description="Build this page from typed content blocks."
                    action={
                      canWrite && (
                        <Button size="sm" onClick={() => setAdding(true)}>
                          <Plus className="h-4 w-4" /> Add section
                        </Button>
                      )
                    }
                  />
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={order.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      <ul className="space-y-2" aria-label="Sections in display order">
                        {order.map((s) => (
                          <SortableRow
                            key={s.id}
                            section={s}
                            selected={s.id === selectedId}
                            dirty={!!drafts[s.id]}
                            canWrite={canWrite}
                            onSelect={() => {
                              setSelectedId(s.id);
                              setServerErrors({});
                            }}
                            onToggle={(v) => toggleVisible.mutate({ s, v })}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </CardBody>
            </Card>

            {selected && draft ? (
              <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
                <Card>
                  <CardHeader
                    title={draft.name || 'Untitled section'}
                    description={BLOCKS[selected.type].description}
                    actions={
                      <>
                        <Tooltip content="Show JSON">
                          <Button
                            size="icon"
                            variant={showJson ? 'primary' : 'outline'}
                            onClick={() => setShowJson((v) => !v)}
                            aria-label="Toggle JSON view"
                            aria-pressed={showJson}
                          >
                            <Braces className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        {canWrite && (
                          <Tooltip content="Duplicate">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => duplicate.mutate(selected)}
                              aria-label="Duplicate section"
                              disabled={duplicate.isPending}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        )}
                        {can(P.CONTENT_DELETE) && (
                          <Tooltip content="Delete">
                            <Button
                              size="icon"
                              variant="danger-ghost"
                              onClick={() => setToDelete(selected)}
                              aria-label="Delete section"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Tooltip>
                        )}
                      </>
                    }
                  />
                  <CardBody className="space-y-4">
                    <Field label="Section name" hint="Internal label — not shown on the website.">
                      <Input
                        value={draft.name}
                        disabled={!canWrite}
                        maxLength={100}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [selected.id]: { ...draft, name: e.target.value } }))
                        }
                      />
                    </Field>
                    <SectionEditor
                      key={selected.id}
                      type={selected.type}
                      content={draft.content}
                      disabled={!canWrite}
                      errors={drafts[selected.id] ? sectionErrors : serverErrors}
                      onChange={(c) => {
                        setServerErrors({});
                        setDrafts((d) => ({ ...d, [selected.id]: { ...draft, content: c } }));
                      }}
                    />
                    {canWrite && (
                      <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:-mb-5 sm:px-5">
                        <Button
                          variant="outline"
                          disabled={!drafts[selected.id]}
                          onClick={() => setDrafts(({ [selected.id]: _x, ...rest }) => rest)}
                        >
                          Discard
                        </Button>
                        <Button
                          loading={saveSection.isPending}
                          disabled={!drafts[selected.id] || !draft.name.trim()}
                          onClick={() => {
                            if (Object.keys(clientErrors).length)
                              return void toast.error('Please fix the highlighted fields.');
                            saveSection.mutate(selected);
                          }}
                        >
                          <Save className="h-4 w-4" /> Save section
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
                <Card className="h-fit 2xl:sticky 2xl:top-20">
                  <CardHeader
                    title={showJson ? 'JSON content' : 'Live preview'}
                    description={
                      showJson ? 'Exactly what the public API returns for this block' : 'Updates as you type'
                    }
                  />
                  <CardBody className="bg-body/40">
                    {showJson ? (
                      <pre className="scrollbar-thin max-h-[560px] overflow-auto rounded-lg bg-sidebar p-4 text-[11px] leading-relaxed text-[#C9D1F5]">
                        {JSON.stringify({ type: selected.type, content: draft.content }, null, 2)}
                      </pre>
                    ) : (
                      <SectionPreview
                        type={selected.type}
                        content={draft.content}
                        accent={site?.primaryColor}
                      />
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : (
              order.length > 0 && (
                <Card>
                  <EmptyState
                    title="Select a section"
                    description="Choose a section on the left to edit its content."
                  />
                </Card>
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="details" className="mt-5">
          <Card>
            <CardHeader title="Page details" />
            <CardBody>
              <form
                className="grid max-w-2xl grid-cols-1 gap-4"
                noValidate
                onSubmit={details.handleSubmit((v) =>
                  saveDetails.mutate(v, { onSuccess: () => details.reset(v) }),
                )}
              >
                <Field label="Title" required error={details.formState.errors.title?.message}>
                  <Input disabled={!canWrite} {...details.register('title')} />
                </Field>
                <Field
                  label="Slug"
                  required
                  error={details.formState.errors.slug?.message}
                  hint={`URL: ${previewUrl}`}
                >
                  <Input disabled={!canWrite} {...details.register('slug')} />
                </Field>
                <Field label="Parent page">
                  <Select disabled={!canWrite} {...details.register('parentId')}>
                    <option value="">No parent (top level)</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </Select>
                </Field>
                {canWrite && (
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      loading={saveDetails.isPending}
                      disabled={!details.formState.isDirty}
                    >
                      <Save className="h-4 w-4" /> Save details
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!details.formState.isDirty}
                      onClick={() => details.reset()}
                    >
                      Discard
                    </Button>
                  </div>
                )}
              </form>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="mt-5">
          <Card>
            <CardHeader
              title="Search engine optimisation"
              description="Overrides the website's global SEO defaults for this page"
              actions={
                canWrite && (
                  <Button
                    size="sm"
                    loading={saveSeo.isPending}
                    disabled={!seoDirty}
                    onClick={() => saveSeo.mutate(undefined)}
                  >
                    <Save className="h-4 w-4" /> Save SEO
                  </Button>
                )
              }
            />
            <CardBody>
              <SeoEditor
                value={seo}
                onChange={(v) => {
                  setSeo(v);
                  setSeoDirty(true);
                }}
                fallbackTitle={page.title}
                previewUrl={previewUrl}
                titleTemplate={seoSettings.data?.titleTemplate}
                disabled={!canWrite}
              />
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="Add a section"
        description="Choose a block type. You can edit its content right after."
        size="lg"
      >
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SECTION_TYPES.map((t) => {
            const B = BLOCKS[t];
            return (
              <li key={t}>
                <button
                  type="button"
                  disabled={addSection.isPending}
                  onClick={() => addSection.mutate(t)}
                  className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-qa-indigo text-white">
                    <B.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[0.8125rem] font-semibold text-accent">{B.label}</span>
                    <span className="block text-[11px] text-muted">{B.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.name}"?`}
        description="This section will be removed from the page permanently."
        confirmLabel="Delete section"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </div>
  );
}
