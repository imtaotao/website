import { Button } from '@radix-ui/themes';

export function ResumeExportBar(props: {
  onExportPdf?: () => void;
  exporting?: boolean;
  progress?: number;
  progressText?: string;
  disabled?: boolean;
  disabledText?: string;
}) {
  const exporting = props.exporting ?? false;
  const disabled = props.disabled ?? false;
  const progress = Math.min(100, Math.max(0, props.progress ?? 0));

  return (
    <div data-export-hide="true" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="1"
          variant="soft"
          color="gray"
          disabled={exporting || disabled}
          onClick={props.onExportPdf}
        >
          {exporting ? `导出中 ${Math.round(progress)}%` : '导出 PDF'}
        </Button>
      </div>

      {exporting ? (
        <div className="w-39">
          {props.progressText ? (
            <div className="mb-1 text-[11px] font-medium text-zinc-600">
              {props.progressText}
            </div>
          ) : null}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/70">
            <div
              className="h-full rounded-full bg-zinc-700 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : disabled && props.disabledText ? (
        <div className="w-52 text-[11px] font-medium text-zinc-500">
          {props.disabledText}
        </div>
      ) : null}
    </div>
  );
}
