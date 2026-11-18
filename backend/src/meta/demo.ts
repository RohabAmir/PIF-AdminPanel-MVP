/** Seeded demo accounts. In DEMO_MODE they get the OTP hint and are protected from destructive changes. */
export const DEMO_ACCOUNTS = [
  { email: 'superadmin@pifdemo.com', name: 'Sara Al-Mansour', role: 'SUPER_ADMIN' },
  { email: 'admin@pifdemo.com', name: 'Omar Haddad', role: 'ADMIN' },
  { email: 'editor@pifdemo.com', name: 'Lina Farouk', role: 'EDITOR' },
  { email: 'viewer@pifdemo.com', name: 'Yousef Karim', role: 'VIEWER' },
] as const;

export const isDemoAccount = (email: string): boolean =>
  DEMO_ACCOUNTS.some((a) => a.email === email.toLowerCase());
