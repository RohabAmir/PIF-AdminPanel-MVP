import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import bg from '@/assets/brand/auth-bg.jpg';
import logo from '@/assets/brand/logo.svg';

/** Original auth treatment: full-bleed warm photo, large logo, translucent card, brown accents. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-10" style={{ backgroundImage: `url(${bg})` }}>
      <div className="w-full max-w-[420px]">
        <Link to="/login" className="mx-auto mb-8 block w-fit" aria-label="PIF Admin Panel — sign in">
          <img src={logo} alt="PIF Admin Panel" className="h-24 w-auto sm:h-[120px]" />
        </Link>
        <section className="rounded-lg border border-white/20 bg-[#fff8f8]/[.28] p-6 shadow-pop backdrop-blur-md sm:p-10" aria-labelledby="auth-title">
          <h1 id="auth-title" className="text-center text-lg font-bold text-brand">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-center text-[0.8125rem] text-brand/80">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </section>
        {footer}
        <p className="mt-6 text-center text-[11px] text-white/70">PIF Admin Panel · Demo project — all data is fictional</p>
      </div>
    </main>
  );
}
