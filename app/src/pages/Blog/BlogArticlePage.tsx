import { BlogArticlePage as KernelBlogArticlePage } from '@website-kernel/blog';
import { useParams } from 'react-router';

import { getBlogArticleBySlug, resolveBlogAssetUrl } from '#app/lib/blog';
import { usePageMeta } from '#app/lib/pageMeta';

const BLOG_BGM_URL = '/bgm.mp3';

export default function BlogArticlePage() {
  const { slug = '' } = useParams();
  const article = getBlogArticleBySlug(slug, { includeHidden: true });
  const bgmUrl =
    article?.bgm === true
      ? BLOG_BGM_URL
      : typeof article?.bgm === 'string'
      ? resolveBlogAssetUrl(article.sourcePath, article.bgm)
      : undefined;

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
      resolveAssetUrl={resolveBlogAssetUrl}
      bgmUrl={bgmUrl}
    />
  );
}
