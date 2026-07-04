import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  plainPageAccentBtn,
  plainPageAccentOutlineBtn,
  plainPageAccentUi,
  resolveShelterDashboardAccent,
  type PlainPageAccent,
} from '@/lib/landingTheme';

interface ShelterDashboardThemeContextValue {
  accent: PlainPageAccent;
  ui: ReturnType<typeof plainPageAccentUi>;
  btn: string;
  outlineBtn: string;
  syncTabs: (activeTab: string) => void;
}

const ShelterDashboardThemeContext = createContext<ShelterDashboardThemeContextValue | null>(null);

export const ShelterDashboardThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('shelterDashboardActiveTab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const accent = useMemo(() => resolveShelterDashboardAccent(activeTab), [activeTab]);

  const syncTabs = useCallback((tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('shelterDashboardActiveTab', tab);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    (): ShelterDashboardThemeContextValue => ({
      accent,
      ui: plainPageAccentUi(accent),
      btn: plainPageAccentBtn[accent],
      outlineBtn: plainPageAccentOutlineBtn[accent],
      syncTabs,
    }),
    [accent, syncTabs],
  );

  return (
    <ShelterDashboardThemeContext.Provider value={value}>
      {children}
    </ShelterDashboardThemeContext.Provider>
  );
};

export function useShelterDashboardTheme(): ShelterDashboardThemeContextValue {
  const ctx = useContext(ShelterDashboardThemeContext);
  if (!ctx) {
    throw new Error('useShelterDashboardTheme must be used within ShelterDashboardThemeProvider');
  }
  return ctx;
}

/** Header en AppLayout cuando el rol es albergue */
export function useShelterDashboardThemeOptional(): ShelterDashboardThemeContextValue | null {
  return useContext(ShelterDashboardThemeContext);
}
