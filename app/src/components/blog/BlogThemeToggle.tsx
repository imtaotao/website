import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

export type BlogTheme = 'light' | 'dark';

const BLOG_THEME_STORAGE_KEY = 'website:blog-theme';

const isBlogTheme = (value: string | null): value is BlogTheme => {
  return value === 'light' || value === 'dark';
};

const readStoredBlogTheme = (): BlogTheme => {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem(BLOG_THEME_STORAGE_KEY);
  return isBlogTheme(storedTheme) ? storedTheme : 'light';
};

export const useBlogTheme = () => {
  const [theme, setTheme] = useState<BlogTheme>(readStoredBlogTheme);

  useEffect(() => {
    window.localStorage.setItem(BLOG_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};

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
      className="blog-theme-toggle"
      onClick={props.onToggle}
      aria-label={label}
      title={label}
    >
      <Icon className="blog-theme-toggle-icon" />
    </button>
  );
}
