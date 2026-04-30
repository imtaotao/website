import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Theme } from '@radix-ui/themes';

import HomePage from '#app/pages/HomePage';
import ResumePage from '#app/pages/ResumePage';
import BlogHomePage from '#app/pages/Blog/BlogHomePage';
import BlogArticlePage from '#app/pages/Blog/BlogArticlePage';

import '@radix-ui/themes/styles.css';
import '#app/App.css';

function AppSuspenseFallback() {
  return (
    <div
      className="app__suspenseFallback"
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <div className="app__spinner" aria-hidden="true" />
      <div className="app__suspenseText">加载中</div>
    </div>
  );
}

export function App() {
  // GitHub Pages / 子路径部署时，确保路由与资源路径一致。
  const basename = (window.__APP_BASE__ || '/').replace(/\/$/, '');
  return (
    <BrowserRouter basename={basename || undefined}>
      <Theme className="app__theme">
        <Suspense fallback={<AppSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<BlogHomePage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="*" element={null} />
          </Routes>
        </Suspense>
      </Theme>
    </BrowserRouter>
  );
}
