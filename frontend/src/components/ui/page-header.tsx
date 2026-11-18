import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronsRight } from 'lucide-react';

/** Gradient page banner from the original: description on the left, breadcrumb on the right. */
export function PageHeader({ title, description, crumbs, actions }: { title: string; description: string; crumbs?: { label: string; to?: string }[]; actions?: ReactNode }) {
  return (
    <div className="mb-5 overflow-hidden rounded-card bg-hero px-5 py-5 text-white shadow-card sm:py-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
          <p className="mt-1 text-[0.8125rem] text-white/85">{description}</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <li>
                <Link to="/dashboard" className="hover:underline">
                  Dashboard
                </Link>
              </li>
              {(crumbs ?? [{ label: title }]).map((c, i, arr) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  <ChevronsRight className="h-3 w-3 opacity-60" aria-hidden />
                  {c.to && i < arr.length - 1 ? (
                    <Link to={c.to} className="hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
