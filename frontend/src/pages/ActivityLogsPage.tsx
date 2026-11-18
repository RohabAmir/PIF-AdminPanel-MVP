import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Fingerprint } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, downloadFile, errorMessage } from '@/lib/api';
import type { ActivityLog, Paginated, Role, Site } from '@/lib/types';
import { cn, fmtDateTime, fmtRelative, humanize } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, SearchInput, Table, TableSkeleton, Td, Th, Tr } from '@/components/ui/data';
import { Input, Select } from '@/components/ui/input';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { RoleBadge } from '@/components/ui/status';

interface Facets {
  actions: string[];
  entityTypes: string[];
  actors: { actorId: string; actorName: string | null; actorEmail: string | null }[];
}

const actionTone = (a: string): BadgeTone =>
  /deleted|failed|locked|reuse|deactivated/.test(a) ? 'red' : /created|published|activated|login$|uploaded|added/.test(a) ? 'green' : /updated|changed|reordered|status/.test(a) ? 'blue' : /logout|unpublished|archived/.test(a) ? 'amber' : 'indigo';

function JsonBlock({ label, value, tone }: { label: string; value: unknown; tone: 'before' | 'after' }) {
  const empty = value === null || value === undefined || (typeof value === 'object' && Object.keys(value as object).length === 0);
  return (
    <div className="min-w-0">
      <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', tone === 'before' ? 'text-danger' : 'text-success')}>{label}</p>
      {empty ? <p className="rounded-lg bg-body px-3 py-2 text-xs text-muted">—</p> : (
        <pre className={cn('scrollbar-thin max-h-72 overflow-auto rounded-lg px-3 py-2 text-[11px] leading-relaxed', tone === 'before' ? 'bg-danger/5 text-[#8b2a1b]' : 'bg-success/5 text-[#0f6b51]')}>{JSON.stringify(value, null, 2)}</pre>
      )}
    </div>
  );
}

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actorId, setActorId] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [siteId, setSiteId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;
  const filters = { search: search || undefined, actorId: actorId || undefined, role: role || undefined, siteId: siteId || undefined, action: action || undefined, entityType: entityType || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['activity-logs', filters, page], queryFn: async () => (await api.get<Paginated<ActivityLog>>('/activity-logs', { params: { ...filters, page, pageSize } })).data, placeholderData: (p) => p });
  const facets = useQuery({ queryKey: ['activity-logs', 'facets'], queryFn: async () => (await api.get<Facets>('/activity-logs/facets')).data, staleTime: 60_000 });
  const sites = useQuery({ queryKey: ['sites', 'all'], queryFn: async () => (await api.get<Paginated<Site>>('/sites', { params: { pageSize: 100 } })).data.data, staleTime: 60_000 });
  const hasFilters = Object.values(filters).some(Boolean);
  const reset = () => { setSearch(''); setActorId(''); setRole(''); setSiteId(''); setAction(''); setEntityType(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const f = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const exportCsv = async () => {
    setExporting(true);
    try { await downloadFile('/activity-logs/export', filters, 'activity-logs.csv'); toast.success('CSV export downloaded.'); } catch (e) { toast.error(errorMessage(e)); } finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Activity Logs" description="To have a detailed demonstration of all the activities performed by the users" crumbs={[{ label: 'Activity Logs' }]} />
      <Card>
        <CardHeader title="Users & Activities" description={data ? `${data.meta.total} entries · append-only` : undefined} actions={<><SearchInput value={search} onChange={f(setSearch)} placeholder="Search summary or user" /><Button size="sm" variant="violet" loading={exporting} disabled={!data?.meta.total} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button></>} />
        <div className="grid grid-cols-1 gap-3 border-x border-b border-accent-border bg-white px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <Select aria-label="Filter by user" value={actorId} onChange={(e) => f(setActorId)(e.target.value)}><option value="">All users</option>{facets.data?.actors.map((a) => <option key={a.actorId} value={a.actorId}>{a.actorName} ({a.actorEmail})</option>)}</Select>
          <Select aria-label="Filter by role" value={role} onChange={(e) => f(setRole)(e.target.value as Role | '')}><option value="">All roles</option>{(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
          <Select aria-label="Filter by website" value={siteId} onChange={(e) => f(setSiteId)(e.target.value)}><option value="">All websites</option><option value="global">Global (no website)</option>{sites.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select aria-label="Filter by action" value={action} onChange={(e) => f(setAction)(e.target.value)}><option value="">All actions</option>{facets.data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
          <Select aria-label="Filter by entity" value={entityType} onChange={(e) => f(setEntityType)(e.target.value)}><option value="">All entities</option>{facets.data?.entityTypes.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</Select>
          <Input type="date" aria-label="From date" value={dateFrom} max={dateTo || undefined} onChange={(e) => f(setDateFrom)(e.target.value)} />
          <Input type="date" aria-label="To date" value={dateTo} min={dateFrom || undefined} onChange={(e) => f(setDateTo)(e.target.value)} />
          <Button variant="outline" disabled={!hasFilters} onClick={reset}>Reset filters</Button>
        </div>
        <CardBody>
          {isLoading ? <TableSkeleton rows={10} /> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.data.length ? (
            <EmptyState icon={<Fingerprint />} title={hasFilters ? 'No entries match your filters' : 'No activity yet'} action={hasFilters && <Button variant="outline" onClick={reset}>Reset filters</Button>} />
          ) : (
            <Table>
              <thead><tr><Th className="w-8"><span className="sr-only">Expand</span></Th><Th>When</Th><Th>User</Th><Th>Action</Th><Th className="hidden md:table-cell">Summary</Th><Th className="hidden lg:table-cell">Website</Th></tr></thead>
              <tbody>
                {data.data.map((l) => {
                  const open = expanded === l.id;
                  return (
                    <Fragment key={l.id}>
                      <Tr className="cursor-pointer" onClick={() => setExpanded(open ? null : l.id)}>
                        <Td>
                          <button type="button" aria-expanded={open} aria-label={open ? 'Hide details' : 'Show details'} onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : l.id); }} className="text-muted hover:text-accent">
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </Td>
                        <Td className="whitespace-nowrap" title={fmtDateTime(l.createdAt)}><span className="block text-[0.8125rem]">{fmtDateTime(l.createdAt)}</span><span className="text-[11px] text-muted">{fmtRelative(l.createdAt)}</span></Td>
                        <Td>
                          {l.actorName ? <><span className="block font-medium">{l.actorName}</span><span className="flex items-center gap-1 text-[11px] text-muted">{l.actorRole && <RoleBadge role={l.actorRole} />}</span></> : <span className="text-muted">Public website</span>}
                        </Td>
                        <Td><Badge tone={actionTone(l.action)}>{l.action}</Badge></Td>
                        <Td className="hidden max-w-md md:table-cell"><span className="line-clamp-2">{l.summary}</span></Td>
                        <Td className="hidden lg:table-cell text-muted">{l.siteName ?? 'Global'}</Td>
                      </Tr>
                      {open && (
                        <tr className="bg-body/40">
                          <td colSpan={6} className="px-4 py-4">
                            <p className="mb-3 text-[0.8125rem] md:hidden">{l.summary}</p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><JsonBlock label="Before" value={l.before} tone="before" /><JsonBlock label="After" value={l.after} tone="after" /></div>
                            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] text-muted sm:grid-cols-2 lg:grid-cols-4">
                              <div><dt className="inline font-semibold">Entity: </dt><dd className="inline">{l.entityType ?? '—'} {l.entityId && <code>{l.entityId.slice(0, 8)}…</code>}</dd></div>
                              <div><dt className="inline font-semibold">IP: </dt><dd className="inline">{l.ip ?? '—'}</dd></div>
                              <div><dt className="inline font-semibold">Request: </dt><dd className="inline"><code>{l.requestId?.slice(0, 13) ?? '—'}</code></dd></div>
                              <div className="truncate" title={l.userAgent ?? ''}><dt className="inline font-semibold">Agent: </dt><dd className="inline">{l.userAgent ?? '—'}</dd></div>
                              {l.actorEmail && <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{l.actorEmail}</dd></div>}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && <CardFooter><Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={pageSize} onPage={setPage} label="entries" /></CardFooter>}
      </Card>
    </>
  );
}
