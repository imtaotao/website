import {
  type ResumeImageAssets,
  type ResumeModel,
  ResumePageDesktop,
  ResumePageMobile,
} from '@website-kernel/resume';
import { loadResumeModel } from '#app/lib/resume';
import { useIsMobile } from '#app/lib/browser';
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

  if (isMobile) {
    return <ResumePageMobile model={model} assets={resumeAssets} />;
  }
  return <ResumePageDesktop model={model} assets={resumeAssets} />;
}
