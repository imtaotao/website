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
    <div data-export-hide="true" className="resume-toolbar-group">
      <div className="resume-toolbar-row">
        <button
          type="button"
          className="resume-toolbar-action"
          disabled={exporting || disabled}
          onClick={props.onExportPdf}
        >
          {exporting ? `导出中 ${Math.round(progress)}%` : '导出 PDF'}
        </button>
      </div>

      {exporting ? (
        <div className="resume-toolbar-progress">
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
        <div className="resume-toolbar-hint">{props.disabledText}</div>
      ) : null}
    </div>
  );
}
