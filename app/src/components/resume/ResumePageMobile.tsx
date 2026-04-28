import { type ResumeModel } from '@website-kernel/shared';

import { ResumeShell } from '#app/components/resume/ResumeShell';
import { ResumeExportBar } from '#app/components/resume/ResumeExportBar';
import { ResumeHeader } from '#app/components/resume/ResumeHeader';
import { ResumeSection } from '#app/components/resume/ResumeSection';
import { ResumeSummary } from '#app/components/resume/ResumeSummary';
import { ResumeSkills } from '#app/components/resume/ResumeSkills';
import { ResumeExperienceList } from '#app/components/resume/ResumeExperience';
import { ResumeOpenSourceProjects } from '#app/components/resume/ResumeOpenSourceProjects';

export function ResumePageMobile(props: { model: ResumeModel }) {
  const { model } = props;

  return (
    <ResumeShell
      paged={false}
      topBar={
        <div className="sticky top-4 z-10">
          <ResumeExportBar
            onExportPdf={async () => {
              window.alert(
                '移动端暂不支持导出 PDF，请在电脑端打开此页面导出。',
              );
            }}
          />
        </div>
      }
    >
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
    </ResumeShell>
  );
}
