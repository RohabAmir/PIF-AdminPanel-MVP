import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: LabelPrimitive.LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn('mb-1.5 block text-xs font-semibold text-ink/80', className)}
      {...props}
    />
  );
}

interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  counter?: { value: number; max: number; ideal?: [number, number] };
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + hint/error, wired with ids and aria attributes. */
export function Field({ label, error, hint, required, className, counter, children }: FieldProps) {
  const id = useId();
  const controlId = children.props.id ?? id;
  const describedBy =
    [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  const counterTone = counter
    ? counter.value > counter.max
      ? 'text-danger-ink'
      : counter.ideal && (counter.value < counter.ideal[0] || counter.value > counter.ideal[1])
        ? 'text-warning-ink'
        : 'text-success-ink'
    : '';
  return (
    <div className={className}>
      {(label || counter) && (
        <div className="flex items-end justify-between gap-2">
          {label && (
            <Label htmlFor={controlId}>
              {label}
              {required && (
                <span className="ml-0.5 text-danger-ink" aria-hidden>
                  *
                </span>
              )}
            </Label>
          )}
          {counter && (
            <span
              className={cn('mb-1.5 text-[11px] font-medium tabular-nums', counterTone)}
              aria-live="polite"
            >
              {counter.value}/{counter.max}
            </span>
          )}
        </div>
      )}
      {isValidElement(children)
        ? cloneElement(children, {
            id: controlId,
            'aria-invalid': !!error || undefined,
            'aria-describedby': describedBy,
          })
        : children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-[11px] font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
