import {
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type KeepTogetherRangePx = {
  topPx: number;
  bottomPx: number;
  strict: boolean;
};

type PageSpec = {
  offsetY: number;
  heightPx: number;
};

const getKeepTogetherRangesCssPx = (
  root: HTMLElement,
): KeepTogetherRangePx[] => {
  const rootRect = root.getBoundingClientRect();
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-export-keep-together]'),
  );

  return nodes
    .map((node) => {
      const r = node.getBoundingClientRect();
      const top = Math.max(0, r.top - rootRect.top);
      const bottom = Math.max(top, r.bottom - rootRect.top);
      const strict = node.dataset.exportKeepTogether === 'strict';
      return { topPx: top, bottomPx: bottom, strict };
    })
    .filter((x) => Number.isFinite(x.topPx) && Number.isFinite(x.bottomPx))
    .filter((x) => x.bottomPx - x.topPx > 2)
    .sort((a, b) => a.topPx - b.topPx);
};

const chooseSliceHeightPx = (args: {
  offsetY: number;
  idealPageHeightPx: number;
  totalHeightPx: number;
  keepTogether: KeepTogetherRangePx[];
}) => {
  const { offsetY, idealPageHeightPx, totalHeightPx, keepTogether } = args;
  const idealCut = offsetY + idealPageHeightPx;
  if (idealCut >= totalHeightPx) return totalHeightPx - offsetY;

  // strict keep-together：如果某个块本身就超过一页高度，无法整体挪动。
  // 这种情况允许拆分，同时给出提示，便于后续优化内容结构。
  for (const r of keepTogether) {
    if (!r.strict) continue;
    const blockHeight = r.bottomPx - r.topPx;
    if (blockHeight > idealPageHeightPx * 0.98) {
      console.warn(
        '[resume] keep-together strict block exceeds one page, allow split:',
        {
          topPx: Math.round(r.topPx),
          bottomPx: Math.round(r.bottomPx),
          blockHeightPx: Math.round(blockHeight),
          pageHeightPx: Math.round(idealPageHeightPx),
        },
      );
      break;
    }
  }

  // strict 优先：如果命中 strict 区间，直接把“外层块”整体挪到下一页。
  // 目的：避免 nested keep-together（例如公司块里还有条目块）导致上一页仍然露出“半截公司块”。
  const strictCandidates = keepTogether
    .filter((r) => r.strict)
    .filter((r) => r.topPx < idealCut && r.bottomPx > idealCut)
    .filter((r) => r.topPx > offsetY + 1)
    .sort((a, b) => a.topPx - b.topPx);

  const strictHit = strictCandidates[0] ?? null;

  // 找出“切线”落入的 keep-together 区间，并尽量把该块整体移动到下一页
  let intersect: KeepTogetherRangePx | null = strictHit;
  if (!intersect) {
    for (const r of keepTogether) {
      if (r.topPx < idealCut && r.bottomPx > idealCut) {
        // 忽略已经在本页开始之前的块（避免回退切线）
        if (r.topPx <= offsetY + 1) continue;
        if (!intersect || r.topPx > intersect.topPx) intersect = r;
      }
    }
  }

  if (!intersect) return idealPageHeightPx;

  const blockHeight = intersect.bottomPx - intersect.topPx;
  // 单个块本身超过一页高度：无法保证不拆分
  if (blockHeight > idealPageHeightPx * 0.98) return idealPageHeightPx;

  const cutAt = Math.floor(intersect.topPx);
  const sliceHeight = cutAt - offsetY;
  // 需求：放不下就整体挪到下一页，留白没关系。
  // 因此 keep-together 命中时，尽量在块顶部切页（即使本页只剩很小空间）。
  const minSlice = Math.floor(idealPageHeightPx * 0.08);
  if (sliceHeight < minSlice) {
    // 极端情况下 slice 太小会生成几乎空白的一页：这里仍允许，但要保证循环能推进。
    return Math.max(1, sliceHeight);
  }
  return sliceHeight;
};

export const ResumeShell = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    topBar?: ReactNode;
  }
>(function ResumeShell(props, ref) {
  const A4_RATIO = 297 / 210;
  const PAGE_GAP_PX = 28;
  // 页脚占用的固定高度（需要和渲染样式保持一致，否则会出现“内容被页脚挤压而截断”的错觉）
  const FOOTER_HEIGHT_PX = 28;

  const pagedRootRef = useRef<HTMLDivElement | null>(null);
  const measurePageRef = useRef<HTMLDivElement | null>(null);
  const measureInnerRef = useRef<HTMLDivElement | null>(null);
  const measureContentRef = useRef<HTMLDivElement | null>(null);

  const [_pageOffsets, setPageOffsets] = useState<number[]>([0]);
  const [pageHeightPx, setPageHeightPx] = useState<number | null>(null);
  const [pages, setPages] = useState<PageSpec[]>([{ offsetY: 0, heightPx: 1 }]);

  const pageCardClassName = useMemo(() => {
    return 'mx-auto w-full max-w-198.5 rounded-[2px] bg-white shadow-md shadow-zinc-300/70';
  }, []);

  const pageInnerClassName = useMemo(() => {
    return 'h-full w-full px-5 py-6 md:px-8 md:py-7';
  }, []);

  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      const page = measurePageRef.current;
      const inner = measureInnerRef.current;
      const content = measureContentRef.current;
      if (!page || !inner || !content) return;

      // 必须使用“页面卡片”的真实宽度（受 max-w 限制），否则页高会被算大，导致底部截断。
      const pageRect = page.getBoundingClientRect();
      const widthPx = Math.max(1, pageRect.width);
      const pageH = Math.round(widthPx * A4_RATIO);
      setPageHeightPx(pageH);

      const innerStyle = window.getComputedStyle(inner);
      const padTop = Number.parseFloat(innerStyle.paddingTop || '0') || 0;
      const padBottom = Number.parseFloat(innerStyle.paddingBottom || '0') || 0;
      const contentViewportHeightPx = Math.max(
        1,
        pageH - padTop - padBottom - FOOTER_HEIGHT_PX,
      );

      const totalHeightPx = Math.max(1, content.getBoundingClientRect().height);
      const keepTogether = getKeepTogetherRangesCssPx(content);

      const offsets: number[] = [];
      const nextPages: PageSpec[] = [];
      let offsetY = 0;
      // 防止极端情况死循环
      const maxPages = 50;
      let guard = 0;
      while (offsetY < totalHeightPx - 0.5 && guard < maxPages) {
        offsets.push(offsetY);
        const slice = chooseSliceHeightPx({
          offsetY,
          idealPageHeightPx: contentViewportHeightPx,
          totalHeightPx,
          keepTogether,
        });
        // 关键：本页“可视内容高度”必须等于切片高度。
        // 否则即使我们把块挪到下一页，上一页仍会因为视口更高而露出“半截块”。
        const safeSlice = Math.min(
          Math.floor(contentViewportHeightPx),
          Math.max(1, Math.floor(slice)),
        );
        nextPages.push({ offsetY, heightPx: safeSlice });
        offsetY += safeSlice;
        guard += 1;
      }
      if (offsets.length === 0) offsets.push(0);
      setPageOffsets(offsets);
      setPages(nextPages.length ? nextPages : [{ offsetY: 0, heightPx: 1 }]);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    if (pagedRootRef.current) ro.observe(pagedRootRef.current);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className="resume-root min-h-screen text-zinc-900"
      // 用 inline style 避免 Tailwind 扫描不到复杂的 bg-[...] 导致背景丢失。
      style={{
        backgroundColor: '#ffffff',
        backgroundImage:
          // white base + very soft blue/purple glows (iOS/Notion-like)
          'radial-gradient(900px circle at 18% 8%, rgba(191,219,254,0.45) 0%, rgba(255,255,255,0) 62%),' +
          'radial-gradient(860px circle at 86% 14%, rgba(216,180,254,0.38) 0%, rgba(255,255,255,0) 60%),' +
          'radial-gradient(820px circle at 52% 108%, rgba(167,243,208,0.22) 0%, rgba(255,255,255,0) 58%),' +
          'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,255,1) 100%)',
      }}
    >
      {props.topBar ? (
        <div
          data-export-hide="true"
          className="fixed right-3 top-3 z-50 md:right-5 md:top-4"
        >
          {props.topBar}
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-240 px-0 py-0 md:px-6 md:py-7">
        <div className="relative">
          {/* 测量用（不展示）：用于计算分页高度与切页点，必须和真实页面同宽 */}
          <div
            data-export-hide="true"
            className="pointer-events-none absolute left-0 top-0 w-full"
            style={{ visibility: 'hidden' }}
          >
            <div ref={measurePageRef} className={pageCardClassName}>
              <div
                ref={measureInnerRef}
                data-export-page-inner
                className={pageInnerClassName}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <div ref={measureContentRef}>{props.children}</div>
              </div>
            </div>
          </div>

          {/* 屏幕端按 A4 分页展示（每页之间留间距） */}
          <div
            ref={(node) => {
              pagedRootRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref)
                (ref as RefObject<HTMLDivElement | null>).current = node;
            }}
            data-export-paged="true"
            className="flex flex-col items-center"
            style={{ gap: PAGE_GAP_PX }}
          >
            {pages.map((p, i) => (
              <div
                key={i}
                data-export-page="true"
                className={pageCardClassName}
                style={{
                  height: pageHeightPx ?? undefined,
                  overflow: 'hidden',
                }}
              >
                <div
                  data-export-page-inner
                  className={pageInnerClassName}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <div
                    style={
                      pageHeightPx
                        ? { height: p.heightPx, overflow: 'hidden' }
                        : { flex: 1, overflow: 'hidden' }
                    }
                  >
                    <div
                      style={{
                        transform: `translateY(-${p.offsetY}px)`,
                        transformOrigin: 'top left',
                      }}
                    >
                      {props.children}
                    </div>
                  </div>

                  {/* 留白区域：放不下就挪到下一页，空一点没关系 */}
                  {pageHeightPx ? <div style={{ flex: 1 }} /> : null}

                  <div
                    style={{ height: FOOTER_HEIGHT_PX }}
                    className="flex items-center justify-between border-t border-zinc-200/70 px-0 text-[10px] font-medium text-zinc-400"
                  >
                    <span className="truncate">
                      {document.title || 'Resume'}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {i + 1} / {pages.length}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
