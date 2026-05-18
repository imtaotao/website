import { useEffect, useState } from 'react';
import { isBrowser } from 'aidly';

export type WebsiteTheme = 'light' | 'dark';

export const WEBSITE_THEME_STORAGE_KEY = 'website:blog-theme';
const WEBSITE_THEME_PREFERENCE_KEY = 'website:blog-theme-preference';
const DEFAULT_WEBSITE_THEME: WebsiteTheme = 'light';

const WEBSITE_THEME_CHANGE_EVENT = 'website-theme-change';

const applyWebsiteThemeAttribute = (theme: WebsiteTheme) => {
  if (!isBrowser) return;
  document.documentElement.dataset.wkTheme = theme;
};

export function isWebsiteTheme(value: string | null): value is WebsiteTheme {
  return value === 'light' || value === 'dark';
}

function getDefaultWebsiteTheme() {
  return DEFAULT_WEBSITE_THEME;
}

function hasStoredWebsiteThemePreference() {
  if (!isBrowser) return false;
  return window.localStorage.getItem(WEBSITE_THEME_PREFERENCE_KEY) === 'true';
}

export function readStoredWebsiteTheme() {
  if (!isBrowser) return getDefaultWebsiteTheme();
  if (!hasStoredWebsiteThemePreference()) return getDefaultWebsiteTheme();

  const storedTheme = window.localStorage.getItem(WEBSITE_THEME_STORAGE_KEY);
  return isWebsiteTheme(storedTheme) ? storedTheme : getDefaultWebsiteTheme();
}

export function writeStoredWebsiteTheme(theme: WebsiteTheme) {
  if (!isBrowser) return;

  applyWebsiteThemeAttribute(theme);
  window.localStorage.setItem(WEBSITE_THEME_STORAGE_KEY, theme);
  window.localStorage.setItem(WEBSITE_THEME_PREFERENCE_KEY, 'true');
  window.dispatchEvent(
    new CustomEvent<WebsiteTheme>(WEBSITE_THEME_CHANGE_EVENT, {
      detail: theme,
    }),
  );
}

export function useWebsiteTheme() {
  const [theme, setThemeState] = useState<WebsiteTheme>(() => {
    const initialTheme = readStoredWebsiteTheme();
    applyWebsiteThemeAttribute(initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    const syncTheme = () => {
      const nextTheme = readStoredWebsiteTheme();
      applyWebsiteThemeAttribute(nextTheme);
      setThemeState(nextTheme);
    };

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener(WEBSITE_THEME_CHANGE_EVENT, syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(WEBSITE_THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);

  const setTheme = (nextTheme: WebsiteTheme) => {
    applyWebsiteThemeAttribute(nextTheme);
    setThemeState(nextTheme);
    writeStoredWebsiteTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
}
