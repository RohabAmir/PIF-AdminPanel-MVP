import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Inbox, MessageSquarePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, downloadFile, errorMessage } from '@/lib/api';
import type { FormDef, Lead, LeadStatus, Paginated } from '@/lib/types';
import { cn, fmtDateTime, fmtRelative, humanize } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, SearchInput, SortTh, Table, TableSkeleton, Td, Th, Tr } from '@/components/ui/data';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { LEAD_STATUS, LeadStatusBadge } from '@/components/ui/status';
import { ConfirmDialog, Drawer } from '@/components/ui/dialog';

const STATUSES = Object.keys(LEAD_STATUS) as LeadStatus[];
type LeadsResponse = Paginated<Lead> & { counts: Record<LeadStatus, number> };

function LeadDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useAuth();
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { data: lead, isLoading } = useSiteQuery(['leads', 'detail', id], async () => (await api.get<Lead>(`/leads/${id}`)).data, { enabled: !!id });
  const inv = [['leads'], ['dashboard']];
  const status = useSiteMutation(async (s: LeadStatus) => (await api.patch<Lead>(`/leads/${id}/status`, { status: s })).data, { success: (l) => `Status changed to ${LEAD_STATUS[l.status].label}.`, invalidate: inv });
  const addNote = useSiteMutation(async () => api.post(`/leads/${id}/notes`, { body: note.trim() }), { success: 'Note added.', invalidate: [['leads']], onSuccess: () => setNote('') });
  const remove = useSiteMutation(async () => api.delete(`/leads/${id}`), { success: 'Lead deleted.', invalidate: inv, onSuccess: () => { setConfirm(false); onClose(); } });

  const fields = lead?.form?.fields ?? [];
  const entries = lead ? Object.entries(lead.data) : [];
  const labelFor = (k: string) => fields.find((f) => f.name === k)?.label ?? humanize(k);
  const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? '') || '—');

  return (
    <Drawer
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title={lead ? lead.name ?? lead.email ?? 'Lead' : 'Lead'}
      description={lead ? `${lead.formName} · ${fmtDateTime(lead.createdAt)}` : undefined}
      footer={can(P.LEADS_DELETE) && lead ? <Button variant="danger-ghost" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Delete lead</Button> : undefined}
    >
      {isLoading || !lead ? (
        <TableSkeleton rows={6} cols={2} />
      ) : (
        <div className="space-y-6">
          <Field label="Status">
            <Select value={lead.status} disabled={!can(P.LEADS_UPDATE) || status.isPending} onChange={(e) => status.mutate(e.target.value as LeadStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
            </Select>
          </Field>
          <section aria-labelledby="lead-submission">
            <h3 id="lead-submission" className="mb-2 text-[0.8125rem] font-bold">Submission</h3>
            <dl className="divide-y divide-line rounded-lg border border-line text-[0.8125rem]">
              {entries.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 px-3 py-2">
                  <dt className="text-muted">{labelFor(k)}</dt>
                  <dd className="col-span-2 whitespace-pre-wrap break-words">{show(v)}</dd>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 px-3 py-2"><dt className="text-muted">Source page</dt><dd className="col-span-2">{lead.sourcePage ?? '—'}</dd></div>
            </dl>
          </section>
          <section aria-labelledby="lead-notes">
            <h3 id="lead-notes" className="mb-2 text-[0.8125rem] font-bold">Internal notes ({lead.notes?.length ?? 0})</h3>
            {can(P.LEADS_UPDATE) && (
              <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) addNote.mutate(undefined); }}>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder="Add a note for your team…" aria-label="New note" />
                <Button type="submit" size="sm" loading={addNote.isPending} disabled={!note.trim()}><MessageSquarePlus className="h-4 w-4" /> Add note</Button>
              </form>
            )}
            {lead.notes?.length ? (
              <ol className="space-y-2">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-body/70 px-3 py-2">
                    <p className="whitespace-pre-wrap text-[0.8125rem]">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted">{n.authorName} · {fmtRelative(n.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-xs text-muted">No notes yet.</p>}
          </section>
        </div>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Delete this lead?" description="The submission and its notes will be permanently deleted." confirmLabel="Delete lead" loading={remove.isPending} onConfirm={() => remove.mutate(undefined)} />
    </Drawer>
  );
}

export default function LeadsPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const [params] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [formId, setFormId] = useState(params.get('formId') ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 15;

  const filters = { search: search || undefined, status: status || undefined, formId: formId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const query = { ...filters, page, pageSize, sortBy, sortOrder };
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['leads', query], async () => (await api.get<LeadsResponse>('/leads', { params: query })).data, { placeholderData: (p) => p });
  const forms = useSiteQuery(['forms'], async () => (await api.get<FormDef[]>('/forms')).data);
  const quickStatus = useSiteMutation(async ({ id, s }: { id: string; s: LeadStatus }) => api.patch(`/leads/${id}/status`, { status: s }), { success: (_d, v) => `Lead marked ${LEAD_STATUS[v.s].label}.`, invalidate: [['leads'], ['dashboard']] });

  const reset = () => { setSearch(''); setStatus(''); setFormId(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const hasFilters = Object.values(filters).some(Boolean);
  const total = data ? STATUSES.reduce((a, s) => a + (data.counts[s] ?? 0), 0) : 0;
  const onSort = (f: typeof sortBy) => { if (f === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); else { setSortBy(f); setSortOrder(f === 'createdAt' ? 'desc' : 'asc'); } setPage(1); };
  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile('/leads/export', filters, `leads-${site?.slug}.csv`);
      toast.success('CSV export downloaded.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Leads" description={`Every form submission from ${site?.name}, in one place`} crumbs={[{ label: 'Leads' }]} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <button type="button" onClick={() => { setStatus(''); setPage(1); }} className={cn('card px-4 py-3 text-left transition-shadow hover:shadow-pop', !status && 'ring-2 ring-primary')} aria-pressed={!status}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">All leads</p>
          <p className="text-xl font-bold text-accent tabular-nums">{data ? total : '–'}</p>
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => { setStatus(s); setPage(1); }} className={cn('card px-4 py-3 text-left transition-shadow hover:shadow-pop', status === s && 'ring-2 ring-primary')} aria-pressed={status === s}>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEAD_STATUS[s].color }} aria-hidden />{LEAD_STATUS[s].label}</p>
            <p className="text-xl font-bold text-accent tabular-nums">{data ? data.counts[s] ?? 0 : '–'}</p>
          </button>
        ))}
      </div>
      <Card>
        <CardHeader
          title={`${site?.name} Leads`}
          description={data ? `${data.meta.total} matching` : undefined}
          actions={
            <>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name, email, phone" />
              {can(P.LEADS_EXPORT) && <Button size="sm" variant="violet" loading={exporting} disabled={!data?.meta.total} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>}
            </>
          }
        />
        <div className="grid grid-cols-1 gap-3 border-x border-b border-accent-border bg-white px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
          <Select aria-label="Filter by form" value={formId} onChange={(e) => { setFormId(e.target.value); setPage(1); }}>
            <option value="">All forms</option>
            {forms.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as LeadStatus | ''); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
          </Select>
          <Input type="date" aria-label="From date" value={dateFrom} max={dateTo || undefined} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          <Input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          <Button variant="outline" disabled={!hasFilters} onClick={reset}>Reset filters</Button>
        </div>
        <CardBody>
          {isLoading ? <TableSkeleton /> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.data.length ? (
            <EmptyState icon={<Inbox />} title={hasFilters ? 'No leads match your filters' : 'No leads yet'} description={hasFilters ? 'Try widening the date range or clearing filters.' : 'Leads appear here as soon as a visitor submits a form on your website.'} action={hasFilters ? <Button variant="outline" onClick={reset}>Reset filters</Button> : undefined} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <SortTh label="Contact" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <Th className="hidden md:table-cell">Form</Th>
                  <SortTh label="Status" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <Th className="hidden lg:table-cell">Source</Th>
                  <SortTh label="Submitted" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((l) => (
                  <Tr key={l.id} className="cursor-pointer" onClick={() => setOpenId(l.id)}>
                    <Td>
                      <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); setOpenId(l.id); }}>
                        <span className="block font-semibold text-accent hover:underline">{l.name ?? 'Anonymous'}</span>
                        <span className="block text-[11px] text-muted">{l.email ?? l.phone ?? '—'}</span>
                      </button>
                    </Td>
                    <Td className="hidden md:table-cell">{l.formName}</Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      {can(P.LEADS_UPDATE) ? (
                        <Select aria-label={`Status for ${l.name ?? l.email}`} className="w-32" value={l.status} onChange={(e) => quickStatus.mutate({ id: l.id, s: e.target.value as LeadStatus })}>
                          {STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
                        </Select>
                      ) : <LeadStatusBadge status={l.status} />}
                    </Td>
                    <Td className="hidden lg:table-cell text-muted">{l.sourcePage ?? '—'}</Td>
                    <Td className="hidden sm:table-cell text-muted" title={fmtDateTime(l.createdAt)}>{fmtRelative(l.createdAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && <CardFooter><Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={pageSize} onPage={setPage} label="leads" /></CardFooter>}
      </Card>
      <LeadDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
