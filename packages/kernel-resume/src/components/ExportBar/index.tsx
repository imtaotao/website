import { Button, Progress, Stack } from 'willa';

export function ExportBar(props: {
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
    <Stack
      data-export-hide="true"
      gap="0.5rem"
      className="resume-toolbar-group"
    >
      <div className="resume-toolbar-row">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="resume-toolbar-action"
          disabled={exporting || disabled}
          loading={exporting}
          loadingText={`导出中 ${Math.round(progress)}%`}
          onClick={props.onExportPdf}
        >
          导出 PDF
        </Button>
      </div>

      {exporting ? (
        <div className="resume-toolbar-progress">
          {props.progressText ? (
            <div className="mb-1 text-[11px] font-medium text-zinc-600">
              {props.progressText}
            </div>
          ) : null}
          <Progress value={progress} max={100} size="sm" tone="neutral" />
        </div>
      ) : disabled && props.disabledText ? (
        <div className="resume-toolbar-hint">{props.disabledText}</div>
      ) : null}
    </Stack>
  );
}
