import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

const STORAGE_KEY = 'clinic_theme';
const ThemeContext = createContext(null);

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// `theme` is the user's choice (light / dark / system); `resolved` is what is
// actually shown. The choice is remembered in this browser.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#0e1a1f' : '#f4f8f9');
  }, [resolved]);

  const setTheme = useCallback((next) => {
    // Where the browser can, the old and new colours cross-fade.
    // The browser skips the fade when the tab is hidden; the theme still changes.
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(() => setThemeState(next))).ready.catch(() => {});
    } else setThemeState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice then lasts for this visit only.
    }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
