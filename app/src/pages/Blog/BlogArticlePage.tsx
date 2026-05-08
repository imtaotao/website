import { BlogArticlePage as KernelBlogArticlePage } from '@website-kernel/blog';
import { useParams } from 'react-router';

import {
  getBlogArticleBySlug,
  getBlogTagByKey,
  resolveBlogAssetUrl,
} from '#app/lib/blog';
import { usePageMeta } from '#app/lib/pageMeta';

export default function BlogArticlePage() {
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug, { includeHidden: true });

  usePageMeta({
    title: article?.title ?? '文章不存在',
    description: article?.summary ?? '这篇博客文章不存在或已经移动。',
    image: article?.coverUrl,
    type: article ? 'article' : 'website',
    canonicalPath: article ? `/blog/${article.slug}` : '/blog',
  });

  return (
    <KernelBlogArticlePage
      getArticleBySlug={getBlogArticleBySlug}
      getTagByKey={getBlogTagByKey}
      resolveAssetUrl={resolveBlogAssetUrl}
    />
  );
}
