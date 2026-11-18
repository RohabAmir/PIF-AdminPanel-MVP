import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, KeyRound, MailCheck } from 'lucide-react';
import { api, errorDetails, errorMessage, type SessionResponse } from '@/lib/api';
import { safeReturnTo } from '@/lib/utils';
import { useAuth } from '@/auth/AuthProvider';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { otpSession, type OtpSession } from './otp-session';

const LENGTH = 6;
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [session, setSessionState] = useState<OtpSession | null>(() => otpSession.get());
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => inputs.current[0]?.focus(), []);

  const restart = useCallback(
    (message: string) => {
      otpSession.clear();
      toast.error(message);
      navigate('/login', { replace: true });
    },
    [navigate],
  );

  const submit = useCallback(
    async (code: string) => {
      if (!session || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const { data } = await api.post<SessionResponse>('/auth/verify-otp', { otpSessionToken: session.otpSessionToken, code });
        otpSession.clear();
        setSession(data);
        if (data.user.mustChangePassword) {
          toast.info('Welcome! Please choose your own password to continue.');
          navigate('/reset-password', { replace: true });
        } else {
          toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
          navigate(safeReturnTo(session.returnTo), { replace: true });
        }
      } catch (err) {
        const code = errorDetails<{ code?: string }>(err)?.code;
        if (code === 'OTP_LOCKED' || code === 'OTP_SESSION_EXPIRED') return restart(errorMessage(err));
        setError(errorMessage(err));
        setDigits(Array(LENGTH).fill(''));
        inputs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, restart, session, setSession, submitting],
  );

  if (!session) return <Navigate to="/login" replace />;

  const setAt = (i: number, v: string) => {
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && v) void submit(next.join(''));
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length: LENGTH }, (_, i) => text[i] ?? '');
    setDigits(next);
    inputs.current[Math.min(text.length, LENGTH - 1)]?.focus();
    if (text.length === LENGTH) void submit(text);
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const { data } = await api.post<{ resendCooldownSeconds: number; resendsRemaining: number; expiresInSeconds: number; demoOtp?: string }>('/auth/resend-otp', {
        otpSessionToken: session.otpSessionToken,
      });
      const t = Date.now();
      const updated = { ...session, resendAvailableAt: t + data.resendCooldownSeconds * 1000, resendsRemaining: data.resendsRemaining, expiresAt: t + data.expiresInSeconds * 1000, demoOtp: data.demoOtp };
      otpSession.set(updated);
      setSessionState(updated);
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
      toast.success('A new code is on its way.');
    } catch (err) {
      const code = errorDetails<{ code?: string }>(err)?.code;
      if (code === 'OTP_RESEND_LIMIT' || code === 'OTP_SESSION_EXPIRED') return restart(errorMessage(err));
      setError(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const expiresIn = session.expiresAt - now;
  const cooldown = session.resendAvailableAt - now;

  return (
    <AuthLayout
      title="Two-step verification"
      subtitle={
        <>
          We emailed a 6-digit code to <b className="text-brand">{session.email}</b>.
        </>
      }
    >
      {session.demoOtp && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/15 px-3 py-2 text-[0.8125rem] text-brand" data-testid="demo-otp">
          <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Demo hint: your code is <b className="font-mono tracking-widest">{session.demoOtp}</b>
          </span>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-danger/30 bg-white/80 px-3 py-2 text-[0.8125rem] text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.every((d) => d)) void submit(digits.join(''));
          else setError('Enter all 6 digits of the code.');
        }}
      >
        <fieldset>
          <legend className="sr-only">Verification code</legend>
          <div className="flex justify-between gap-2" onPaste={(e) => onPaste(e as unknown as ClipboardEvent<HTMLInputElement>)}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value.replace(/\D/g, '').slice(-1))}
                onKeyDown={(e) => onKey(i, e)}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                aria-label={`Digit ${i + 1}`}
                data-testid={`otp-${i}`}
                disabled={submitting}
                className="h-12 w-full min-w-0 rounded-lg border border-field bg-white text-center font-mono text-xl font-semibold text-brand focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:h-14"
              />
            ))}
          </div>
        </fieldset>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand/80" aria-live="polite">
          <MailCheck className="h-3.5 w-3.5" aria-hidden />
          {expiresIn > 0 ? <>Code expires in {fmt(expiresIn)}</> : <>This code has expired — request a new one.</>}
        </p>
        <Button type="submit" variant="brand" size="lg" className="mt-5 w-full" loading={submitting}>
          Verify &amp; continue
        </Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2 text-[0.8125rem] text-brand">
        {session.resendsRemaining > 0 ? (
          <button type="button" onClick={resend} disabled={cooldown > 0 || resending} className="font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60">
            {cooldown > 0 ? `Resend code in ${Math.ceil(cooldown / 1000)}s` : resending ? 'Sending…' : `Resend code (${session.resendsRemaining} left)`}
          </button>
        ) : (
          <span className="text-xs">No resends left for this sign-in.</span>
        )}
        <Link to="/login" onClick={() => otpSession.clear()} className="text-xs text-brand/80 hover:underline">
          Use a different account
        </Link>
      </div>
    </AuthLayout>
  );
}
