import { Component, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { useWebsiteTheme } from '@website-kernel/shared';
import { Spinner, WillaShell } from 'willa';

import { WebsiteThemeToggle } from '#app/components/WebsiteThemeToggle';
import NotFoundPage from '#app/pages/NotFoundPage';

import 'willa/style.css';
import '@radix-ui/themes/styles.css';
import '#app/App.css';

const HomePage = lazy(() => import('#app/pages/HomePage'));
const ResumePage = lazy(() => import('#app/pages/ResumePage'));
const BlogHomeRoute = lazy(() => import('#app/pages/Blog/HomePage'));
const BlogArticleRoute = lazy(() => import('#app/pages/Blog/ArticlePage'));

type AppRouteErrorBoundaryProps = {
  children: ReactNode;
};

type AppRouteErrorBoundaryState = {
  error: Error | null;
};

class AppRouteErrorBoundary extends Component<
  AppRouteErrorBoundaryProps,
  AppRouteErrorBoundaryState
> {
  state: AppRouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <AppRouteErrorFallback />;
  }
}

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
    <WillaShell theme="light" className="app__suspenseFallback">
      <Spinner
        size="lg"
        label={<span className="app__suspenseFallbackLabel">加载中</span>}
        labelPosition="block"
      />
    </WillaShell>
  );
};

const AppRouteErrorFallback = () => {
  return (
    <main className="app__routeError" role="alert">
      <div className="app__routeErrorInner">
        <h1 className="app__routeErrorTitle">页面加载失败</h1>
        <p className="app__routeErrorText">
          当前页面资源没有加载成功，通常和网络连接不稳定或资源请求失败有关。
        </p>
        <div className="app__routeErrorActions">
          <button
            type="button"
            className="app__routeErrorButton"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
          <a href="/" className="app__routeErrorLink">
            返回首页
          </a>
        </div>
      </div>
    </main>
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
        <AppRouteErrorBoundary key={pathname}>
          <Suspense fallback={<AppSuspenseFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogHomeRoute />} />
              <Route path="/blog/:slug" element={<BlogArticleRoute />} />
              <Route path="/resume" element={<ResumePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppRouteErrorBoundary>
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
