import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenText, Eye, EyeOff, FolderCog, MoreHorizontal, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { BlogCategory, BlogPost, BlogStatus, Paginated } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, SearchInput, SortTh, Table, TableSkeleton, Td, Th, Tr } from '@/components/ui/data';
import { Input, Select } from '@/components/ui/input';
import { ContentStatusBadge } from '@/components/ui/status';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';

function CategoriesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { can } = useAuth();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<BlogCategory | null>(null);
  const { data, isLoading } = useSiteQuery(['categories'], async () => (await api.get<BlogCategory[]>('/blog-categories')).data, { enabled: open });
  const inv = [['categories'], ['blogs']];
  const create = useSiteMutation(async (n: string) => api.post('/blog-categories', { name: n }), { success: 'Category added.', invalidate: inv, onSuccess: () => setName('') });
  const update = useSiteMutation(async (c: { id: string; name: string }) => api.patch(`/blog-categories/${c.id}`, { name: c.name }), { success: 'Category renamed.', invalidate: inv, onSuccess: () => setEditing(null) });
  const remove = useSiteMutation(async (id: string) => api.delete(`/blog-categories/${id}`), { success: 'Category deleted.', invalidate: inv, onSuccess: () => setToDelete(null) });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Blog categories" description="Posts in a deleted category become uncategorised.">
      {can(P.CONTENT_WRITE) && (
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate(name.trim()); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" maxLength={60} aria-label="New category name" />
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}><Plus className="h-4 w-4" /> Add</Button>
        </form>
      )}
      {isLoading ? <TableSkeleton rows={3} cols={2} /> : !data?.length ? <EmptyState title="No categories yet" /> : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === c.id ? (
                <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editing.name.trim()) update.mutate({ id: c.id, name: editing.name.trim() }); }}>
                  <Input autoFocus value={editing.name} maxLength={60} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} aria-label="Category name" />
                  <Button type="submit" size="icon" aria-label="Save" loading={update.isPending}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Cancel" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-[0.8125rem] font-medium">{c.name}</span>
                  <Badge tone="indigo">{c._count?.posts ?? 0} posts</Badge>
                  {can(P.CONTENT_WRITE) && <Button size="icon" variant="ghost" aria-label={`Rename ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}><Pencil className="h-3.5 w-3.5" /></Button>}
                  {can(P.CONTENT_DELETE) && <Button size="icon" variant="danger-ghost" aria-label={`Delete ${c.name}`} onClick={() => setToDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete "${toDelete?.name}"?`} description="Posts in this category will become uncategorised." confirmLabel="Delete" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} />
    </Modal>
  );
}

type SortBy = 'title' | 'publishedAt' | 'updatedAt';

export default function BlogsListPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BlogStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cats, setCats] = useState(false);
  const [toDelete, setToDelete] = useState<BlogPost | null>(null);
  const pageSize = 10;
  const params = { page, pageSize, search: search || undefined, status: status || undefined, categoryId: categoryId || undefined, sortBy, sortOrder };
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['blogs', params], async () => (await api.get<Paginated<BlogPost>>('/blogs', { params })).data, { placeholderData: (p) => p });
  const categories = useSiteQuery(['categories'], async () => (await api.get<BlogCategory[]>('/blog-categories')).data);
  const inv = [['blogs'], ['dashboard']];
  const publish = useSiteMutation(async ({ id, op }: { id: string; op: 'publish' | 'unpublish' }) => (await api.post<BlogPost>(`/blogs/${id}/${op}`, op === 'publish' ? {} : undefined)).data, {
    success: (b, v) => (v.op === 'publish' ? `"${b.title}" published.` : `"${b.title}" moved back to draft.`),
    invalidate: inv,
  });
  const remove = useSiteMutation(async (id: string) => api.delete(`/blogs/${id}`), { success: 'Post deleted.', invalidate: inv, onSuccess: () => setToDelete(null) });
  const onSort = (f: SortBy) => {
    if (f === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(f); setSortOrder(f === 'title' ? 'asc' : 'desc'); }
    setPage(1);
  };
  const filtered = !!(search || status || categoryId);

  return (
    <>
      <PageHeader title="Blogs" description={`Write, schedule and publish articles for ${site?.name}`} crumbs={[{ label: 'Blogs' }]} />
      <Card>
        <CardHeader
          title={`${site?.name} Blog Posts`}
          description={data ? `${data.meta.total} post${data.meta.total === 1 ? '' : 's'}` : undefined}
          actions={
            <>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search posts or tags" />
              <Select aria-label="Filter by status" className="w-full sm:w-36" value={status} onChange={(e) => { setStatus(e.target.value as BlogStatus | ''); setPage(1); }}>
                <option value="">All statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="DRAFT">Draft</option>
              </Select>
              <Select aria-label="Filter by category" className="w-full sm:w-40" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
                <option value="">All categories</option>
                {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" onClick={() => setCats(true)}><FolderCog className="h-4 w-4" /> Categories</Button>
              {can(P.CONTENT_WRITE) && <Button size="sm" variant="violet" onClick={() => navigate('/blogs/new')}><Plus className="h-4 w-4" /> New post</Button>}
            </>
          }
        />
        <CardBody>
          {isLoading ? <TableSkeleton /> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.data.length ? (
            <EmptyState icon={<BookOpenText />} title={filtered ? 'No posts match your filters' : 'No blog posts yet'} description={filtered ? 'Try different filters.' : 'Write your first article.'} action={can(P.CONTENT_WRITE) && !filtered ? <Button onClick={() => navigate('/blogs/new')}><Plus className="h-4 w-4" /> New post</Button> : undefined} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <SortTh label="Post" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <Th className="hidden md:table-cell">Category</Th>
                  <Th>Status</Th>
                  <SortTh label="Publish date" field="publishedAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden lg:table-cell" />
                  <Th className="hidden xl:table-cell">Author</Th>
                  <Th className="w-16 text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((b) => (
                  <Tr key={b.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="hidden h-11 w-16 shrink-0 overflow-hidden rounded-md bg-body sm:block">{b.coverImage && <img src={b.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0">
                          <Link to={`/blogs/${b.id}`} className="line-clamp-1 font-semibold text-accent hover:underline">{b.title}</Link>
                          <p className="line-clamp-1 max-w-[360px] text-[11px] text-muted">{b.readingTime} min read{b.tags.length ? ` · #${b.tags.slice(0, 3).join(' #')}` : ''}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden md:table-cell">{b.category ? <Badge tone="indigo">{b.category.name}</Badge> : <span className="text-muted">—</span>}</Td>
                    <Td><ContentStatusBadge status={b.status} /></Td>
                    <Td className="hidden lg:table-cell text-muted">{fmtDate(b.publishedAt)}</Td>
                    <Td className="hidden xl:table-cell text-muted">{b.author?.name ?? '—'}</Td>
                    <Td className="text-right">
                      <Menu>
                        <MenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${b.title}`}><MoreHorizontal className="h-4 w-4" /></Button></MenuTrigger>
                        <MenuContent>
                          <MenuItem icon={<Pencil />} onSelect={() => navigate(`/blogs/${b.id}`)}>{can(P.CONTENT_WRITE) ? 'Edit' : 'View'}</MenuItem>
                          {can(P.CONTENT_PUBLISH) && (b.status === 'DRAFT' ? (
                            <MenuItem icon={<Eye />} onSelect={() => publish.mutate({ id: b.id, op: 'publish' })}>Publish now</MenuItem>
                          ) : (
                            <MenuItem icon={<EyeOff />} onSelect={() => publish.mutate({ id: b.id, op: 'unpublish' })}>Unpublish</MenuItem>
                          ))}
                          {can(P.CONTENT_DELETE) && (<><MenuSeparator /><MenuItem icon={<Trash2 />} danger onSelect={() => setToDelete(b)}>Delete</MenuItem></>)}
                        </MenuContent>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && <CardFooter><Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={pageSize} onPage={setPage} label="posts" /></CardFooter>}
      </Card>
      <CategoriesModal open={cats} onOpenChange={setCats} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete "${toDelete?.title}"?`} description="This post will be permanently deleted." confirmLabel="Delete post" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} />
    </>
  );
}
