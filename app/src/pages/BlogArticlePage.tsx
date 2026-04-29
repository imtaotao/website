import { Link, useParams } from 'react-router';

import { BlogMarkdown } from '#app/components/blog/BlogMarkdown';
import { getBlogArticleBySlug, getBlogTagByKey } from '#app/lib/blog';
import { formatBlogDate, formatBlogMeta } from '#app/lib/blog-presentation';

export function BlogArticlePage() {
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return (
      <main className="blog-shell min-h-screen">
        <div className="blog-page blog-empty-state">
          <p>文章不存在。</p>
          <Link to="/blog" className="blog-subtle-link">
            返回博客首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="blog-shell min-h-screen">
      <article className="blog-page blog-article-page">
        <Link to="/blog" className="blog-subtle-link">
          返回博客首页
        </Link>

        <header className="blog-article-header">
          <div className="blog-list-meta">
            <time dateTime={article.publishedAt}>
              {formatBlogDate(article.publishedAt)}
            </time>
            <span>{formatBlogMeta(article.tagLabels)}</span>
          </div>

          <h1 className="blog-article-title">{article.title}</h1>
          <p className="blog-article-summary">{article.summary}</p>

          <div className="blog-article-tag-list">
            {article.tags.map((tag) => {
              const tagMeta = getBlogTagByKey(tag);

              return (
                <Link
                  key={tag}
                  to={`/blog/tags/${tag}`}
                  className="blog-tag-chip"
                >
                  {tagMeta?.label ?? tag}
                </Link>
              );
            })}
          </div>

          <div className="blog-article-updates">
            <time dateTime={article.publishedAt}>
              发布于 {formatBlogDate(article.publishedAt)}
            </time>
            <time dateTime={article.updatedAt}>
              更新于 {formatBlogDate(article.updatedAt)}
            </time>
          </div>
        </header>

        {article.coverUrl ? (
          <img
            src={article.coverUrl}
            alt={article.title}
            className="blog-article-cover"
          />
        ) : null}

        <section className="blog-article-body">
          <BlogMarkdown source={article.content} />
        </section>
      </article>
    </main>
  );
}
