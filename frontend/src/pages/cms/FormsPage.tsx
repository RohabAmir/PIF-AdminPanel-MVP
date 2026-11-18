import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Inbox, Mail, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import type { FormDef } from '@/lib/types';
import { fmtRelative } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/data';
import { Switch } from '@/components/ui/controls';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';

export default function FormsPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<FormDef | null>(null);
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['forms'], async () => (await api.get<FormDef[]>('/forms')).data);
  const toggle = useSiteMutation(async (f: FormDef) => (await api.patch<FormDef>(`/forms/${f.id}`, { isActive: !f.isActive })).data, {
    success: (f) => (f.isActive ? `"${f.name}" is accepting submissions.` : `"${f.name}" is paused.`),
    invalidate: [['forms']],
  });
  const remove = useSiteMutation(async (id: string) => api.delete(`/forms/${id}`), { success: 'Form deleted. Its leads were kept.', invalidate: [['forms']], onSuccess: () => setToDelete(null) });

  return (
    <>
      <PageHeader title="Forms" description={`Build the forms ${site?.name} visitors fill in — every submission becomes a lead`} crumbs={[{ label: 'Forms' }]} />
      <Card>
        <CardHeader title={`${site?.name} Forms`} description={data ? `${data.length} form${data.length === 1 ? '' : 's'}` : undefined} actions={can(P.CONTENT_WRITE) && <Button size="sm" variant="violet" onClick={() => navigate('/forms/new')}><Plus className="h-4 w-4" /> New form</Button>} />
        <CardBody>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
          ) : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.length ? (
            <EmptyState icon={<ClipboardList />} title="No forms yet" description="Create a contact or booking form for your website." action={can(P.CONTENT_WRITE) && <Button onClick={() => navigate('/forms/new')}><Plus className="h-4 w-4" /> New form</Button>} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.map((f) => (
                <li key={f.id} className="flex flex-col rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-pop">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-qa-violet text-white"><ClipboardList className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/forms/${f.id}`} className="block truncate font-semibold text-accent hover:underline">{f.name}</Link>
                      <code className="text-[11px] text-muted">key: {f.key}</code>
                    </div>
                    <Menu>
                      <MenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${f.name}`}><MoreHorizontal className="h-4 w-4" /></Button></MenuTrigger>
                      <MenuContent>
                        <MenuItem icon={<Pencil />} onSelect={() => navigate(`/forms/${f.id}`)}>{can(P.CONTENT_WRITE) ? 'Edit form' : 'View form'}</MenuItem>
                        <MenuItem icon={<Inbox />} onSelect={() => navigate(`/leads?formId=${f.id}`)}>View leads</MenuItem>
                        {can(P.CONTENT_DELETE) && (<><MenuSeparator /><MenuItem icon={<Trash2 />} danger onSelect={() => setToDelete(f)}>Delete</MenuItem></>)}
                      </MenuContent>
                    </Menu>
                  </div>
                  {f.description && <p className="mt-3 line-clamp-2 text-xs text-muted">{f.description}</p>}
                  <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="indigo">{f.fields.length} fields</Badge>
                    <Badge tone="violet">{f._count?.leads ?? 0} leads</Badge>
                    {f.notificationEmail && <Badge tone="gray"><Mail className="h-3 w-3" /> {f.notificationEmail}</Badge>}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                    <span className="text-[11px] text-muted">Updated {fmtRelative(f.updatedAt)}</span>
                    <label className="flex items-center gap-2 text-xs font-medium">
                      {f.isActive ? 'Active' : 'Paused'}
                      <Switch label={`${f.name} accepting submissions`} checked={f.isActive} disabled={!can(P.CONTENT_WRITE) || toggle.isPending} onCheckedChange={() => toggle.mutate(f)} />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete "${toDelete?.name}"?`} description="The form stops accepting submissions immediately. Existing leads are kept." confirmLabel="Delete form" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} />
    </>
  );
}
