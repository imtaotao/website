import { type ResumeSkillGroup } from '@website-kernel/shared';

const levelText = (level: number): string => {
  const v = Math.max(1, Math.min(100, Math.round(level)));
  return `${v}/100`;
};

const levelBar = (level: number) => {
  const v = Math.max(1, Math.min(100, Math.round(level)));
  const pct = v;

  return (
    <div className="flex items-center" aria-hidden="true" title={`${v}/100`}>
      <div
        className={
          'relative h-2 w-[84px] overflow-hidden rounded-full border border-zinc-200/60 bg-zinc-100/70 ' +
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
        }
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-zinc-500"
          style={{ width: `${pct}%` }}
        />

        {/* subtle ticks at 20/40/60/80 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="absolute inset-y-0 w-px bg-white/50"
            style={{ left: `${(i + 1) * 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export function ResumeSkills(props: { groups: Array<ResumeSkillGroup> }) {
  if (!props.groups.length) return null;

  return (
    <div className="space-y-8">
      {props.groups.map((g, idx) => (
        <div key={`${idx}:${g.category}`}>
          <div className="mb-4 text-xs font-medium tracking-[0.2em] text-zinc-500">
            {g.category}
          </div>
          <div className="grid grid-cols-1 gap-y-4 md:grid-cols-2 md:gap-x-10">
            {g.items.map((it) => (
              <div
                key={it.name}
                className="flex items-baseline justify-between gap-6"
              >
                <div className="text-sm font-medium text-zinc-900">
                  {it.name}
                </div>
                <div className="flex items-center gap-2">
                  {levelBar(it.level)}
                  <div className="font-mono text-sm font-bold tracking-[0.12em] text-zinc-900">
                    {levelText(it.level)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
