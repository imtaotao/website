import { useRef } from 'react';
import { type ResumeModel } from '@website-kernel/shared';

import { ResumeShell } from '#app/components/resume/ResumeShell';
import { ResumeExportBar } from '#app/components/resume/ResumeExportBar';
import { ResumeHeader } from '#app/components/resume/ResumeHeader';
import { ResumeSection } from '#app/components/resume/ResumeSection';
import { ResumeSummary } from '#app/components/resume/ResumeSummary';
import { ResumeSkills } from '#app/components/resume/ResumeSkills';
import { ResumeExperienceList } from '#app/components/resume/ResumeExperience';
import { ResumeOpenSourceProjects } from '#app/components/resume/ResumeOpenSourceProjects';
import { exportElementToPdf } from '#app/lib/export';

export function ResumePageMobile(props: { model: ResumeModel }) {
  const { model } = props;
  const exportRef = useRef<HTMLDivElement | null>(null);

  return (
    <ResumeShell
      topBar={
        <div className="sticky top-4 z-10">
          <ResumeExportBar
            onExportPdf={async () => {
              if (!exportRef.current) return;
              try {
                await exportElementToPdf(exportRef.current);
              } catch (err) {
                console.error('[export] export pdf failed', err);
                window.alert(
                  'PDF 导出失败，请稍后重试；如果仍失败，可尝试切换到电脑端导出。',
                );
              }
            }}
          />
        </div>
      }
    >
      <div ref={exportRef}>
        <ResumeHeader basics={model.basics} />

        <ResumeSection title="简介" decorated={false}>
          <ResumeSummary summary={model.summary} />
        </ResumeSection>

        <ResumeSection title="技能">
          <ResumeSkills groups={model.skills} />
        </ResumeSection>

        <ResumeSection title="经历">
          <ResumeExperienceList items={model.experiences} />
        </ResumeSection>

        {model.openSourceProjects.length ||
        model.openSourceProjectsIntro.length ? (
          <ResumeSection title="开源项目">
            <ResumeOpenSourceProjects
              intro={model.openSourceProjectsIntro}
              items={model.openSourceProjects}
            />
          </ResumeSection>
        ) : null}
      </div>
    </ResumeShell>
  );
}
