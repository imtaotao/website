import { useEffect, useRef, useState } from 'react';
import { type ResumeModel, exportElementToPdf } from '@website-kernel/shared';

import { ResumeShell } from '#app/components/resume/ResumeShell';
import { ResumeExportBar } from '#app/components/resume/ResumeExportBar';
import { ResumeHeader } from '#app/components/resume/ResumeHeader';
import { ResumeSection } from '#app/components/resume/ResumeSection';
import { ResumeSummary } from '#app/components/resume/ResumeSummary';
import { ResumeSkills } from '#app/components/resume/ResumeSkills';
import { ResumeExperienceList } from '#app/components/resume/ResumeExperience';
import { ResumeOpenSourceProjects } from '#app/components/resume/ResumeOpenSourceProjects';

export function ResumePageDesktop(props: { model: ResumeModel }) {
  const { model } = props;
  const exportRef = useRef<HTMLDivElement | null>(null);
  const exportTokenRef = useRef(0);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportProgressText, setExportProgressText] = useState('');
  const [pageAssetsReady, setPageAssetsReady] = useState(false);
  const [remoteDataLoading, setRemoteDataLoading] = useState(false);

  useEffect(() => {
    const node = exportRef.current;
    if (!node) return;

    let canceled = false;
    setPageAssetsReady(false);

    const waitForPageAssets = async () => {
      const anyDoc = document as Document & {
        fonts?: { ready?: Promise<unknown> };
      };

      try {
        await anyDoc.fonts?.ready;
      } catch {
        // ignore
      }

      const imgs = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              const done = () => {
                img.removeEventListener('load', done);
                img.removeEventListener('error', done);
                resolve();
              };
              img.addEventListener('load', done);
              img.addEventListener('error', done);
            }),
        ),
      );
    };

    const run = async () => {
      try {
        await waitForPageAssets();
        if (canceled) return;
        setPageAssetsReady(true);
      } catch (err) {
        console.error('[export] wait page assets failed', err);
        if (canceled) return;
        setPageAssetsReady(false);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [model]);

  const canExportPdf = pageAssetsReady && !remoteDataLoading && !exporting;

  return (
    <ResumeShell
      ref={exportRef}
      topBar={
        <ResumeExportBar
          onExportPdf={async () => {
            if (!exportRef.current) return;
            if (!canExportPdf) {
              window.alert('页面尚未加载完成，暂不可导出 PDF');
              return;
            }

            exportTokenRef.current += 1;
            const token = exportTokenRef.current;

            setExporting(true);
            setExportProgress(0);
            setExportProgressText('准备导出…');
            try {
              await exportElementToPdf(exportRef.current, {
                onProgress: (p) => {
                  if (exportTokenRef.current !== token) return;
                  setExportProgress(p.percent);
                  setExportProgressText(p.message);
                },
              });
              setTimeout(() => {
                if (exportTokenRef.current !== token) return;
                setExporting(false);
                setExportProgressText('');
              }, 700);
            } catch (err) {
              console.error('[export] export pdf failed', err);
              window.alert('PDF 导出失败，请稍后重试。');
              if (exportTokenRef.current === token) {
                setExporting(false);
                setExportProgressText('');
              }
            }
          }}
          exporting={exporting}
          progress={exportProgress}
          progressText={exportProgressText}
          disabled={!canExportPdf}
        />
      }
    >
      {exporting ? (
        <div
          data-export-hide="true"
          className="fixed inset-0 z-9999 flex items-center justify-center bg-white/60 backdrop-blur-sm"
        >
          <div className="w-70 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg">
            <div className="text-sm font-semibold text-zinc-900">
              正在导出 PDF
            </div>
            <div className="mt-1 text-xs font-medium text-zinc-600">
              {exportProgressText || '请稍候…'}
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200/70">
              <div
                className="h-full rounded-full bg-zinc-900 transition-[width] duration-200"
                style={{
                  width: `${Math.min(100, Math.max(0, exportProgress))}%`,
                }}
              />
            </div>
            <div className="mt-2 text-right text-[11px] font-medium text-zinc-600">
              {Math.round(exportProgress)}%
            </div>
          </div>
        </div>
      ) : null}
      <ResumeHeader basics={model.basics} />

      <ResumeSection title="简介" decorated={false}>
        <ResumeSummary summary={model.summary} />
      </ResumeSection>

      <ResumeSection title="技能">
        <ResumeSkills groups={model.skills} />
      </ResumeSection>

      <ResumeSection title="经历">
        <ResumeExperienceList items={model.experiences} />
      </ResumeSection>

      {model.openSourceProjects.length ||
      model.openSourceProjectsIntro.length ? (
        <ResumeSection title="开源项目">
          <ResumeOpenSourceProjects
            intro={model.openSourceProjectsIntro}
            items={model.openSourceProjects}
            onRemoteDataLoadingChange={setRemoteDataLoading}
          />
        </ResumeSection>
      ) : null}
    </ResumeShell>
  );
}
