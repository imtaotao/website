import { BlogHomePage as KernelBlogHomePage } from '@website-kernel/blog';

import { getBlogArticles, getBlogTagSummaries } from '#app/lib/blog';

export default function BlogHomePage() {
  return (
    <KernelBlogHomePage
      articles={getBlogArticles()}
      tags={getBlogTagSummaries()}
    />
  );
}
