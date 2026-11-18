import type { ReactNode } from 'react';
import * as D from '@radix-ui/react-dialog';
import * as AD from '@radix-ui/react-alert-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: ModalProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 animate-fade-in bg-sidebar/50 backdrop-blur-[1px]" />
        <D.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 animate-zoom-in flex-col rounded-card bg-white shadow-pop focus:outline-none',
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="text-base font-bold text-accent">{title}</D.Title>
              {description ? (
                <D.Description className="mt-0.5 text-xs text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">
                  {typeof title === 'string' ? title : 'Dialog'}
                </D.Description>
              )}
            </div>
            <D.Close className="rounded-md p-1 text-muted hover:bg-body hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </D.Close>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Right-side drawer (lead details, log details). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: Omit<ModalProps, 'size'>) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 animate-fade-in bg-sidebar/40" />
        <D.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg animate-slide-in-right flex-col bg-white shadow-pop focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-line bg-primary/5 px-5 py-4">
            <div className="min-w-0">
              <D.Title className="truncate text-base font-bold text-accent">{title}</D.Title>
              <D.Description className={cn('mt-0.5 text-xs text-muted', !description && 'sr-only')}>
                {description ?? 'Details'}
              </D.Description>
            </div>
            <D.Close className="rounded-md p-1 text-muted hover:bg-body hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </D.Close>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
  onConfirm,
  children,
  confirmDisabled,
}: ConfirmProps) {
  return (
    <AD.Root open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 animate-fade-in bg-sidebar/50" />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-zoom-in rounded-card bg-white p-6 shadow-pop focus:outline-none">
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                tone === 'danger' ? 'bg-danger/10 text-danger-ink' : 'bg-accent-soft text-accent',
              )}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AD.Title className="text-base font-bold text-accent">{title}</AD.Title>
              <AD.Description className="mt-1 text-[0.8125rem] text-muted">{description}</AD.Description>
              {children && <div className="mt-3">{children}</div>}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <AD.Cancel asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </AD.Cancel>
            <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              loading={loading}
              disabled={confirmDisabled}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  );
}
