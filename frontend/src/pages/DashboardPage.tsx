import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BookOpenText, FileStack, Globe, Inbox, ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, fmtRelative, cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/permissions';
import type { LeadStatus, Role } from '@/lib/types';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteQuery } from '@/hooks/useSiteQuery';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/data';
import { LEAD_STATUS, LeadStatusBadge } from '@/components/ui/status';
import { Badge } from '@/components/ui/badge';
import { errorMessage } from '@/lib/api';

interface Stats {
  kpis: { publishedPages: number; totalPages: number; publishedPosts: number; totalPosts: number; leadsThisMonth: number; leadsLastMonth: number; totalLeads: number; activeUsers: number };
  leadsOverTime: { date: string; count: number }[];
  leadsByStatus: { status: LeadStatus; count: number }[];
  recentLeads: { id: string; name: string | null; email: string | null; formName: string; status: LeadStatus; createdAt: string }[];
  recentActivity: { id: string; action: string; summary: string; actorName: string | null; actorRole: Role | null; siteName: string | null; createdAt: string }[];
  crossSite: null | {
    totalSites: number;
    totalUsers: number;
    sites: { id: string; name: string; slug: string; primaryColor: string; isActive: boolean; leads30d: number; _count: { pages: number; blogPosts: number; leads: number; users: number } }[];
  };
}

function Sparkline({ color = '#fff' }: { color?: string }) {
  return (
    <svg viewBox="0 0 100 24" className="h-6 w-24" aria-hidden>
      <path d="M0 14 C10 4, 18 22, 28 12 S45 2, 55 14 S75 20, 82 8 S95 12, 100 4" fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function Kpi({ label, value, sub, icon, bg, to }: { label: string; value: number | string; sub: string; icon: ReactNode; bg: string; to: string }) {
  return (
    <Link to={to} className={cn('group relative overflow-hidden rounded-card p-5 text-white shadow-[0_8px_24px_-12px_rgba(74,74,137,0.55)] transition-transform hover:-translate-y-0.5', bg)}>
      <span className="pointer-events-none absolute bottom-3 right-4 opacity-50">
        <Sparkline color="#2b2b55" />
      </span>
      <div className="relative flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/25 [&>svg]:h-6 [&>svg]:w-6">{icon}</span>
        <div className="min-w-0 flex-1 pt-1">
          <p className="whitespace-nowrap text-[0.8125rem] font-medium text-white/90">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
          <p className="mt-0.5 text-[11px] text-white/85">{sub}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { site } = useSite();
  const tz = new Date().getTimezoneOffset();
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['dashboard', tz], async () => (await api.get<Stats>('/dashboard/stats', { params: { tzOffset: tz } })).data);
  if (!user || !site) return null;

  const firstName = user.name.split(' ')[0];
  const trend = data ? data.kpis.leadsThisMonth - data.kpis.leadsLastMonth : 0;
  const totalByStatus = data?.leadsByStatus.reduce((a, b) => a + b.count, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">
            Welcome Back, {firstName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">{fmtDate(new Date(), 'EEEE, MMMM d, yyyy')} · {site.name}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-[0.8125rem] font-semibold text-white shadow-sm">
          <ShieldCheck className="h-4 w-4" aria-hidden /> {ROLE_LABEL[user.role]} Role
        </span>
      </div>

      {isError ? (
        <Card>
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading || !data ? (
              Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[112px] rounded-card" />)
            ) : (
              <>
                <Kpi to="/pages" bg="bg-kpi-violet" icon={<FileStack />} label="Published pages" value={data.kpis.publishedPages} sub={`${data.kpis.totalPages} pages in total`} />
                <Kpi to="/blogs" bg="bg-kpi-indigo" icon={<BookOpenText />} label="Blog posts" value={data.kpis.publishedPosts} sub={`${data.kpis.totalPosts - data.kpis.publishedPosts} drafts & scheduled`} />
                <Kpi to="/leads" bg="bg-kpi-copper" icon={<Inbox />} label="Leads this month" value={data.kpis.leadsThisMonth} sub={`${trend >= 0 ? '+' : ''}${trend} vs last month`} />
                <Kpi to={user.role === 'SUPER_ADMIN' ? '/users' : '/dashboard'} bg="bg-kpi-violet" icon={<Users />} label="Active users" value={data.kpis.activeUsers} sub="with access to this website" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Leads over time"
                description="New submissions per day — last 30 days"
                actions={
                  data && (
                    <Badge tone={trend >= 0 ? 'green' : 'red'}>
                      {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {data.kpis.leadsThisMonth} this month
                    </Badge>
                  )
                }
              />
              <CardBody>
                {isLoading || !data ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="h-64" role="img" aria-label={`Line chart of leads per day. ${data.leadsOverTime.reduce((a, b) => a + b.count, 0)} leads in the last 30 days.`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.leadsOverTime} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#845ADF" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#845ADF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#F3F3F3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d: string) => fmtDate(d, 'd MMM')} tick={{ fontSize: 11, fill: '#8C9097' }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8C9097' }} tickLine={false} axisLine={false} />
                        <Tooltip labelFormatter={(d) => fmtDate(String(d), 'EEE d MMM')} formatter={(v) => [v, 'Leads']} contentStyle={{ borderRadius: 10, border: '1px solid #E9EDF6', fontSize: 12 }} />
                        <Area type="monotone" dataKey="count" stroke="#4A4A89" strokeWidth={2} fill="url(#leadsFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Leads by status" description={`${totalByStatus} leads in total`} />
              <CardBody>
                {isLoading || !data ? (
                  <Skeleton className="h-64 w-full" />
                ) : totalByStatus === 0 ? (
                  <EmptyState title="No leads yet" description="Submissions from your website forms will appear here." />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-44 w-44" role="img" aria-label="Donut chart of leads by status">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.leadsByStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                            {data.leadsByStatus.map((s) => (
                              <Cell key={s.status} fill={LEAD_STATUS[s.status].color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, LEAD_STATUS[n as LeadStatus].label]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="grid w-full grid-cols-2 gap-2">
                      {data.leadsByStatus.map((s) => (
                        <li key={s.status} className="flex items-center justify-between rounded-lg bg-body/70 px-3 py-1.5 text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: LEAD_STATUS[s.status].color }} aria-hidden />
                            {LEAD_STATUS[s.status].label}
                          </span>
                          <b className="tabular-nums">{s.count}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Recent leads"
                actions={
                  <Link to="/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <CardBody className="p-0 sm:p-0">
                {isLoading || !data ? (
                  <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : data.recentLeads.length === 0 ? (
                  <EmptyState title="No leads yet" description="Share a form on your website or try the API Playground." />
                ) : (
                  <ul className="divide-y divide-line">
                    {data.recentLeads.map((l) => (
                      <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{(l.name ?? l.email ?? '?')[0]?.toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.8125rem] font-semibold">{l.name ?? l.email ?? 'Anonymous'}</p>
                          <p className="truncate text-[11px] text-muted">
                            {l.formName} · {fmtRelative(l.createdAt)}
                          </p>
                        </div>
                        <LeadStatusBadge status={l.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent activity" description={user.role === 'SUPER_ADMIN' ? 'Everyone on this website' : 'Your own recent actions'} />
              <CardBody className="p-0 sm:p-0">
                {isLoading || !data ? (
                  <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : data.recentActivity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Actions you take will appear here." />
                ) : (
                  <ol className="relative space-y-0 px-5 py-2">
                    {data.recentActivity.map((a) => (
                      <li key={a.id} className="relative border-l-2 border-accent-border py-2.5 pl-4">
                        <span className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-primary" aria-hidden />
                        <p className="text-[0.8125rem]">{a.summary}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {fmtRelative(a.createdAt)}
                          {a.siteName ? ` · ${a.siteName}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>

          {data?.crossSite && (
            <Card>
              <CardHeader
                title="All websites overview"
                description={`${data.crossSite.totalSites} websites · ${data.crossSite.totalUsers} users`}
                actions={
                  <Link to="/sites" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Manage websites <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.crossSite.sites.map((s) => (
                    <div key={s.id} className="rounded-xl border border-line bg-qa-soft p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: s.primaryColor }} aria-hidden>
                          <Globe className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-accent">{s.name}</p>
                          <p className="truncate text-[11px] text-muted">{s.slug}</p>
                        </div>
                        <Badge tone={s.isActive ? 'green' : 'gray'} dot>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                        {[
                          ['Pages', s._count.pages],
                          ['Posts', s._count.blogPosts],
                          ['Leads', s._count.leads],
                          ['30d', s.leads30d],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-white px-1 py-2">
                            <dt className="text-[10px] uppercase tracking-wide text-muted">{k}</dt>
                            <dd className="text-sm font-bold tabular-nums text-accent">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
