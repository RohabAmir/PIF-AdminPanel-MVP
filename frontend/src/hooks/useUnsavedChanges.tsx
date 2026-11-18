import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ui/dialog';

/** Warns before leaving a form with unsaved changes (in-app navigation and tab close). */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(o) => !o && blocker.state === 'blocked' && blocker.reset()}
      title="Discard unsaved changes?"
      description="You have changes that haven't been saved. If you leave now they will be lost."
      confirmLabel="Leave without saving"
      onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
    />
  );
  return dialog;
}
