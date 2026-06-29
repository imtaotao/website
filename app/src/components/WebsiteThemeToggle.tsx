import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useLocation } from 'react-router';
import { useWebsiteTheme } from '@website-kernel/shared';
import { IconButton } from 'willa';

export function WebsiteThemeToggle() {
  const location = useLocation();
  const { theme, toggleTheme } = useWebsiteTheme();

  if (location.pathname.startsWith('/blog')) return null;
  if (location.pathname.startsWith('/resume')) return null;
  const isDark = theme === 'dark';
  const Icon = isDark ? SunIcon : MoonIcon;
  const label = isDark ? '切换到白天模式' : '切换到黑夜模式';
  const toneClass = isDark
    ? 'app__themeToggle--dark'
    : 'app__themeToggle--light';

  return (
    <IconButton
      type="button"
      variant="ghost"
      size="sm"
      icon={<Icon className="app__themeToggleIcon" />}
      className={`app__themeToggle ${toneClass}`}
      onClick={toggleTheme}
      ariaLabel={label}
      title={label}
    />
  );
}
