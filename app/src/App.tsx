import { BrowserRouter, Route, Routes } from 'react-router';
import { Theme } from '@radix-ui/themes';

import '@radix-ui/themes/styles.css';
import '#app/App.css';

import { HomePage } from '#app/pages/HomePage';
import { BlogArticlePage } from '#app/pages/BlogArticlePage';
import { BlogHomePage } from '#app/pages/BlogHomePage';
import { BlogTagPage } from '#app/pages/BlogTagPage';
import { ResumePage } from '#app/pages/ResumePage';

export function App() {
  // GitHub Pages / 子路径部署时，确保路由与资源路径一致。
  // 注意：此处避免使用 import.meta（tsconfig NodeNext + CJS 下会报错）。
  const basename = (window.__APP_BASE__ || '/').replace(/\/$/, '');
  return (
    <BrowserRouter basename={basename || undefined}>
      <Theme>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogHomePage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route path="/blog/tags/:tag" element={<BlogTagPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="*" element={null} />
        </Routes>
      </Theme>
    </BrowserRouter>
  );
}
