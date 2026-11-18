import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { api, errorDetails, errorMessage, type SessionResponse } from '@/lib/api';
import { newPasswordSchema } from '@/lib/password';
import { useAuth } from '@/auth/AuthProvider';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { FullPageLoader } from '@/components/layout/FullPageLoader';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordChecklist, PasswordInput } from '@/components/PasswordInput';

type Values = { password: string; confirm: string };

/**
 * Two modes on one route:
 *  - `?token=…` from the reset email (anonymous)
 *  - forced first-login change (signed in with `mustChangePassword`)
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { status, user, setSession, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  // Set once the forced change succeeds, so the "already signed in" redirect below can't win the race.
  const [completed, setCompleted] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const password = watch('password');

  if (completed) return <Navigate to="/dashboard" replace />;
  if (status === 'loading') return <FullPageLoader />;
  const forced = !token && status === 'authenticated' && !!user?.mustChangePassword;
  if (!token && status === 'authenticated' && !forced) return <Navigate to="/profile" replace />;
  if (!token && !forced) return <Navigate to="/forgot-password" replace />;

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      if (forced) {
        const { data } = await api.post<SessionResponse>('/auth/change-password', {
          newPassword: v.password,
        });
        setCompleted(true);
        setSession(data);
        toast.success('Your password is set. Welcome to PIF Admin Panel!');
      } else {
        await api.post('/auth/reset-password', { token, password: v.password });
        toast.success('Your password has been reset. Sign in with your new password.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (errorDetails<{ code?: string }>(err)?.code === 'RESET_TOKEN_INVALID') setInvalidLink(true);
      setError(errorMessage(err));
    }
  };

  if (invalidLink) {
    return (
      <AuthLayout title="Link expired" subtitle="This reset link is invalid, already used or expired.">
        <Button asChild variant="brand" size="lg" className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={forced ? 'Set your new password' : 'Choose a new password'}
      subtitle={
        forced
          ? 'For your security, replace the temporary password from your welcome email before continuing.'
          : 'Pick a strong password you have not used here before.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {forced && (
          <div className="flex items-center gap-2 rounded-md bg-white/70 px-3 py-2 text-xs text-brand">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> Signed in as <b>{user?.email}</b>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/30 bg-white/80 px-3 py-2 text-[0.8125rem] text-danger-ink"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}
        <div>
          <Field label="New password" error={errors.password?.message}>
            <PasswordInput
              large
              autoComplete="new-password"
              placeholder="New password"
              {...register('password')}
            />
          </Field>
          <PasswordChecklist value={password} tone="brand" />
        </div>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput
            large
            autoComplete="new-password"
            placeholder="Repeat the new password"
            {...register('confirm')}
          />
        </Field>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={isSubmitting}>
          {forced ? 'Save password & continue' : 'Reset password'}
        </Button>
        {forced ? (
          <p className="text-center">
            <button
              type="button"
              onClick={() => void logout()}
              className="text-[0.85rem] text-brand underline underline-offset-2"
            >
              Sign out instead
            </button>
          </p>
        ) : (
          <p className="text-center">
            <Link to="/login" className="text-[0.85rem] text-brand underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
