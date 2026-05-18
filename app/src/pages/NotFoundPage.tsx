import { Link } from 'react-router';
import { usePageMeta } from '#app/lib/pageMeta';

export default function NotFoundPage() {
  usePageMeta({
    title: '页面不存在',
    description: '这个页面不存在，返回首页或继续浏览博客。',
    canonicalPath: '/404',
  });

  return (
    <main className="app__notFound">
      <div className="app__notFoundInner">
        <p className="app__notFoundKicker">404</p>
        <h1 className="app__notFoundTitle">页面不存在</h1>
        <p className="app__notFoundText">
          这个地址没有对应的页面，可以返回首页，或者继续看博客文章。
        </p>
        <div className="app__notFoundLinks">
          <Link to="/" className="app__notFoundLink">
            返回首页
          </Link>
          <Link to="/blog" className="app__notFoundLink">
            浏览博客
          </Link>
        </div>
      </div>
    </main>
  );
}
