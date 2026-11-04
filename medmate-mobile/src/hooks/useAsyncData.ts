import { useCallback, useEffect, useRef, useState } from 'react';

import type { ApiResult } from '@/types';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
}

/**
 * Run an async loader and expose its lifecycle.
 *
 * Every screen in the app reads through the service layer, so this is the one
 * place that knows how to turn an `ApiResult` into UI state. Stale responses
 * are discarded when the inputs change, which matters for search-as-you-type.
 */
export function useAsyncData<T>(
  loader: () => Promise<ApiResult<T>>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState(true);
  const [nonce, setNonce] = useState(0);

  // The loader is usually an inline arrow, so it cannot be a dependency.
  // Keeping it in a ref lets the effect depend on `deps` alone.
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;

    // Kick the request off in a microtask so no state is written
    // synchronously while the effect is running.
    void Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setPending(true);
        return loaderRef.current();
      })
      .then((result) => {
        if (cancelled || !result) return;
        if (result.ok) {
          setData(result.data);
          setError(undefined);
        } else {
          setError(result.error.message);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError('Something went wrong. Please try again.');
      })
      .finally(() => {
        if (cancelled) return;
        setPending(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading: pending, error, reload };
}
