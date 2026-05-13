import { type ResumeModel } from '#resume/resumeParser';
import { type ResumeImageAssets } from '#resume/components/ResumeAssets';
import { type ResumeTheme, ResumeShell } from '#resume/components/ResumeShell';
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
  theme?: ResumeTheme;
}) {
  const { model } = props;

  return (
    <ResumeShell paged={false} theme={props.theme}>
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
