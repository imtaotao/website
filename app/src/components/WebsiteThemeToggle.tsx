import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useLocation } from 'react-router';
import { useWebsiteTheme } from '@website-kernel/shared';

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
    <button
      type="button"
      className={`app__themeToggle ${toneClass}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Icon className="app__themeToggleIcon" />
    </button>
  );
}
