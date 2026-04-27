export function ResumeSummary(props: { summary: Array<string> }) {
  if (!props.summary.length) return null;
  return (
    <ul className="space-y-2 text-[13px] font-medium leading-6 text-zinc-800">
      {props.summary.map((item, idx) => (
        <li key={`${idx}:${item}`}>{item}</li>
      ))}
    </ul>
  );
}
