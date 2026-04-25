import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export type Colors = {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
  abstain: string;
  overlay: string;
};

export const darkColors: Colors = {
  bg:        '#0B1220',
  surface:   '#111827',
  card:      '#1A2233',
  border:    'rgba(255,255,255,0.08)',
  text:      '#E9EDF2',
  textMuted: '#6B7280',
  primary:   '#5282FF',
  success:   '#10B981',
  danger:    '#EF4444',
  warning:   '#F59E0B',
  abstain:   '#9CA3AF',
  overlay:   'rgba(255,255,255,0.08)',
};

export const lightColors: Colors = {
  bg:        '#E8EEF7',
  surface:   '#F4F7FB',
  card:      '#FFFFFF',
  border:    'rgba(0,0,0,0.13)',
  text:      '#111827',
  textMuted: '#5A6680',
  primary:   '#3B6EFF',
  success:   '#059669',
  danger:    '#DC2626',
  warning:   '#C97A00',
  abstain:   '#8896A8',
  overlay:   'rgba(0,0,0,0.06)',
};

type ThemeCtx = {
  colors: Colors;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  colors: darkColors,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('theme_preference').then(val => {
      if (val === 'light') setIsDark(false);
    });
  }, []);

  async function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    await SecureStore.setItemAsync('theme_preference', next ? 'dark' : 'light');
  }

  return (
    <ThemeContext.Provider value={{ colors: isDark ? darkColors : lightColors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
