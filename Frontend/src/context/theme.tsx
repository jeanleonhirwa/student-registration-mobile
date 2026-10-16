import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme as useSystemScheme } from 'react-native';

import { storage } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
};

const STORAGE_KEY = 'theme-preference';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.get(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
    });
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  // Let native chrome (status bar, alerts, keyboards) follow the in-app choice too.
  useEffect(() => {
    try {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    } catch {}
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    storage.set(STORAGE_KEY, p);
  }, []);

  const value = useMemo(() => ({ preference, scheme, setPreference }), [preference, scheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  return ctx;
}
