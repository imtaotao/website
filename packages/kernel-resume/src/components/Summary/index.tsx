import { Stack } from 'willa';

export function Summary(props: { summary: Array<string> }) {
  if (!props.summary.length) return null;
  return (
    <Stack
      as="ul"
      gap="0.5rem"
      className="text-[14px] font-medium leading-6 text-zinc-800 md:text-[15px]"
    >
      {props.summary.map((item, idx) => (
        <li key={`${idx}:${item}`}>{item}</li>
      ))}
    </Stack>
  );
}
