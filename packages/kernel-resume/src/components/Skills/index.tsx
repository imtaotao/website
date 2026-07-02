import { Progress, Stack } from 'willa';
import { type ResumeSkillGroup } from '#resume/parser';

const levelText = (level: number) => {
  const v = Math.max(1, Math.min(100, Math.round(level)));
  return `${v}/100`;
};

export function Skills(props: { groups: Array<ResumeSkillGroup> }) {
  if (!props.groups.length) return null;

  return (
    <div className="space-y-8">
      {props.groups.map((g, idx) => (
        <Stack key={`${idx}:${g.category}`} gap="sm">
          <div className="text-xs font-medium tracking-[0.2em] text-zinc-500">
            {g.category}
          </div>
          <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
            {g.items.map((it) => (
              <div
                key={it.name}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4"
              >
                <div className="min-w-0 text-sm font-medium text-zinc-900">
                  {it.name}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <Progress
                    value={it.level}
                    max={100}
                    size="sm"
                    tone="neutral"
                    width="6.5rem"
                    className="resume-skill-progress"
                  />
                  <div className="font-mono text-sm font-bold tracking-[0.12em] text-zinc-900">
                    {levelText(it.level)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Stack>
      ))}
    </div>
  );
}
