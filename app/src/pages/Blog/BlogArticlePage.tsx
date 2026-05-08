import { BlogArticlePage as KernelBlogArticlePage } from '@website-kernel/blog';

import {
  getBlogArticleBySlug,
  getBlogTagByKey,
  resolveBlogAssetUrl,
} from '#app/lib/blog';

export default function BlogArticlePage() {
  return (
    <KernelBlogArticlePage
      getArticleBySlug={getBlogArticleBySlug}
      getTagByKey={getBlogTagByKey}
      resolveAssetUrl={resolveBlogAssetUrl}
    />
  );
}
