import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  FileStack,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { api, fieldErrors } from '@/lib/api';
import type { Page, PageStatus, Paginated } from '@/lib/types';
import { fmtRelative, slugify } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  Pagination,
  SearchInput,
  SortTh,
  Table,
  TableSkeleton,
  Td,
  Th,
  Tr,
} from '@/components/ui/data';
import { Select, Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { ContentStatusBadge } from '@/components/ui/status';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { errorMessage } from '@/lib/api';

type SortBy = 'order' | 'title' | 'updatedAt';

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150, 'Max 150 characters.'),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, 'Use lower-case letters, numbers and single dashes.'),
  parentId: z.string(),
});
type CreateValues = z.infer<typeof createSchema>;

function CreatePageModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [slugTouched, setSlugTouched] = useState(false);
  const { data: all } = useSiteQuery(
    ['pages', 'all'],
    async () => (await api.get<Paginated<Page>>('/pages', { params: { pageSize: 100 } })).data,
    { enabled: open },
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', slug: '', parentId: '' },
  });
  const title = watch('title');
  useEffect(() => {
    if (!slugTouched) setValue('slug', slugify(title));
  }, [title, slugTouched, setValue]);
  useEffect(() => {
    if (!open) {
      reset();
      setSlugTouched(false);
    }
  }, [open, reset]);
  const create = useSiteMutation(
    async (v: CreateValues) =>
      (
        await api.post<Page>('/pages', {
          title: v.title,
          slug: slugTouched && v.slug ? v.slug : undefined,
          parentId: v.parentId || null,
        })
      ).data,
    {
      success: (p) => `Page "${p.title}" created as a draft.`,
      invalidate: [['pages'], ['dashboard']],
      onSuccess: (p) => {
        onOpenChange(false);
        navigate(`/pages/${p.id}`);
      },
      onError: (e) => {
        const fe = fieldErrors(e);
        if (fe.length) fe.forEach((f) => setError(f.field as keyof CreateValues, { message: f.message }));
        else setError('title', { message: errorMessage(e) });
      },
    },
  );
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add page"
      description="New pages start as drafts — publish them when they are ready."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button form="create-page" type="submit" loading={create.isPending}>
            Create page
          </Button>
        </>
      }
    >
      <form
        id="create-page"
        className="space-y-4"
        onSubmit={handleSubmit((v) => create.mutate(v))}
        noValidate
      >
        <Field label="Title" required error={errors.title?.message}>
          <Input autoFocus {...register('title')} placeholder="e.g. Spa & Wellness" />
        </Field>
        <Field
          label="Slug"
          error={errors.slug?.message}
          hint="Auto-generated from the title (a number is added if it is taken). Edit it to choose your own."
        >
          <Input
            {...register('slug', { onChange: () => setSlugTouched(true) })}
            placeholder="spa-and-wellness"
          />
        </Field>
        <Field label="Parent page" hint="Optional — nest this page under another one.">
          <Select {...register('parentId')}>
            <option value="">No parent (top level)</option>
            {all?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

export default function PagesListPage() {
  const navigate = useNavigate();
  const { site } = useSite();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PageStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('order');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Page | null>(null);
  const pageSize = 10;

  const params = {
    page,
    pageSize,
    search: search || undefined,
    status: status || undefined,
    sortBy,
    sortOrder,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useSiteQuery(
    ['pages', params],
    async () => (await api.get<Paginated<Page>>('/pages', { params })).data,
    { placeholderData: (p) => p },
  );

  const action = useSiteMutation(
    async ({ id, op }: { id: string; op: 'publish' | 'unpublish' | 'archive' | 'duplicate' }) =>
      (await api.post<Page>(`/pages/${id}/${op}`)).data,
    {
      success: (p, v) =>
        ({
          publish: `"${p.title}" is now live.`,
          unpublish: `"${p.title}" moved back to draft.`,
          archive: `"${p.title}" archived.`,
          duplicate: `Created "${p.title}".`,
        })[v.op],
      invalidate: [['pages'], ['dashboard']],
    },
  );
  const remove = useSiteMutation(async (id: string) => api.delete(`/pages/${id}`), {
    success: 'Page deleted.',
    invalidate: [['pages'], ['dashboard']],
    onSuccess: () => setToDelete(null),
  });
  const reorder = useSiteMutation(async (ids: string[]) => api.put('/pages/order', { ids }), {
    success: 'Page order updated.',
    invalidate: [['pages']],
  });

  const canReorder =
    can(P.CONTENT_WRITE) &&
    sortBy === 'order' &&
    sortOrder === 'asc' &&
    !search &&
    !status &&
    (data?.meta.totalPages ?? 1) === 1;
  const move = (index: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.data.map((p) => p.id);
    const j = index + dir;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    reorder.mutate(ids);
  };
  const onSort = (f: SortBy) => {
    if (f === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(f);
      setSortOrder(f === 'updatedAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Pages"
        description={`To manage the list of all ${site?.name} pages and perform actions on them`}
        crumbs={[{ label: 'Pages List' }]}
      />
      <Card>
        <CardHeader
          title={`${site?.name} Pages`}
          description={data ? `${data.meta.total} page${data.meta.total === 1 ? '' : 's'}` : undefined}
          actions={
            <>
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Search title or slug"
              />
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as PageStatus | '');
                  setPage(1);
                }}
                className="w-full sm:w-36"
              >
                <option value="">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
              {can(P.CONTENT_WRITE) && (
                <Button variant="violet" size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Add page
                </Button>
              )}
            </>
          }
        />
        <CardBody>
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
          ) : !data?.data.length ? (
            <EmptyState
              icon={<FileStack />}
              title={search || status ? 'No pages match your filters' : 'No pages yet'}
              description={
                search || status
                  ? 'Try a different search or status.'
                  : 'Create the first page for this website.'
              }
              action={
                can(P.CONTENT_WRITE) && !search && !status ? (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" /> Add page
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table aria-busy={isFetching}>
              <thead>
                <tr>
                  <SortTh
                    label="#"
                    field="order"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    className="w-16"
                  />
                  <SortTh label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <Th>Status</Th>
                  <Th className="hidden md:table-cell">Parent</Th>
                  <Th className="hidden sm:table-cell">Sections</Th>
                  <SortTh
                    label="Updated"
                    field="updatedAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                    className="hidden lg:table-cell"
                  />
                  <Th className="w-20 text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p, i) => (
                  <Tr key={p.id}>
                    <Td className="text-muted">
                      <div className="flex items-center gap-1">
                        <span className="w-5 tabular-nums">{p.order + 1}</span>
                        {canReorder && (
                          <span className="flex flex-col">
                            <button
                              type="button"
                              className="text-muted hover:text-accent disabled:opacity-20"
                              disabled={i === 0 || reorder.isPending}
                              onClick={() => move(i, -1)}
                              aria-label={`Move ${p.title} up`}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="text-muted hover:text-accent disabled:opacity-20"
                              disabled={i === data.data.length - 1 || reorder.isPending}
                              onClick={() => move(i, 1)}
                              aria-label={`Move ${p.title} down`}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <Link to={`/pages/${p.id}`} className="font-semibold text-accent hover:underline">
                        {p.title}
                      </Link>
                      <p className="max-w-[260px] truncate text-[11px] text-muted">/{p.slug}</p>
                    </Td>
                    <Td>
                      <ContentStatusBadge status={p.status} />
                    </Td>
                    <Td className="hidden text-muted md:table-cell">{p.parent?.title ?? '—'}</Td>
                    <Td className="hidden tabular-nums sm:table-cell">{p._count.sections}</Td>
                    <Td className="hidden text-muted lg:table-cell">{fmtRelative(p.updatedAt)}</Td>
                    <Td className="text-right">
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions for ${p.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem icon={<Pencil />} onSelect={() => navigate(`/pages/${p.id}`)}>
                            {can(P.CONTENT_WRITE) ? 'Edit' : 'View'}
                          </MenuItem>
                          {can(P.CONTENT_PUBLISH) &&
                            (p.status === 'PUBLISHED' ? (
                              <MenuItem
                                icon={<EyeOff />}
                                onSelect={() => action.mutate({ id: p.id, op: 'unpublish' })}
                              >
                                Unpublish
                              </MenuItem>
                            ) : (
                              <MenuItem
                                icon={<Eye />}
                                onSelect={() => action.mutate({ id: p.id, op: 'publish' })}
                              >
                                Publish
                              </MenuItem>
                            ))}
                          {can(P.CONTENT_PUBLISH) && p.status !== 'ARCHIVED' && (
                            <MenuItem
                              icon={<Archive />}
                              onSelect={() => action.mutate({ id: p.id, op: 'archive' })}
                            >
                              Archive
                            </MenuItem>
                          )}
                          {can(P.CONTENT_WRITE) && (
                            <MenuItem
                              icon={<Copy />}
                              onSelect={() => action.mutate({ id: p.id, op: 'duplicate' })}
                            >
                              Duplicate
                            </MenuItem>
                          )}
                          {can(P.CONTENT_DELETE) && (
                            <>
                              <MenuSeparator />
                              <MenuItem icon={<Trash2 />} danger onSelect={() => setToDelete(p)}>
                                Delete
                              </MenuItem>
                            </>
                          )}
                        </MenuContent>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && (
          <CardFooter>
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={pageSize}
              onPage={setPage}
              label="pages"
            />
          </CardFooter>
        )}
      </Card>
      <CreatePageModal open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.title}"?`}
        description="The page and all of its sections will be permanently deleted. This cannot be undone."
        confirmLabel="Delete page"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
