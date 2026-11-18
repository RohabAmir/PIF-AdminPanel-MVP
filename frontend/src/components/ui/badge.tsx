import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badge = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', {
  variants: {
    tone: {
      gray: 'bg-body text-muted',
      indigo: 'bg-accent-soft text-accent',
      violet: 'bg-primary/10 text-primary',
      green: 'bg-success/10 text-success',
      amber: 'bg-warning/15 text-[#B7791F]',
      red: 'bg-danger/10 text-danger',
      blue: 'bg-info/10 text-[#2B8BC6]',
      brown: 'bg-brand-soft text-copper',
    },
  },
  defaultVariants: { tone: 'gray' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>;

export function Badge({ className, tone, dot, children, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge> & { dot?: boolean }) {
  return (
    <span className={cn(badge({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
