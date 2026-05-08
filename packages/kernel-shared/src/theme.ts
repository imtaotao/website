import { useEffect, useState } from 'react';

export type WebsiteTheme = 'light' | 'dark';

export const WEBSITE_THEME_STORAGE_KEY = 'website:blog-theme';

const WEBSITE_THEME_CHANGE_EVENT = 'website-theme-change';

export const isWebsiteTheme = (value: string | null): value is WebsiteTheme => {
  return value === 'light' || value === 'dark';
};

export const readStoredWebsiteTheme = (): WebsiteTheme => {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem(WEBSITE_THEME_STORAGE_KEY);
  return isWebsiteTheme(storedTheme) ? storedTheme : 'light';
};

export const writeStoredWebsiteTheme = (theme: WebsiteTheme) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(WEBSITE_THEME_STORAGE_KEY, theme);
  window.dispatchEvent(
    new CustomEvent<WebsiteTheme>(WEBSITE_THEME_CHANGE_EVENT, {
      detail: theme,
    }),
  );
};

export const useWebsiteTheme = () => {
  const [theme, setThemeState] = useState<WebsiteTheme>(readStoredWebsiteTheme);

  useEffect(() => {
    const syncTheme = () => {
      setThemeState(readStoredWebsiteTheme());
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener(WEBSITE_THEME_CHANGE_EVENT, syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(WEBSITE_THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);

  const setTheme = (nextTheme: WebsiteTheme) => {
    setThemeState(nextTheme);
    writeStoredWebsiteTheme(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};
