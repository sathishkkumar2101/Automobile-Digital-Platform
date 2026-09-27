import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time exceptions so one broken component cannot blank the app.
 *
 * React unmounts the entire tree when a render throws and no boundary catches
 * it, which is what turned a single bad field read in the chat thread header
 * into a blank page for every route. The boundary keeps the shell alive and
 * names the failure, so a defect in one screen is a visible message on that
 * screen instead of an application-wide outage.
 *
 * `reset` clears the error and re-renders the children, which is enough to
 * recover from state-driven faults. A code fault will throw again on the next
 * attempt, and that is the intended signal rather than a silent blank page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surfaced in the browser console; the panel below is the user-facing half.
    console.error('Unhandled render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-red-900/60 bg-zinc-900/60 p-6">
          <h1 className="font-display text-lg font-semibold text-white">
            This screen could not be displayed
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            The rest of the app is still running. Reloading the view usually clears
            this; if it keeps happening the details below identify the fault.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[11px] font-mono text-red-300 whitespace-pre-wrap">
            {error.name}: {error.message}
          </pre>
          <div className="mt-5 flex gap-3">
            <button
              onClick={this.reset}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
