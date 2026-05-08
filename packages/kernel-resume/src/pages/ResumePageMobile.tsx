import { type ResumeModel } from '#resume/resumeParser';
import { type ResumeImageAssets } from '#resume/components/ResumeAssets';
import { ResumeShell } from '#resume/components/ResumeShell';
import { ResumeExportBar } from '#resume/components/ResumeExportBar';
import { ResumeHeader } from '#resume/components/ResumeHeader';
import { ResumeSection } from '#resume/components/ResumeSection';
import { ResumeSummary } from '#resume/components/ResumeSummary';
import { ResumeSkills } from '#resume/components/ResumeSkills';
import { ResumeExperienceList } from '#resume/components/ResumeExperience';
import { ResumeOpenSourceProjects } from '#resume/components/ResumeOpenSourceProjects';

import '#resume/pages/ResumePage.css';

export function ResumePageMobile(props: {
  model: ResumeModel;
  assets?: ResumeImageAssets;
}) {
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
      <ResumeHeader basics={model.basics} assets={props.assets} />

      <ResumeSection title="简介" decorated={false}>
        <ResumeSummary summary={model.summary} />
      </ResumeSection>

      <ResumeSection title="技能">
        <ResumeSkills groups={model.skills} />
      </ResumeSection>

      <ResumeSection title="经历">
        <ResumeExperienceList items={model.experiences} assets={props.assets} />
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
