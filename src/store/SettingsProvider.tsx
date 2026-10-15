// The player's settings (sound, haptics) in a small context of their own, so changing one doesn't
// re-render the game. Every change is saved to storage right away; services such as haptics read
// the setting from storage, so they never go stale.

import { createContext, ReactNode, useContext, useState } from 'react';

import { getSettings, setSettings, Settings } from '@/services/storage';

type SettingsContextValue = {
  settings: Settings;
  /** Changes some settings and saves them. */
  updateSettings: (changes: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState(getSettings);

  const updateSettings = (changes: Partial<Settings>) => {
    // Merged onto what's saved, not this render's copy, so two quick changes both stick.
    const next = { ...getSettings(), ...changes };
    // Saved before the state update, so a service called right after already sees it.
    setSettings(next);
    setState(next);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
