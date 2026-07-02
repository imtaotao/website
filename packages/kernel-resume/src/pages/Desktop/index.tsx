import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Progress, Spinner, Toolbar, WillaShell } from 'willa';

import { type ResumeModel } from '#resume/parser';
import { exportElementToPdf } from '#resume/exportPdf';
import type { ResumeImageAssets } from '#resume/assets';
import { Shell } from '#resume/components/Shell';
import { ExportBar } from '#resume/components/ExportBar';
import { Header } from '#resume/components/Header';
import { Section } from '#resume/components/Section';
import { Summary } from '#resume/components/Summary';
import { Skills } from '#resume/components/Skills';
import { ExperienceList } from '#resume/components/Experience';
import { OpenSourceProjects } from '#resume/components/OpenSourceProjects';

export function Desktop(props: {
  model: ResumeModel;
  assets?: ResumeImageAssets;
  topBarExtra?: ReactNode;
}) {
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
    <>
      {exporting ? (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <WillaShell
            theme="light"
            className="w-70 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg"
          >
            <Spinner
              size="sm"
              label="正在导出 PDF"
              className="text-sm font-semibold text-zinc-900"
            />
            <Progress
              className="resume-export-dialog-progress mt-3"
              value={exportProgress}
              max={100}
              description={exportProgressText || '请稍候…'}
              valueLabel={`${Math.round(exportProgress)}%`}
              showValue
              size="md"
              tone="neutral"
            />
          </WillaShell>
        </div>
      ) : null}

      <Shell
        ref={exportRef}
        topBar={
          <Toolbar
            ariaLabel="简历操作"
            size="sm"
            gap="20px"
            align="start"
            className="resume-toolbar"
          >
            <ExportBar
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
            {props.topBarExtra}
          </Toolbar>
        }
      >
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
          <Section title="开源项目" pageBreakBefore>
            <OpenSourceProjects
              intro={model.openSourceProjectsIntro}
              items={model.openSourceProjects}
              onRemoteDataLoadingChange={setRemoteDataLoading}
            />
          </Section>
        ) : null}
      </Shell>
    </>
  );
}
