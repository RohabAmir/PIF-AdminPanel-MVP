import mark from '@/assets/brand/sidebar-logo.svg';

/** Branded full-screen loader shown while the session is restored (no flash of protected UI). */
export function FullPageLoader({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-sidebar" role="status" aria-live="polite">
      <img src={mark} alt="" className="h-16 w-16 animate-pulse" />
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary to-secondary" />
      </div>
      <p className="mt-4 font-menu text-xs tracking-wide text-sidebar-text">{label}</p>
      <style>{'@keyframes loader{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
    </div>
  );
}
