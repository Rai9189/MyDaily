// src/app/components/RouteErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Smaller, in-page fallback for boundaries nested inside the app shell (keeps nav usable). */
  compact?: boolean;
}

interface State {
  hasError: boolean;
}

const RELOAD_FLAG = 'mydaily-chunk-reload';

// Lazy-loaded chunks fail to fetch on flaky mobile connections, or go stale
// after a redeploy while a tab is still open — both throw here, not in a
// promise .catch(), because React surfaces Suspense/lazy failures as render errors.
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // "Importing a module script failed" is Safari/iOS's wording for the same failure.
  return /dynamically imported module|importing a module script failed|failed to fetch|chunkloaderror|loading chunk/i.test(message);
}

// A reload within this window that fails again means the chunk is really
// unavailable — show the fallback instead of reload-looping. Outside it (e.g. a
// later redeploy in the same tab session) auto-reload is allowed again.
const RELOAD_WINDOW_MS = 10_000;

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[RouteErrorBoundary]', error);
    // Auto-recover: reload to fetch the current build instead of leaving the
    // user stranded on an error screen.
    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG)) || 0;
    if (isChunkLoadError(error) && Date.now() - lastReload > RELOAD_WINDOW_MS) {
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-center ${this.props.compact ? 'py-16 px-4' : 'min-h-screen px-4 bg-background'}`}>
        <AlertTriangle size={32} className="text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1">Please try reloading the page.</p>
        </div>
        <button
          type="button"
          onClick={() => { sessionStorage.removeItem(RELOAD_FLAG); window.location.reload(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors active:scale-95"
        >
          <RefreshCw size={14} /> Reload
        </button>
      </div>
    );
  }
}
