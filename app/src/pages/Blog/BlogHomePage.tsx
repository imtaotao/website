import { BlogHomePage as KernelBlogHomePage } from '@website-kernel/blog/pages/BlogHomePage';
import '@website-kernel/blog/pages/BlogHomePage.css';
import '@website-kernel/blog/external.css';

import { getBlogArticles, getBlogTagSummaries } from '#app/lib/blog';
import { usePageMeta } from '#app/lib/pageMeta';
import avatarUrl from '#app/assets/image/avatar1.jpg';

export default function BlogHomePage() {
  usePageMeta({
    title: '博客',
    description: '陈涛的博客，记录前端工程、技术实践、工具使用和日常想法。',
    canonicalPath: '/blog',
  });

  return (
    <KernelBlogHomePage
      articles={getBlogArticles()}
      avatarUrl={avatarUrl}
      githubUrl="https://github.com/imtaotao"
      tags={getBlogTagSummaries()}
    />
  );
}
