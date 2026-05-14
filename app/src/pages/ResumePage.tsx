import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useWebsiteTheme } from '@website-kernel/shared';
import type { ResumeModel, ResumeImageAssets } from '@website-kernel/resume';
import { ResumeMobile } from '@website-kernel/resume/pages/ResumeMobile';
import { ResumeDesktop } from '@website-kernel/resume/pages/ResumeDesktop';

import '@website-kernel/resume/external.css';
import '@website-kernel/resume/pages/ResumeMobile.css';
import '@website-kernel/resume/pages/ResumeDesktop.css';

import { loadResumeModel } from '#app/lib/resume';
import { useIsMobile } from '#app/lib/browser';
import { usePageMeta } from '#app/lib/pageMeta';
import zhihuIconUrl from '#app/assets/image/zhihu.svg';
import defaultAvatarUrl from '#app/assets/image/avatar1.jpg';
import zhenaiIconUrl from '#app/assets/image/zhenai.svg';
import codemonIconUrl from '#app/assets/image/codemon.svg';
import tencentIconUrl from '#app/assets/image/tencent.svg';
import bytedanceIconUrl from '#app/assets/image/bytedance.svg';

const resumeAssets: ResumeImageAssets = {
  defaultAvatarUrl,
  zhihuIconUrl,
  companyIconUrls: {
    bytedance: bytedanceIconUrl,
    tencent: tencentIconUrl,
    zhenai: zhenaiIconUrl,
    codemon: codemonIconUrl,
  },
};

export default function ResumePage() {
  const model: ResumeModel = loadResumeModel();
  const isMobile = useIsMobile(768);
  const { theme, toggleTheme } = useWebsiteTheme();
  const isDark = theme === 'dark';
  const ThemeIcon = isDark ? SunIcon : MoonIcon;
  const themeToggleLabel = isDark ? '切换到白天模式' : '切换到黑夜模式';

  usePageMeta({
    title: '简历',
    description: '陈涛的前端工程师简历，包含工作经历、技能和开源项目。',
    canonicalPath: '/resume',
  });

  if (isMobile) {
    return <ResumeMobile model={model} assets={resumeAssets} theme={theme} />;
  }
  return (
    <ResumeDesktop
      model={model}
      assets={resumeAssets}
      theme={theme}
      topBarExtra={
        <button
          type="button"
          className={`app__themeToggle app__themeToggle--inline resume-toolbar-toggle ${
            isDark ? 'app__themeToggle--dark' : 'app__themeToggle--light'
          }`}
          onClick={toggleTheme}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          <ThemeIcon className="app__themeToggleIcon" />
        </button>
      }
    />
  );
}
