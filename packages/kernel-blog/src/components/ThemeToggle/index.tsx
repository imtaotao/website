import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { isBrowser } from 'aidly';
import { IconButton } from 'willa';

export type Theme = 'light' | 'dark';
export type BlogTheme = Theme;

const BLOG_THEME_STORAGE_KEY = 'website:blog-theme';
const BLOG_THEME_PREFERENCE_KEY = 'website:blog-theme-preference';
const BLOG_THEME_CHANGE_EVENT = 'website-theme-change';
const DEFAULT_BLOG_THEME: Theme = 'light';

const isBlogTheme = (value: string | null): value is Theme => {
  return value === 'light' || value === 'dark';
};

const getDefaultBlogTheme = () => {
  return DEFAULT_BLOG_THEME;
};

const hasStoredBlogThemePreference = () => {
  if (!isBrowser) return false;
  return window.localStorage.getItem(BLOG_THEME_PREFERENCE_KEY) === 'true';
};

const readStoredBlogTheme = () => {
  if (!isBrowser) return getDefaultBlogTheme();
  if (!hasStoredBlogThemePreference()) return getDefaultBlogTheme();

  const storedTheme = window.localStorage.getItem(BLOG_THEME_STORAGE_KEY);
  return isBlogTheme(storedTheme) ? storedTheme : getDefaultBlogTheme();
};

const writeStoredBlogTheme = (theme: Theme) => {
  window.localStorage.setItem(BLOG_THEME_STORAGE_KEY, theme);
  window.localStorage.setItem(BLOG_THEME_PREFERENCE_KEY, 'true');
  window.dispatchEvent(
    new CustomEvent<Theme>(BLOG_THEME_CHANGE_EVENT, {
      detail: theme,
    }),
  );
  window.dispatchEvent(new Event('storage'));
};

export function useBlogTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredBlogTheme);

  useEffect(() => {
    const syncTheme = () => {
      setTheme(readStoredBlogTheme());
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener(BLOG_THEME_CHANGE_EVENT, syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(BLOG_THEME_CHANGE_EVENT, syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    writeStoredBlogTheme(nextTheme);
  };

  return { theme, toggleTheme };
}

export type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle(props: ThemeToggleProps) {
  const isDark = props.theme === 'dark';
  const Icon = isDark ? SunIcon : MoonIcon;
  const label = isDark ? '切换到白天模式' : '切换到黑夜模式';

  return (
    <IconButton
      type="button"
      variant="ghost"
      size="sm"
      icon={<Icon className="blog-theme-toggle-icon" />}
      textColor="var(--blog-text-soft)"
      backgroundColor="transparent"
      className="blog-theme-toggle"
      onClick={props.onToggle}
      ariaLabel={label}
      title={label}
    />
  );
}
