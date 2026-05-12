import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

export type BlogTheme = 'light' | 'dark';

const BLOG_THEME_STORAGE_KEY = 'website:blog-theme';
const BLOG_THEME_PREFERENCE_KEY = 'website:blog-theme-preference';
const BLOG_THEME_CHANGE_EVENT = 'website-theme-change';
const DEFAULT_BLOG_THEME: BlogTheme = 'light';

const isBlogTheme = (value: string | null): value is BlogTheme => {
  return value === 'light' || value === 'dark';
};

const getDefaultBlogTheme = () => {
  return DEFAULT_BLOG_THEME;
};

const hasStoredBlogThemePreference = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(BLOG_THEME_PREFERENCE_KEY) === 'true';
};

const readStoredBlogTheme = () => {
  if (typeof window === 'undefined') return getDefaultBlogTheme();
  if (!hasStoredBlogThemePreference()) return getDefaultBlogTheme();

  const storedTheme = window.localStorage.getItem(BLOG_THEME_STORAGE_KEY);
  return isBlogTheme(storedTheme) ? storedTheme : getDefaultBlogTheme();
};

const writeStoredBlogTheme = (theme: BlogTheme) => {
  window.localStorage.setItem(BLOG_THEME_STORAGE_KEY, theme);
  window.localStorage.setItem(BLOG_THEME_PREFERENCE_KEY, 'true');
  window.dispatchEvent(
    new CustomEvent<BlogTheme>(BLOG_THEME_CHANGE_EVENT, {
      detail: theme,
    }),
  );
  window.dispatchEvent(new Event('storage'));
};

export function useBlogTheme() {
  const [theme, setTheme] = useState<BlogTheme>(readStoredBlogTheme);

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

type BlogThemeToggleProps = {
  theme: BlogTheme;
  onToggle: () => void;
};

export function BlogThemeToggle(props: BlogThemeToggleProps) {
  const isDark = props.theme === 'dark';
  const Icon = isDark ? SunIcon : MoonIcon;
  const label = isDark ? '切换到白天模式' : '切换到黑夜模式';

  return (
    <button
      type="button"
      className="blog-theme-toggle blog-article-action"
      onClick={props.onToggle}
      aria-label={label}
      title={label}
    >
      <Icon className="blog-theme-toggle-icon" />
    </button>
  );
}
