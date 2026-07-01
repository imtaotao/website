import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { useWebsiteTheme } from '@website-kernel/shared';
import { Spinner } from 'willa';

import { WebsiteThemeToggle } from '#app/components/WebsiteThemeToggle';
import NotFoundPage from '#app/pages/NotFoundPage';

import 'willa/style.css';
import '@radix-ui/themes/styles.css';
import '#app/App.css';

const HomePage = lazy(() => import('#app/pages/HomePage'));
const ResumePage = lazy(() => import('#app/pages/ResumePage'));
const BlogHomePage = lazy(() => import('#app/pages/Blog/BlogHomePage'));
const BlogArticlePage = lazy(() => import('#app/pages/Blog/BlogArticlePage'));

const getAppSurface = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/') return 'home';
  if (normalizedPath === '/resume') return 'resume';
  if (normalizedPath === '/blog') return 'blogHome';
  if (normalizedPath.startsWith('/blog/')) return 'blogArticle';
  return 'notFound';
};

const AppSuspenseFallback = () => {
  return (
    <div className="app__suspenseFallback">
      <Spinner size="lg" label="加载中" labelPosition="block" />
    </div>
  );
};

const AppShell = () => {
  const { theme } = useWebsiteTheme();
  const { pathname } = useLocation();
  const appSurface = getAppSurface(pathname);

  return (
    <Theme
      className={`app__theme app__theme--${appSurface}`}
      appearance={theme}
    >
      <div
        className={`app__background app__background--${appSurface}`}
        aria-hidden="true"
      />
      <WebsiteThemeToggle />
      <div className="app__content">
        <Suspense fallback={<AppSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogHomePage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </Theme>
  );
};

export function App() {
  // GitHub Pages / 子路径部署时，确保路由与资源路径一致。
  const basename = (window.__APP_BASE__ || '/').replace(/\/$/, '');

  return (
    <BrowserRouter basename={basename || undefined}>
      <AppShell />
    </BrowserRouter>
  );
}
