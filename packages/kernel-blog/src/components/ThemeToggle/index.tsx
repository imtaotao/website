import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useWebsiteTheme } from '@website-kernel/shared';
import type { WebsiteTheme } from '@website-kernel/shared';
import { IconButton } from 'willa';

export type Theme = WebsiteTheme;
export type BlogTheme = Theme;

export function useBlogTheme() {
  return useWebsiteTheme();
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
