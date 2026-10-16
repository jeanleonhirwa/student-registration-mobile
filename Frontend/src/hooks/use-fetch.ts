import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { api } from '@/lib/api';

/**
 * GET `path` every time the screen gains focus (so lists stay fresh after edits elsewhere).
 * Set `path` to null to skip fetching.
 */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++latest.current; // ignore out-of-order responses (e.g. fast search typing)
    try {
      const result = await api.get<T>(path);
      if (id !== latest.current) return;
      setData(result);
      setError(null);
    } catch (e: any) {
      if (id !== latest.current) return;
      setError(e?.message ?? 'Something went wrong');
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { data, error, loading, reload: load, setData };
}
