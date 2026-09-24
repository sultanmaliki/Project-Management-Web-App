import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  /** HTTP status of the failed request, if there was a response. */
  errorStatus: number | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: (current: T | null) => T | null) => void;
}

/**
 * Run an async loader on mount and whenever `deps` change. Stale responses are ignored, so quickly
 * changing a filter can never show results for an older query.
 */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false; // set when deps change or the component unmounts, so stale results are dropped
    setLoading(true);
    loaderRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setDataState(result);
        setError(null);
        setErrorStatus(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err, "Could not load data."));
        setErrorStatus(axios.isAxiosError(err) ? (err.response?.status ?? null) : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: (current: T | null) => T | null) => setDataState(updater), []);

  return { data, error, errorStatus, loading, reload, setData };
}
