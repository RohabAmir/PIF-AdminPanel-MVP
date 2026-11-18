import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Sparkles } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/permissions';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/PasswordInput';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { otpSession } from './otp-session';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type Values = z.infer<typeof schema>;

interface LoginResponse {
  otpSessionToken: string;
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  resendsRemaining: number;
  demoOtp?: string;
}

const authInput =
  'h-11 w-full rounded-field border border-field bg-white px-3 text-[0.95rem] text-ink placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: config } = usePublicConfig();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (v: Values) => {
    setServerError(null);
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email: v.email.trim().toLowerCase(), password: v.password });
      const now = Date.now();
      otpSession.set({
        otpSessionToken: data.otpSessionToken,
        email: data.email,
        expiresAt: now + data.expiresInSeconds * 1000,
        resendAvailableAt: now + data.resendCooldownSeconds * 1000,
        resendsRemaining: data.resendsRemaining,
        demoOtp: data.demoOtp,
        returnTo: params.get('returnTo') ?? undefined,
      });
      navigate('/verify-otp');
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <AuthLayout
      title="Sign In to Dashboard"
      footer={
        config?.demoMode && config.demoAccounts.length > 0 ? (
          <section className="mt-4 rounded-lg border border-white/25 bg-sidebar/70 p-4 text-white backdrop-blur" aria-labelledby="demo-title">
            <h2 id="demo-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              <Sparkles className="h-3.5 w-3.5 text-amber" aria-hidden /> Demo accounts
            </h2>
            <p className="mt-1 text-[11px] text-sidebar-text">One click fills the form. Password for all: {config.demoAccounts[0]?.password}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {config.demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setValue('email', a.email, { shouldValidate: true });
                    setValue('password', a.password, { shouldValidate: true });
                  }}
                  className="rounded-md border border-white/15 bg-white/5 px-2.5 py-2 text-left hover:bg-white/15"
                >
                  <span className="block text-xs font-semibold">{ROLE_LABEL[a.role]}</span>
                  <span className="block truncate text-[10px] text-sidebar-text">{a.email}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-white/80 px-3 py-2 text-[0.8125rem] text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="username" placeholder="Write your email" className={authInput} {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput large autoComplete="current-password" placeholder="Write your password" {...register('password')} />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-[0.85rem] text-brand underline underline-offset-2 hover:text-brand/80">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={isSubmitting}>
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
