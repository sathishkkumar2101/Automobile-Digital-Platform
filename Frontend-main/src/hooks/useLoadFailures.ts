import { useCallback, useState } from 'react';

/**
 * Tracks which parts of a screen failed to load.
 *
 * <p>The pages here used to write `api.get(...).catch(() => [])`, which made a
 * rejected request and a genuinely empty result the same state. Every table
 * then rendered its "no records found" copy, so an outage was displayed as an
 * empty system and an automated check had nothing to distinguish them by.
 *
 * <p>Usage: wrap each request with {@link guard}, render
 * {@link failures} as {@link LoadError} banners, and put `reloadToken` in the
 * load effect's dependency array so a retry re-runs it.
 *
 * <p>A failed request still resolves, to an empty list, so one dead service does
 * not blank out the sections that did load. The point is that the failure is
 * reported rather than absorbed.
 */

export interface LoadFailure {
  resource: string;
  error: unknown;
}

export function useLoadFailures() {
  const [failures, setFailures] = useState<LoadFailure[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const clear = useCallback(() => setFailures([]), []);

  /**
   * Whether a named resource has already failed to load.
   *
   * <p>This exists because a guarded request resolves to an empty collection so
   * one dead service cannot blank out the sections that did load. That same
   * behaviour means a table will happily render its "no records found" copy for a
   * request that never arrived, so the page ends up stating both that the load
   * failed and that there is nothing here. Gating the empty copy on this
   * predicate keeps those two claims from contradicting each other.
   */
  const has = useCallback(
    (resource: string) => failures.some((failure) => failure.resource === resource),
    [failures],
  );

  const retry = useCallback(() => {
    setFailures([]);
    setReloadToken((token) => token + 1);
  }, []);

  /**
   * Wraps a promise so a rejection is recorded against `resource` and the
   * caller still receives an empty collection to render.
   */
  const guard = useCallback(
    <T,>(resource: string) => (promise: Promise<T>): Promise<T> =>
      promise.catch((error: unknown) => {
        setFailures((previous) => [...previous, { resource, error }]);
        return [] as unknown as T;
      }),
    [],
  );

  return { failures, clear, retry, guard, has, reloadToken };
}
