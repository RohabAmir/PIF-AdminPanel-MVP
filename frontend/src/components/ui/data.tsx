import {
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto rounded-lg border border-accent-border">
      <table className={cn('w-full border-collapse text-left text-[0.8125rem]', className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-accent-border bg-white px-3 py-3 text-[0.85rem] font-semibold text-ink',
        className,
      )}
      {...props}
    />
  );
}
export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-3 py-2.5 align-middle', className)} {...props} />;
}
export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-[#F5F6F7] [&:last-child>td]:border-b-0', className)}
      {...props}
    />
  );
}

/** Sortable column header with aria-sort. */
export function SortTh<K extends string>({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  label: string;
  field: K;
  sortBy: K;
  sortOrder: 'asc' | 'desc';
  onSort: (f: K) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <Th
      className={className}
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 hover:text-accent"
      >
        {label}
        {active ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowDown className="h-3.5 w-3.5 opacity-20" />
        )}
      </button>
    </Th>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  label = 'entries',
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="text-xs text-ink">
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b> {label}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="px-2 text-xs text-muted">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent [&>svg]:h-7 [&>svg]:w-7">
        {icon ?? <Inbox />}
      </div>
      <h3 className="text-[0.95rem] font-semibold text-accent">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger-ink">
        <X className="h-7 w-7" />
      </div>
      <h3 className="text-[0.95rem] font-semibold text-accent">Couldn&apos;t load this data</h3>
      <p className="mt-1 max-w-sm text-xs text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[#E9EBF3]', className)} aria-hidden />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className={cn('h-8', j === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Debounced search box. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search here',
  className,
  label = 'Search',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 350);
    return () => clearTimeout(t);
  }, [local, value, onChange]);
  return (
    <div className={cn('relative w-full sm:w-56', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-field border border-accent-border bg-white pl-8 pr-3 text-xs placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 'md',
}: {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const s = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-16 w-16 text-xl' }[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        s,
      )}
      style={{ backgroundColor: color ?? '#4A4A89' }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
