import { HomePage as KernelHomePage } from '@website-kernel/blog';
import '@website-kernel/blog/style.css';

import { usePageMeta } from '#app/lib/pageMeta';
import { getBlogArticles, getBlogTagSummaries } from '#app/lib/blog';
import avatarUrl from '#app/assets/image/avatar.jpg';

export default function HomePage() {
  usePageMeta({
    title: '博客',
    description: '陈涛的博客，记录前端工程、技术实践、工具使用和日常想法。',
    canonicalPath: '/blog',
  });

  return (
    <KernelHomePage
      articles={getBlogArticles()}
      avatarUrl={avatarUrl}
      githubUrl="https://github.com/imtaotao"
      tags={getBlogTagSummaries()}
    />
  );
}
