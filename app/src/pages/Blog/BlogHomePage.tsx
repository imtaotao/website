import { BlogHomePage as KernelBlogHomePage } from '@website-kernel/blog';

import { getBlogArticles, getBlogTagSummaries } from '#app/lib/blog';
import avatarUrl from '#app/assets/image/avatar1.jpg';

export default function BlogHomePage() {
  return (
    <KernelBlogHomePage
      articles={getBlogArticles()}
      avatarUrl={avatarUrl}
      githubUrl="https://github.com/imtaotao"
      tags={getBlogTagSummaries()}
    />
  );
}
