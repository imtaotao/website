import { Button } from '@radix-ui/themes';

export function ResumeExportBar(props: {
  onExportPdf?: () => void;
  onExportJpg?: () => void;
}) {
  return (
    <div data-export-hide="true" className="flex items-center gap-2">
      <Button size="1" variant="soft" color="gray" onClick={props.onExportPdf}>
        PDF
      </Button>
      <Button size="1" variant="soft" color="gray" onClick={props.onExportJpg}>
        JPG
      </Button>
    </div>
  );
}
