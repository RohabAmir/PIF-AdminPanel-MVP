import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Compass, ServerCrash } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

function ErrorScreen({ code, title, message, icon, action }: { code: string; title: string; message: string; icon: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
        <p className="bg-hero bg-clip-text text-6xl font-bold text-transparent">{code}</p>
        <h1 className="mt-2 text-xl font-bold">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[0.8125rem] text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          {action ?? (
            <Link to="/dashboard" className={buttonVariants({ variant: 'primary' })}>
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export const ForbiddenPage = () => (
  <ErrorScreen code="403" title="Access denied" icon={<ShieldAlert />} message="Your role doesn't include access to this area. If you think this is a mistake, contact a Super Admin." />
);

export const NotFoundPage = () => (
  <div className="min-h-screen bg-body">
    <ErrorScreen code="404" title="Page not found" icon={<Compass />} message="The page you are looking for doesn't exist or has been moved." />
  </div>
);

export const NotFoundInline = () => (
  <ErrorScreen code="404" title="Page not found" icon={<Compass />} message="The page you are looking for doesn't exist or has been moved." />
);

interface State {
  error: Error | null;
}
/** Last-resort boundary so a rendering bug never shows a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-body">
        <ErrorScreen
          code="Oops"
          title="Something went wrong"
          icon={<ServerCrash />}
          message="An unexpected error occurred while showing this page. Reloading usually fixes it."
          action={
            <button type="button" className={buttonVariants({ variant: 'primary' })} onClick={() => window.location.reload()}>
              Reload page
            </button>
          }
        />
      </div>
    );
  }
}
