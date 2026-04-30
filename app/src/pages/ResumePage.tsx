import { type ResumeModel } from '@website-kernel/shared';
import { loadResumeModel } from '#app/lib/resume';
import { useIsMobile } from '#app/lib/browser';
import { ResumePageMobile } from '#app/components/resume/ResumePageMobile';
import { ResumePageDesktop } from '#app/components/resume/ResumePageDesktop';

import '#app/pages/ResumePage.css';

export default function ResumePage() {
  const model: ResumeModel = loadResumeModel();
  const isMobile = useIsMobile(768);

  if (isMobile) {
    return <ResumePageMobile model={model} />;
  }
  return <ResumePageDesktop model={model} />;
}
