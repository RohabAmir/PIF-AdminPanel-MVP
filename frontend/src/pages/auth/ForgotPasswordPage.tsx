import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
});

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: { email: string }) => {
    setError(null);
    try {
      const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });
      setMessage(data.message);
      setSentTo(email);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Check your inbox">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-brand">
            <MailCheck className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-[0.875rem] text-brand" role="status">
            {message}
          </p>
          <p className="mt-2 text-xs text-brand/75">The link expires in 30 minutes and can be used once.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-brand underline underline-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a secure reset link."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/30 bg-white/80 px-3 py-2 text-[0.8125rem] text-danger-ink"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="Write your email"
            className="h-11 w-full rounded-field border border-field bg-white px-3 text-[0.95rem] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger"
            {...register('email')}
          />
        </Field>
        <Button type="submit" variant="brand" size="lg" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
        <p className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[0.85rem] text-brand underline underline-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
