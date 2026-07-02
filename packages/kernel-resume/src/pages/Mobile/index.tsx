import { type ResumeModel } from '#resume/parser';
import { type ResumeImageAssets } from '#resume/assets';
import { Shell } from '#resume/components/Shell';
import { Header } from '#resume/components/Header';
import { Section } from '#resume/components/Section';
import { Summary } from '#resume/components/Summary';
import { Skills } from '#resume/components/Skills';
import { ExperienceList } from '#resume/components/Experience';
import { OpenSourceProjects } from '#resume/components/OpenSourceProjects';

export function Mobile(props: {
  model: ResumeModel;
  assets?: ResumeImageAssets;
}) {
  const { model } = props;

  return (
    <Shell paged={false}>
      <Header basics={model.basics} assets={props.assets} />

      <Section title="简介" decorated={false}>
        <Summary summary={model.summary} />
      </Section>

      <Section title="技能">
        <Skills groups={model.skills} />
      </Section>

      <Section title="经历">
        <ExperienceList items={model.experiences} assets={props.assets} />
      </Section>

      {model.openSourceProjects.length ||
      model.openSourceProjectsIntro.length ? (
        <Section title="开源项目">
          <OpenSourceProjects
            intro={model.openSourceProjectsIntro}
            items={model.openSourceProjects}
          />
        </Section>
      ) : null}
    </Shell>
  );
}
