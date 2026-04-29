import { Link, useParams } from 'react-router';

import { getBlogArticlesByTag, getBlogTagByKey } from '#app/lib/blog';
import { formatBlogDate } from '#app/lib/blog-presentation';

export function BlogTagPage() {
  const { tag = '' } = useParams();
  const tagMeta = getBlogTagByKey(tag);
  const articles = getBlogArticlesByTag(tag);

  if (!tagMeta) {
    return (
      <main className="blog-shell min-h-screen">
        <div className="blog-page blog-empty-state">
          <p>标签不存在。</p>
          <Link to="/blog" className="blog-subtle-link">
            返回博客首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="blog-shell min-h-screen">
      <div className="blog-page">
        <header className="blog-header blog-tag-header">
          <Link to="/blog" className="blog-subtle-link">
            返回博客首页
          </Link>
          <p className="blog-kicker">/ 标签</p>
          <h1 className="blog-title">{tagMeta.label}</h1>
          <p className="blog-intro">{tagMeta.description}</p>
        </header>

        <div className="blog-article-list">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="blog-list-item"
            >
              <div className="blog-list-meta">
                <time dateTime={article.publishedAt}>
                  {formatBlogDate(article.publishedAt)}
                </time>
                <span>{tagMeta.label}</span>
              </div>
              <h2 className="blog-list-title">{article.title}</h2>
              <p className="blog-list-summary">{article.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
