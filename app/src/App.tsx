import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { useWebsiteTheme } from '@website-kernel/shared';
import { Spinner } from 'willa';

import { WebsiteThemeToggle } from '#app/components/WebsiteThemeToggle';
import NotFoundPage from '#app/pages/NotFoundPage';

import '@radix-ui/themes/styles.css';
import 'willa/style.css';
import '#app/App.css';

const HomePage = lazy(() => import('#app/pages/HomePage'));
const ResumePage = lazy(() => import('#app/pages/ResumePage'));
const BlogHomePage = lazy(() => import('#app/pages/Blog/BlogHomePage'));
const BlogArticlePage = lazy(() => import('#app/pages/Blog/BlogArticlePage'));

function AppSuspenseFallback() {
  return (
    <div className="app__suspenseFallback">
      <Spinner size="lg" label="加载中" labelPosition="block" />
    </div>
  );
}

export function App() {
  // GitHub Pages / 子路径部署时，确保路由与资源路径一致。
  const basename = (window.__APP_BASE__ || '/').replace(/\/$/, '');
  const { theme } = useWebsiteTheme();

  return (
    <BrowserRouter basename={basename || undefined}>
      <Theme className="app__theme" appearance={theme}>
        <WebsiteThemeToggle />
        <Suspense fallback={<AppSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogHomePage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Theme>
    </BrowserRouter>
  );
}
