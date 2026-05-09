import {
  type ResumeImageAssets,
  type ResumeModel,
  ResumePageDesktop,
  ResumePageMobile,
} from '@website-kernel/resume';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { useWebsiteTheme } from '@website-kernel/shared';
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
    return (
      <ResumePageMobile model={model} assets={resumeAssets} theme={theme} />
    );
  }
  return (
    <ResumePageDesktop
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
