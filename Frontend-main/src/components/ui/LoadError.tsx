import React from 'react';

/**
 * A load that failed, stated as a failure.
 *
 * <p>The admin pages resolve their data with `Promise.all([... .catch(() => [])])`,
 * which was doing something specific and wrong: a rejected request and a service
 * that genuinely holds no rows produced byte-identical state, so the tables
 * rendered their "no records found" empty state after an outage. An operator
 * looking at that screen was told the system was empty rather than broken, and
 * an automated check had nothing to assert on because the markup for "failed"
 * did not exist.
 *
 * <p>This component is that missing state. It is deliberately assertive and
 * carries a stable `data-testid`, so both a person and a test can tell the two
 * conditions apart.
 */

interface LoadErrorProps {
  /** What was being loaded, e.g. "users" or "orders". */
  resource: string;
  /** The underlying failure, when there is one worth showing. */
  error?: unknown;
  /**
   * What the failure means for the page, in the caller's own terms.
   *
   * <p>Needed because the consequence differs by site: a failed table load may
   * leave stale rows on screen, while a failed dropdown load means the control
   * is simply empty and unusable. The default sentence used to claim "the
   * figures below may be incomplete" everywhere, which is not merely vague on a
   * form — it describes rows that do not exist.
   */
  impact?: string;
  onRetry?: () => void;
}

/**
 * Describes a failure in whatever shape the caller received it.
 *
 * <p>Two shapes occur in this codebase and the Axios-style one used to be the
 * only one handled, which meant the flat case fell through to "Unknown error"
 * for every real failure. `src/lib/api.ts` does not use Axios: it throws a plain
 * `Error` with `message` set to the server's message and `status` attached as a
 * property. So the `response.status` / `response.data.message` lookup never
 * matched anything, and a 503 from a service was reported to the user as
 * "Unknown error" — which is the one description guaranteed to be useless.
 */
export function describeLoadError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;

  const anyError = error as {
    // Axios-shaped, still supported for anything that has not been migrated.
    response?: { status?: number; data?: { message?: string; error?: string } };
    // The shape api.ts actually throws.
    status?: number;
    message?: string;
  };

  const serverMessage =
    anyError?.response?.data?.message ??
    anyError?.response?.data?.error ??
    anyError?.message;
  if (serverMessage) return String(serverMessage);

  const status = anyError?.status ?? anyError?.response?.status;
  if (status) return `Request failed with status ${status}`;

  return 'Unknown error';
}

export function LoadError({ resource, error, impact, onRetry }: LoadErrorProps) {
  const detail = describeLoadError(error);

  return (
    <div
      role="alert"
      data-testid="load-error"
      className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 rounded p-4"
    >
      <svg
        className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-300">
          Could not load {resource}
        </p>
        <p className="text-xs text-red-400/70 mt-0.5">
          {detail ? `${detail}. ` : ''}
          {impact ?? 'This section could not be loaded.'}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-testid="load-error-retry"
          className="shrink-0 text-xs font-semibold text-red-300 border border-red-900/60 rounded px-3 h-7 hover:bg-red-900/30 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
