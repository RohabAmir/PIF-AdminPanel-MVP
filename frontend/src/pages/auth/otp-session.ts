/** Pending sign-in between /auth/login and /auth/verify-otp. Holds no access token. */
export interface OtpSession {
  otpSessionToken: string;
  email: string;
  expiresAt: number;
  resendAvailableAt: number;
  resendsRemaining: number;
  demoOtp?: string;
  returnTo?: string;
}
const KEY = 'pif.otpSession';
let memory: OtpSession | null = null;

export const otpSession = {
  get(): OtpSession | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as OtpSession) : memory;
    } catch {
      return memory;
    }
  },
  set(s: OtpSession) {
    memory = s;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  },
  clear() {
    memory = null;
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
