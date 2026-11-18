import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

/** Original card header: violet-tinted band, indigo title with a gradient accent bar. */
export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-t-card-header border border-accent-border bg-primary/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-accent">
          <span className="h-4 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-primary/60 to-secondary/70" aria-hidden />
          <span className="truncate">{title}</span>
        </h2>
        {description && <p className="mt-0.5 pl-[11px] text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-line px-4 py-3 sm:px-5', className)} {...props} />;
}
