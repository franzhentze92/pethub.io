import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  plainPageAccentBtn,
  plainPageAccentOutlineBtn,
  plainPageAccentUi,
  resolveProviderDashboardAccent,
  type PlainPageAccent,
} from '@/lib/landingTheme';

interface ProviderDashboardThemeContextValue {
  accent: PlainPageAccent;
  ui: ReturnType<typeof plainPageAccentUi>;
  btn: string;
  outlineBtn: string;
  syncTabs: (activeTab: string, activeSubTab?: string) => void;
}

const ProviderDashboardThemeContext = createContext<ProviderDashboardThemeContextValue | null>(null);

export const ProviderDashboardThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem('providerDashboardActiveTab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [activeSubTab, setActiveSubTab] = useState(() => {
    try {
      return localStorage.getItem('providerDashboardActiveSubTab') || '';
    } catch {
      return '';
    }
  });

  const accent = useMemo(
    () => resolveProviderDashboardAccent(activeTab, activeSubTab),
    [activeTab, activeSubTab],
  );

  const syncTabs = useCallback((tab: string, subTab = '') => {
    setActiveTab(tab);
    setActiveSubTab(subTab);
  }, []);

  const value = useMemo(
    (): ProviderDashboardThemeContextValue => ({
      accent,
      ui: plainPageAccentUi(accent),
      btn: plainPageAccentBtn[accent],
      outlineBtn: plainPageAccentOutlineBtn[accent],
      syncTabs,
    }),
    [accent, syncTabs],
  );

  return (
    <ProviderDashboardThemeContext.Provider value={value}>
      {children}
    </ProviderDashboardThemeContext.Provider>
  );
};

export function useProviderDashboardTheme(): ProviderDashboardThemeContextValue {
  const ctx = useContext(ProviderDashboardThemeContext);
  if (!ctx) {
    throw new Error('useProviderDashboardTheme must be used within ProviderDashboardThemeProvider');
  }
  return ctx;
}

/** Header en AppLayout cuando el rol es proveedor (fuera del dashboard montado) */
export function useProviderDashboardThemeOptional(): ProviderDashboardThemeContextValue | null {
  return useContext(ProviderDashboardThemeContext);
}
