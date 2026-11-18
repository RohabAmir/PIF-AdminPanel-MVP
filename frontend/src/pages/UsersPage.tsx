import { useEffect, useState } from 'react';
import { MailWarning, MoreHorizontal, Pencil, Plus, Power, Send, Trash2, UserCircle, UserPlus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import type { Paginated, Role, Site, User, UserStatus } from '@/lib/types';
import { fmtDate, fmtRelative } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, EmptyState, ErrorState, Pagination, SearchInput, SortTh, Table, TableSkeleton, Td, Th, Tr } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/controls';
import { Badge } from '@/components/ui/badge';
import { RoleBadge, UserStatusBadge } from '@/components/ui/status';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';

const ASSIGNABLE: Role[] = ['ADMIN', 'EDITOR', 'VIEWER'];
const ROLE_HELP: Record<string, string> = { ADMIN: 'Full content control incl. publishing, deleting, SEO & social settings, lead export.', EDITOR: 'Create and edit content, update leads. Cannot publish or delete.', VIEWER: 'Read-only access to the assigned websites.' };
type SortBy = 'name' | 'email' | 'createdAt' | 'lastLoginAt' | 'role';

function useAllSites(enabled = true) {
  return useQuery({ queryKey: ['sites', 'all'], queryFn: async () => (await api.get<Paginated<Site>>('/sites', { params: { pageSize: 100, sortOrder: 'asc' } })).data.data, enabled, staleTime: 60_000 });
}

function SitesPicker({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const { data, isLoading } = useAllSites();
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold text-ink/80">Websites <span className="text-danger">*</span></legend>
      {isLoading ? <p className="text-xs text-muted">Loading websites…</p> : (
        <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-field p-2 sm:grid-cols-2">
          {data?.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] hover:bg-body">
              <Checkbox checked={value.includes(s.id)} onCheckedChange={(c) => onChange(c ? [...value, s.id] : value.filter((x) => x !== s.id))} label={s.name} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.primaryColor }} aria-hidden />
              <span className="truncate">{s.name}</span>
              {!s.isActive && <Badge tone="gray">inactive</Badge>}
            </label>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-[11px] font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

function UserModal({ open, onOpenChange, user, onEmailFailed }: { open: boolean; onOpenChange: (o: boolean) => void; user: User | null; onEmailFailed: (u: User) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setRole(user && user.role !== 'SUPER_ADMIN' ? user.role : 'EDITOR');
    setSiteIds(user?.sites.map((s) => s.id) ?? []);
  }, [open, user]);
  const isSuper = user?.role === 'SUPER_ADMIN';
  const save = useMutation({
    mutationFn: async () => {
      if (user) return { user: (await api.patch<User>(`/users/${user.id}`, { name: name.trim(), ...(isSuper ? {} : { role, siteIds }) })).data, emailSent: true };
      return (await api.post<{ user: User; emailSent: boolean }>('/users', { name: name.trim(), email: email.trim().toLowerCase(), role, siteIds })).data;
    },
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      if (!user && !res.emailSent) onEmailFailed(res.user);
      else toast.success(user ? 'User updated.' : `${res.user.name} added — a welcome email with a temporary password is on its way.`);
    },
    onError: (e) => {
      const fe = fieldErrors(e);
      if (fe.length) setErrors(Object.fromEntries(fe.map((f) => [f.field, f.message])));
      else toast.error(errorMessage(e));
    },
  });
  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!isSuper && siteIds.length === 0) e.siteIds = 'Assign at least one website.';
    setErrors(e);
    return !Object.keys(e).length;
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title={user ? `Edit ${user.name}` : 'Add user'} description={user ? undefined : 'They will get a branded welcome email with a temporary password, then verify with a one-time code and set their own password.'}
      footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={save.isPending} onClick={() => validate() && save.mutate()}>{user ? 'Save changes' : <><UserPlus className="h-4 w-4" /> Add user & send invite</>}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name}><Input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email" required error={errors.email} hint={user ? 'Email cannot be changed.' : undefined}><Input type="email" value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} /></Field>
        {isSuper ? (
          <p className="rounded-lg bg-body px-3 py-2 text-xs text-muted sm:col-span-2">Super Admins can access every website; their role cannot be changed here.</p>
        ) : (
          <>
            <Field label="Role" required error={errors.role} hint={ROLE_HELP[role]} className="sm:col-span-2">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
            </Field>
            <div className="sm:col-span-2"><SitesPicker value={siteIds} onChange={setSiteIds} error={errors.siteIds} /></div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [siteId, setSiteId] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editing, setEditing] = useState<User | null | 'new'>(null);
  const [emailFailed, setEmailFailed] = useState<User | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [toToggle, setToToggle] = useState<User | null>(null);
  const pageSize = 10;
  const params = { page, pageSize, search: search || undefined, role: role || undefined, status: status || undefined, siteId: siteId || undefined, sortBy, sortOrder };
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['users', params], queryFn: async () => (await api.get<Paginated<User>>('/users', { params })).data, placeholderData: (p) => p });
  const sites = useAllSites();
  const inv = () => qc.invalidateQueries({ queryKey: ['users'] });
  const resend = useMutation({
    mutationFn: async (u: User) => (await api.post<{ user: User; emailSent: boolean }>(`/users/${u.id}/resend-welcome`)).data,
    onSuccess: async (r) => { await inv(); setEmailFailed(r.emailSent ? null : r.user); if (r.emailSent) toast.success(`New temporary password sent to ${r.user.email}.`); else toast.error('The email could not be delivered. Check the mail settings and try again.'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({ mutationFn: async (u: User) => (await api.patch<User>(`/users/${u.id}/status`, { status: u.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' })).data, onSuccess: async (u) => { toast.success(u.status === 'INACTIVE' ? `${u.name} deactivated — all their sessions were signed out.` : `${u.name} reactivated.`); setToToggle(null); await inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const remove = useMutation({ mutationFn: async (u: User) => api.delete(`/users/${u.id}`), onSuccess: async () => { toast.success('User deleted.'); setToDelete(null); await inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  const onSort = (f: SortBy) => { if (f === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); else { setSortBy(f); setSortOrder(f === 'name' || f === 'email' ? 'asc' : 'desc'); } setPage(1); };
  const filtered = !!(search || role || status || siteId);

  return (
    <>
      <PageHeader title="Admins & Users" description="Invite people, assign roles and websites, and control access" crumbs={[{ label: 'Users' }]} />
      <Card>
        <CardHeader title="All Users" description={data ? `${data.meta.total} user${data.meta.total === 1 ? '' : 's'}` : undefined} actions={<><SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Name or email" /><Button size="sm" variant="violet" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add user</Button></>} />
        <div className="grid grid-cols-1 gap-3 border-x border-b border-accent-border bg-white px-4 py-3 sm:grid-cols-3 sm:px-5">
          <Select aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(1); }}><option value="">All roles</option>{(['SUPER_ADMIN', ...ASSIGNABLE] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="PENDING">Pending first login</option><option value="INACTIVE">Inactive</option></Select>
          <Select aria-label="Filter by website" value={siteId} onChange={(e) => { setSiteId(e.target.value); setPage(1); }}><option value="">All websites</option>{sites.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </div>
        <CardBody>
          {isLoading ? <TableSkeleton /> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.data.length ? (
            <EmptyState icon={<UserCircle />} title={filtered ? 'No users match your filters' : 'No users yet'} action={!filtered && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add user</Button>} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <SortTh label="User" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <SortTh label="Role" field="role" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                  <Th className="hidden lg:table-cell">Websites</Th>
                  <Th>Status</Th>
                  <SortTh label="Last login" field="lastLoginAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden md:table-cell" />
                  <SortTh label="Created" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden xl:table-cell" />
                  <Th className="w-16 text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <Tr key={u.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} color={u.avatarColor} />
                          <div className="min-w-0"><p className="font-semibold text-accent">{u.name}{self && <span className="ml-1 text-[11px] font-normal text-muted">(you)</span>}</p><p className="truncate text-[11px] text-muted">{u.email}</p></div>
                        </div>
                      </Td>
                      <Td><RoleBadge role={u.role} /></Td>
                      <Td className="hidden lg:table-cell">
                        {u.role === 'SUPER_ADMIN' ? <span className="text-xs text-muted">All websites</span> : <div className="flex max-w-[260px] flex-wrap gap-1">{u.sites.map((s) => <Badge key={s.id} tone="indigo">{s.name}</Badge>)}{!u.sites.length && <span className="text-xs text-danger">None</span>}</div>}
                      </Td>
                      <Td><UserStatusBadge status={u.status} />{u.lockedUntil && <Badge tone="red" className="ml-1">Locked</Badge>}</Td>
                      <Td className="hidden md:table-cell text-muted">{u.lastLoginAt ? fmtRelative(u.lastLoginAt) : 'Never'}</Td>
                      <Td className="hidden xl:table-cell text-muted">{fmtDate(u.createdAt)}</Td>
                      <Td className="text-right">
                        <Menu>
                          <MenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${u.name}`}><MoreHorizontal className="h-4 w-4" /></Button></MenuTrigger>
                          <MenuContent>
                            <MenuItem icon={<Pencil />} onSelect={() => setEditing(u)}>Edit role & websites</MenuItem>
                            {u.mustChangePassword && <MenuItem icon={<Send />} disabled={u.status === 'INACTIVE'} onSelect={() => resend.mutate(u)}>Resend welcome email</MenuItem>}
                            <MenuItem icon={<Power />} disabled={self} onSelect={() => setToToggle(u)}>{u.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}</MenuItem>
                            <MenuSeparator />
                            <MenuItem icon={<Trash2 />} danger disabled={self} onSelect={() => setToDelete(u)}>Delete</MenuItem>
                          </MenuContent>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && <CardFooter><Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={pageSize} onPage={setPage} label="users" /></CardFooter>}
      </Card>
      <UserModal open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} user={editing === 'new' ? null : editing} onEmailFailed={setEmailFailed} />
      <ConfirmDialog open={!!emailFailed} onOpenChange={(o) => !o && setEmailFailed(null)} tone="primary" title="Welcome email not delivered" description={`${emailFailed?.name} was created, but the welcome email to ${emailFailed?.email} could not be sent. You can try again now.`} confirmLabel="Resend welcome email" loading={resend.isPending} onConfirm={() => emailFailed && resend.mutate(emailFailed)}>
        <p className="flex items-center gap-2 text-xs text-muted"><MailWarning className="h-4 w-4" aria-hidden /> The failure was recorded in the activity logs.</p>
      </ConfirmDialog>
      <ConfirmDialog open={!!toToggle} onOpenChange={(o) => !o && setToToggle(null)} tone={toToggle?.status === 'INACTIVE' ? 'primary' : 'danger'} title={toToggle?.status === 'INACTIVE' ? `Reactivate ${toToggle?.name}?` : `Deactivate ${toToggle?.name}?`} description={toToggle?.status === 'INACTIVE' ? 'They will be able to sign in again.' : 'They are signed out everywhere immediately and cannot sign in until reactivated.'} confirmLabel={toToggle?.status === 'INACTIVE' ? 'Activate' : 'Deactivate'} loading={toggle.isPending} onConfirm={() => toToggle && toggle.mutate(toToggle)} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete ${toDelete?.name}?`} description="Their account is removed permanently. Content they created and their activity history are kept." confirmLabel="Delete user" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete)} />
    </>
  );
}
