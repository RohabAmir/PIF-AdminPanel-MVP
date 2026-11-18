import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, KeyRound, LogOut, Save } from 'lucide-react';
import { api, errorMessage, fieldErrors, type SessionResponse } from '@/lib/api';
import { strongPassword } from '@/lib/password';
import type { User } from '@/lib/types';
import { cn, fmtDateTime } from '@/lib/utils';
import { ROLE_LABEL } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/ui/status';
import { ConfirmDialog } from '@/components/ui/dialog';
import { PasswordChecklist, PasswordInput } from '@/components/PasswordInput';

const COLORS = ['#4A4A89', '#7549AD', '#845ADF', '#23B7E5', '#26BF94', '#F5B849', '#E6533C', '#824703', '#552A0E', '#1E1E2D'];
const pwSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password.'), password: strongPassword, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });
type PwValues = z.infer<typeof pwSchema>;

export default function ProfilePage() {
  const { user, setUser, setSession, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? COLORS[0]!);
  const [everywhere, setEverywhere] = useState(false);
  useEffect(() => { if (user) { setName(user.name); setColor(user.avatarColor); } }, [user]);
  const pw = useForm<PwValues>({ resolver: zodResolver(pwSchema), defaultValues: { currentPassword: '', password: '', confirm: '' } });
  const newPw = pw.watch('password');

  const saveProfile = useMutation({
    mutationFn: async () => (await api.patch<User>('/profile', { name: name.trim(), avatarColor: color })).data,
    onSuccess: (u) => { if (user) setUser({ ...user, name: u.name, avatarColor: u.avatarColor }); toast.success('Profile updated.'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const changePw = useMutation({
    mutationFn: async (v: PwValues) => (await api.post<SessionResponse>('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.password })).data,
    onSuccess: (s) => { setSession(s); pw.reset(); toast.success('Password changed. Other sessions were signed out.'); },
    onError: (e) => {
      const fe = fieldErrors(e);
      if (fe.length) fe.forEach((f) => pw.setError(f.field === 'newPassword' ? 'password' : (f.field as keyof PwValues), { message: f.message }));
      else pw.setError('root', { message: errorMessage(e) });
    },
  });
  if (!user) return null;
  const profileDirty = name.trim() !== user.name || color !== user.avatarColor;

  return (
    <>
      <PageHeader title="My Profile" description="Your account details, appearance and security" crumbs={[{ label: 'Profile' }]} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="h-fit">
          <CardBody className="flex flex-col items-center text-center">
            <Avatar name={name || user.name} color={color} size="lg" />
            <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
            <p className="text-xs text-muted">{user.email}</p>
            <div className="mt-2"><RoleBadge role={user.role} /></div>
            <dl className="mt-5 w-full space-y-2 border-t border-line pt-4 text-left text-xs">
              <div className="flex justify-between"><dt className="text-muted">Role</dt><dd className="font-medium">{ROLE_LABEL[user.role]}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Last sign-in</dt><dd>{fmtDateTime(user.lastLoginAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Member since</dt><dd>{fmtDateTime(user.createdAt)}</dd></div>
              <div><dt className="mb-1.5 text-muted">Websites</dt><dd className="flex flex-wrap gap-1">{user.role === 'SUPER_ADMIN' ? <Badge tone="indigo">All websites</Badge> : user.sites.length ? user.sites.map((s) => <Badge key={s.id} tone="indigo">{s.name}</Badge>) : <span className="text-muted">None assigned</span>}</dd></div>
            </dl>
          </CardBody>
        </Card>
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Profile" actions={<Button size="sm" loading={saveProfile.isPending} disabled={!profileDirty || name.trim().length < 2} onClick={() => saveProfile.mutate()}><Save className="h-4 w-4" /> Save</Button>} />
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full name" error={name.trim().length < 2 ? 'Name must be at least 2 characters.' : undefined}><Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Email" hint="Contact a Super Admin to change your email."><Input value={user.email} disabled /></Field>
              <fieldset className="md:col-span-2">
                <legend className="mb-1.5 text-xs font-semibold text-ink/80">Avatar colour</legend>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} className={cn('flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition', color === c && 'ring-2 ring-primary')} style={{ backgroundColor: c }}>
                      {color === c && <Check className="h-4 w-4 text-white" aria-hidden />}
                    </button>
                  ))}
                </div>
              </fieldset>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Change password" description="You stay signed in here; every other session is signed out." />
            <CardBody>
              <form className="grid max-w-xl grid-cols-1 gap-4" noValidate onSubmit={pw.handleSubmit((v) => changePw.mutate(v))}>
                {pw.formState.errors.root && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{pw.formState.errors.root.message}</p>}
                <Field label="Current password" error={pw.formState.errors.currentPassword?.message}><PasswordInput autoComplete="current-password" {...pw.register('currentPassword')} /></Field>
                <div>
                  <Field label="New password" error={pw.formState.errors.password?.message}><PasswordInput autoComplete="new-password" {...pw.register('password')} /></Field>
                  <PasswordChecklist value={newPw} />
                </div>
                <Field label="Confirm new password" error={pw.formState.errors.confirm?.message}><PasswordInput autoComplete="new-password" {...pw.register('confirm')} /></Field>
                <div><Button type="submit" loading={changePw.isPending}><KeyRound className="h-4 w-4" /> Update password</Button></div>
              </form>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sessions" />
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.8125rem] text-muted">Lost a device or signed in on a shared computer? Sign out of every session, including this one.</p>
              <Button variant="danger" onClick={() => setEverywhere(true)}><LogOut className="h-4 w-4" /> Sign out everywhere</Button>
            </CardBody>
          </Card>
        </div>
      </div>
      <ConfirmDialog open={everywhere} onOpenChange={setEverywhere} title="Sign out of all sessions?" description="Every browser and device signed in to your account — including this one — will be signed out." confirmLabel="Sign out everywhere" onConfirm={() => { setEverywhere(false); void logout({ everywhere: true }); }} />
    </>
  );
}
