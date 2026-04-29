import { jsPDF } from 'jspdf';
import { getFontEmbedCSS, toPng } from 'html-to-image';

// 是否启用“体积压缩”策略：
// - true：使用 JPEG + 多次尝试降低质量/分辨率，尽量把文件控制在 5MB 内
// - false：尽量保持质量（使用 PNG），不做 5MB 限制与降质重试
const EXPORT_PDF_ENABLE_COMPRESSION = false;

const PDF_MARGIN_MM = 10;

// 经验值：部分浏览器/设备的 canvas 单边上限接近 16384px。
// 一旦超出，`html-to-image` 生成的图片会被“静默截断”，表现为导出的 PDF 中间/后半段内容缺失。
const MAX_CANVAS_SIDE_PX = 16384;

// 0.82 在一些场景会出现明显的“糊/糙”（尤其是细字/细线）。
// 提高初始质量，后续仍可通过 attempts 逐步降质来满足体积约束。
const PDF_JPEG_QUALITY = 0.9;
const PDF_IMAGE_FORMAT = EXPORT_PDF_ENABLE_COMPRESSION ? 'JPEG' : 'PNG';

// 需求：导出的 PDF 文件体积控制在 5MB 以内。
const PDF_MAX_BYTES = 5 * 1024 * 1024;

export type ExportPdfProgress =
  | {
      phase: 'prepare';
      percent: number;
      message: string;
    }
  | {
      phase: 'render';
      percent: number;
      current: number;
      total: number;
      message: string;
    }
  | {
      phase: 'compress';
      percent: number;
      attempt: number;
      totalAttempts: number;
      message: string;
    }
  | {
      phase: 'done';
      percent: 100;
      message: string;
    };

export type ExportPdfOptions = {
  onProgress?: (p: ExportPdfProgress) => void;
};

type PreparedOfflineExportState = {
  fontEmbedCSS?: string;
};

const preparedOfflineExportState = new WeakMap<
  HTMLElement,
  PreparedOfflineExportState
>();

const emitProgress = (
  fn: ExportPdfOptions['onProgress'],
  p: ExportPdfProgress,
) => {
  try {
    fn?.(p);
  } catch {
    // ignore
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    // 给浏览器一点时间开始下载。
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
};

const nowDateString = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const isHiddenForExport = (node: HTMLElement): boolean => {
  return node.dataset.exportHide === 'true';
};

const nextFrame = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
};

const waitForFonts = async () => {
  const anyDoc = document as unknown as { fonts?: { ready: Promise<unknown> } };
  try {
    await anyDoc.fonts?.ready;
  } catch {
    // ignore
  }
};

const waitForImages = async (root: HTMLElement) => {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (imgs.length === 0) return;

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

const imageToDataUrl = (img: HTMLImageElement) => {
  const width = Math.max(1, img.naturalWidth || img.width || 1);
  const height = Math.max(1, img.naturalHeight || img.height || 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  try {
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
};

const replaceImageSrc = async (img: HTMLImageElement, dataUrl: string) => {
  await new Promise<void>((resolve) => {
    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };

    img.addEventListener('load', done);
    img.addEventListener('error', done);
    img.src = dataUrl;
  });
};

export const prepareElementForOfflineExport = async (root: HTMLElement) => {
  await waitForFonts();
  await waitForImages(root);

  const imageCache = new Map<string, string>();
  const imgs = Array.from(root.querySelectorAll('img'));

  for (const img of imgs) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;

    let dataUrl = imageCache.get(src);
    if (!dataUrl) {
      dataUrl = imageToDataUrl(img);
      if (!dataUrl) continue;
      imageCache.set(src, dataUrl);
    }

    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    await replaceImageSrc(img, dataUrl);
  }

  let fontEmbedCSS: string | undefined;
  try {
    fontEmbedCSS = await getFontEmbedCSS(root);
  } catch {
    fontEmbedCSS = undefined;
  }

  preparedOfflineExportState.set(root, {
    fontEmbedCSS,
  });
};

const getExportPixelRatio = () => {
  return Math.max(2, window.devicePixelRatio || 1);
};

const clampPixelRatioForSize = (args: {
  desired: number;
  widthCssPx: number;
  heightCssPx: number;
}) => {
  const { desired, widthCssPx, heightCssPx } = args;
  const safeWidth = Math.max(1, widthCssPx);
  const safeHeight = Math.max(1, heightCssPx);

  const maxByWidth = MAX_CANVAS_SIDE_PX / safeWidth;
  const maxByHeight = MAX_CANVAS_SIDE_PX / safeHeight;
  const clamped = Math.min(desired, maxByWidth, maxByHeight);
  return Math.max(1, clamped);
};

const prepareForExport = async (root: HTMLElement) => {
  // Let layout settle first, then wait for fonts/images.
  await nextFrame();
  await nextFrame();
  await waitForFonts();
  await waitForImages(root);
  await nextFrame();
};

const renderElementToPngDataUrl = async (
  el: HTMLElement,
  pixelRatio: number,
  fontEmbedCSS?: string,
) => {
  return await toPng(el, {
    backgroundColor: '#ffffff',
    pixelRatio,
    cacheBust: false,
    fontEmbedCSS,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !isHiddenForExport(node);
    },
  });
};

const renderElementSliceToPngDataUrlByWrappingPage = async (args: {
  el: HTMLElement;
  widthCssPx: number;
  offsetYCssPx: number;
  sliceHeightCssPx: number;
  pixelRatio: number;
  fontEmbedCSS?: string;
}) => {
  const {
    el,
    widthCssPx,
    offsetYCssPx,
    sliceHeightCssPx,
    pixelRatio,
    fontEmbedCSS,
  } = args;

  // 思路：用一个固定高度（单页）的 wrapper 包住整份内容 clone，并通过 translateY 上移。
  // wrapper 设置 overflow:hidden，确保真正“分页裁切”，避免 foreignObject 路线在某些浏览器出现中间截断。
  const host = document.createElement('div');
  host.setAttribute('data-export-hide', 'true');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '1px';
  host.style.height = '1px';
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  document.body.appendChild(host);

  try {
    const page = document.createElement('div');
    page.style.width = `${Math.max(1, widthCssPx)}px`;
    page.style.height = `${Math.max(1, sliceHeightCssPx)}px`;
    page.style.overflow = 'hidden';
    page.style.background = '#ffffff';

    const inner = document.createElement('div');
    inner.style.transform = `translateY(-${offsetYCssPx}px)`;
    inner.style.transformOrigin = 'top left';
    inner.style.width = `${Math.max(1, widthCssPx)}px`;

    inner.append(el.cloneNode(true));
    page.appendChild(inner);
    host.appendChild(page);

    // 给浏览器一次布局机会。
    await nextFrame();

    return await toPng(page, {
      backgroundColor: '#ffffff',
      pixelRatio,
      cacheBust: false,
      fontEmbedCSS,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return !isHiddenForExport(node);
      },
    });
  } finally {
    host.remove();
  }
};

const renderFixedSizeElementToPngDataUrlByWrapping = async (args: {
  el: HTMLElement;
  widthCssPx: number;
  heightCssPx: number;
  pixelRatio: number;
  fontEmbedCSS?: string;
}) => {
  const { el, widthCssPx, heightCssPx, pixelRatio, fontEmbedCSS } = args;

  // 目的：避免某些浏览器在直接对“页面内元素（可能处于 subpixel x）”截图时出现轻微水平偏移。
  // 通过把元素 clone 到一个固定尺寸、x=0 的 wrapper 中，再进行 toPng，保证对齐稳定。
  const host = document.createElement('div');
  host.setAttribute('data-export-hide', 'true');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '1px';
  host.style.height = '1px';
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  document.body.appendChild(host);

  try {
    const page = document.createElement('div');
    page.style.width = `${Math.max(1, widthCssPx)}px`;
    page.style.height = `${Math.max(1, heightCssPx)}px`;
    page.style.overflow = 'hidden';
    page.style.background = '#ffffff';

    const cloned = el.cloneNode(true) as HTMLElement;
    // 强制消除 clone 在 wrapper 内的“居中/外边距”影响，保持与原始 bbox 一致。
    cloned.style.margin = '0';
    cloned.style.width = `${Math.max(1, widthCssPx)}px`;
    cloned.style.height = `${Math.max(1, heightCssPx)}px`;
    cloned.style.maxWidth = 'none';

    page.appendChild(cloned);
    host.appendChild(page);

    await nextFrame();

    return await toPng(page, {
      backgroundColor: '#ffffff',
      pixelRatio,
      cacheBust: false,
      fontEmbedCSS,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return !isHiddenForExport(node);
      },
    });
  } finally {
    host.remove();
  }
};

const convertPngDataUrlToJpegDataUrl = async (args: {
  pngDataUrl: string;
  jpegQuality: number;
}) => {
  const img = await loadImage(args.pngDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.naturalWidth);
  canvas.height = Math.max(1, img.naturalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return args.pngDataUrl;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', args.jpegQuality);
};

const isLikelyTruncated = (args: {
  expectedWidthPx: number;
  expectedHeightPx: number;
  actualWidthPx: number;
  actualHeightPx: number;
}) => {
  const { expectedWidthPx, expectedHeightPx, actualWidthPx, actualHeightPx } =
    args;
  // 留一点容差（像素取整、字体栅格化等）
  const wOk = actualWidthPx >= expectedWidthPx * 0.98;
  const hOk = actualHeightPx >= expectedHeightPx * 0.98;
  return !(wOk && hOk);
};

const renderPngWithRetry = async (args: {
  el: HTMLElement;
  widthCssPx: number;
  heightCssPx: number;
  initialPixelRatio: number;
  maxAttempts?: number;
}) => {
  const { el, widthCssPx, heightCssPx } = args;
  const maxAttempts = args.maxAttempts ?? 3;
  const fontEmbedCSS = preparedOfflineExportState.get(el)?.fontEmbedCSS;

  let pixelRatio = args.initialPixelRatio;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const dataUrl = await renderElementToPngDataUrl(
      el,
      pixelRatio,
      fontEmbedCSS,
    );
    const img = await loadImage(dataUrl);
    const expectedWidthPx = Math.round(widthCssPx * pixelRatio);
    const expectedHeightPx = Math.round(heightCssPx * pixelRatio);

    if (
      !isLikelyTruncated({
        expectedWidthPx,
        expectedHeightPx,
        actualWidthPx: img.naturalWidth,
        actualHeightPx: img.naturalHeight,
      })
    ) {
      return { dataUrl, pixelRatio };
    }

    // 触发了截断/异常尺寸：降低像素比重试。
    const next = Math.max(1, pixelRatio * 0.75);
    console.warn(
      `[export] render seems truncated (attempt ${attempt}/${maxAttempts}), ` +
        `retry with pixelRatio ${pixelRatio.toFixed(2)} -> ${next.toFixed(2)}`,
    );
    pixelRatio = next;
  }

  const dataUrl = await renderElementToPngDataUrl(el, pixelRatio, fontEmbedCSS);
  return { dataUrl, pixelRatio };
};

type KeepTogetherRangePx = {
  topPx: number;
  bottomPx: number;
  strict: boolean;
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
      const mode = node.dataset.exportKeepTogether;
      const strict = mode === 'strict';
      return { topPx: top, bottomPx: bottom, strict };
    })
    .filter((x) => Number.isFinite(x.topPx) && Number.isFinite(x.bottomPx))
    .filter((x) => x.bottomPx - x.topPx > 2)
    .sort((a, b) => a.topPx - b.topPx);
};

const chooseSliceHeightPx = (args: {
  offsetY: number;
  idealPageHeightPx: number;
  imgHeightPx: number;
  keepTogether: KeepTogetherRangePx[];
}) => {
  const { offsetY, idealPageHeightPx, imgHeightPx, keepTogether } = args;
  const idealCut = offsetY + idealPageHeightPx;
  if (idealCut >= imgHeightPx) return imgHeightPx - offsetY;

  // strict keep-together：如果某个块本身就超过一页高度，无法整体挪动。
  // 这种情况允许拆分，同时给出提示，便于后续优化内容结构。
  for (const r of keepTogether) {
    if (!r.strict) continue;
    const blockHeight = r.bottomPx - r.topPx;
    if (blockHeight > idealPageHeightPx * 0.98) {
      console.warn(
        '[export] keep-together strict block exceeds one page, allow split:',
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

  // 找出“切线”落入的 keep-together 区间，并尽量把该块整体移动到下一页
  let intersect: KeepTogetherRangePx | null = null;
  for (const r of keepTogether) {
    if (r.topPx < idealCut && r.bottomPx > idealCut) {
      // 忽略已经在本页开始之前的块（避免回退切线）
      if (r.topPx <= offsetY + 1) continue;
      if (!intersect || r.topPx > intersect.topPx) intersect = r;
    }
  }

  if (!intersect) return idealPageHeightPx;

  const blockHeight = intersect.bottomPx - intersect.topPx;
  // 单个块本身超过一页高度：无法保证不拆分
  if (blockHeight > idealPageHeightPx * 0.98) return idealPageHeightPx;

  const cutAt = Math.floor(intersect.topPx);
  const sliceHeight = cutAt - offsetY;
  const minSlice = intersect.strict
    ? Math.floor(idealPageHeightPx * 0.1)
    : Math.floor(idealPageHeightPx * 0.35);
  // 太小的话宁愿拆分，也不要生成几乎空白的一页；但 strict 模式更倾向“整块挪到下一页”。
  if (sliceHeight < minSlice && !intersect.strict) return idealPageHeightPx;
  return sliceHeight;
};

const loadImage = async (dataUrl: string): Promise<HTMLImageElement> => {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
};

export async function exportElementToPdf(
  el: HTMLElement,
  options?: ExportPdfOptions,
) {
  emitProgress(options?.onProgress, {
    phase: 'prepare',
    percent: 2,
    message: '准备导出…',
  });
  await prepareElementForOfflineExport(el);
  await prepareForExport(el);
  const fontEmbedCSS = preparedOfflineExportState.get(el)?.fontEmbedCSS;

  // 如果页面本身已经按 A4 分页渲染（屏幕端分页视图），则按页逐个渲染。
  // 这样可以避免对超长容器截图时出现“中间截断”。
  const pagedPages = Array.from(
    el.querySelectorAll<HTMLElement>('[data-export-page="true"]'),
  );
  if (el.dataset.exportPaged === 'true' && pagedPages.length) {
    const buildPagedPdf = async (args: {
      desiredPixelRatio: number;
      jpegQuality: number;
      attempt: number;
      totalAttempts: number;
    }): Promise<{ bytes: number; blob: Blob }> => {
      const { desiredPixelRatio, jpegQuality, attempt, totalAttempts } = args;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: EXPORT_PDF_ENABLE_COMPRESSION,
      });

      const pageWidthMm = pdf.internal.pageSize.getWidth();
      const marginMm = PDF_MARGIN_MM;
      const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);
      const pdfImageCompression = EXPORT_PDF_ENABLE_COMPRESSION
        ? 'FAST'
        : 'SLOW';

      emitProgress(options?.onProgress, {
        phase: 'compress',
        percent: 5,
        attempt,
        totalAttempts,
        message: `生成 PDF（压缩尝试 ${attempt}/${totalAttempts}）…`,
      });

      const total = Math.max(1, pagedPages.length);
      for (let pageIndex = 0; pageIndex < pagedPages.length; pageIndex += 1) {
        const pageEl = pagedPages[pageIndex]!;
        const r = pageEl.getBoundingClientRect();
        const widthCssPx = Math.max(1, r.width);
        const heightCssPx = Math.max(1, r.height);
        const pixelRatio = clampPixelRatioForSize({
          desired: desiredPixelRatio,
          widthCssPx,
          heightCssPx,
        });

        // 5%~92% 用于渲染分页截图（占用时间最多）。
        const percent = Math.min(92, Math.max(6, 5 + (pageIndex / total) * 87));
        emitProgress(options?.onProgress, {
          phase: 'render',
          percent,
          current: pageIndex + 1,
          total,
          message: `渲染页面 ${pageIndex + 1}/${total}…`,
        });

        const pngDataUrl = await renderFixedSizeElementToPngDataUrlByWrapping({
          el: pageEl,
          widthCssPx,
          heightCssPx,
          pixelRatio,
          fontEmbedCSS,
        });
        const dataUrl = EXPORT_PDF_ENABLE_COMPRESSION
          ? await convertPngDataUrlToJpegDataUrl({
              pngDataUrl,
              jpegQuality,
            })
          : pngDataUrl;

        const pageHeightMm = (heightCssPx / widthCssPx) * contentWidthMm;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          dataUrl,
          PDF_IMAGE_FORMAT,
          marginMm,
          marginMm,
          contentWidthMm,
          pageHeightMm,
          undefined,
          pdfImageCompression,
        );
      }

      emitProgress(options?.onProgress, {
        phase: 'compress',
        percent: 94,
        attempt,
        totalAttempts,
        message: '生成文件…',
      });

      const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
      const bytes = arrayBuffer.byteLength;
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      return { bytes, blob };
    };

    const baseDesiredRatio = EXPORT_PDF_ENABLE_COMPRESSION ? 2 : 4;
    const attempts: Array<{ desiredPixelRatio: number; jpegQuality: number }> =
      EXPORT_PDF_ENABLE_COMPRESSION
        ? [
            {
              desiredPixelRatio: baseDesiredRatio,
              jpegQuality: PDF_JPEG_QUALITY,
            },
            { desiredPixelRatio: baseDesiredRatio, jpegQuality: 0.78 },
            {
              desiredPixelRatio: Math.min(baseDesiredRatio, 1.5),
              jpegQuality: 0.72,
            },
            { desiredPixelRatio: 1, jpegQuality: 0.65 },
          ]
        : [{ desiredPixelRatio: baseDesiredRatio, jpegQuality: 1 }];

    let last: { bytes: number; blob: Blob } | null = null;
    for (let i = 0; i < attempts.length; i += 1) {
      const { desiredPixelRatio, jpegQuality } = attempts[i]!;
      const attempt = i + 1;
      const totalAttempts = attempts.length;
      const { bytes, blob } = await buildPagedPdf({
        desiredPixelRatio,
        jpegQuality,
        attempt,
        totalAttempts,
      });
      last = { bytes, blob };

      if (!EXPORT_PDF_ENABLE_COMPRESSION || bytes <= PDF_MAX_BYTES) {
        emitProgress(options?.onProgress, {
          phase: 'done',
          percent: 100,
          message: '导出完成',
        });
        downloadBlob(blob, `chentao-${nowDateString()}.pdf`);
        return;
      }

      console.warn(
        `[export] pdf size ${(bytes / 1024 / 1024).toFixed(2)}MB > 5MB, ` +
          `retry with desiredPixelRatio=${desiredPixelRatio.toFixed(2)}, ` +
          `jpegQuality=${jpegQuality.toFixed(2)}`,
      );
    }

    if (last) {
      console.warn(
        `[export] pdf still > 5MB after retries: ` +
          `${(last.bytes / 1024 / 1024).toFixed(2)}MB`,
      );
      downloadBlob(last.blob, `chentao-${nowDateString()}.pdf`);
      emitProgress(options?.onProgress, {
        phase: 'done',
        percent: 100,
        message: '导出完成（已尽可能压缩）',
      });
    }
    return;
  }

  // 不要把整页内容一次性转成超长 PNG：会触发 canvas 上限导致“中间截断”。
  // 这里按 A4 比例切页，然后每页单独截图。
  const rootRect = el.getBoundingClientRect();
  const rootWidthCssPx = Math.max(1, rootRect.width);
  const totalHeightCssPx = Math.max(1, rootRect.height);

  const buildPdf = async (args: {
    desiredPixelRatio: number;
    jpegQuality: number;
    attempt: number;
    totalAttempts: number;
    slices: Array<{ offsetYCssPx: number; sliceHeightCssPx: number }>;
  }): Promise<{ pdf: jsPDF; bytes: number; blob: Blob }> => {
    const { desiredPixelRatio, jpegQuality, attempt, totalAttempts, slices } =
      args;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      // 尽可能压缩内部对象流。
      compress: EXPORT_PDF_ENABLE_COMPRESSION,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const marginMm = PDF_MARGIN_MM;
    const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);

    const pdfImageCompression = EXPORT_PDF_ENABLE_COMPRESSION ? 'FAST' : 'SLOW';

    emitProgress(options?.onProgress, {
      phase: 'compress',
      percent: 5,
      attempt,
      totalAttempts,
      message: `生成 PDF（压缩尝试 ${attempt}/${totalAttempts}）…`,
    });

    const fullPixelRatio = clampPixelRatioForSize({
      desired: desiredPixelRatio,
      widthCssPx: rootWidthCssPx,
      heightCssPx: totalHeightCssPx,
    });

    // 默认“按页渲染”（每页高度更小），清晰度更好。
    // 如果遇到极端浏览器兼容问题（如分片渲染为空白），会自动回退到“整页渲染 + 裁剪”。
    const shouldPreferPerSlice = true;

    // 默认路径：整页渲染一张大图，再按页裁剪。
    // 备注：历史上“临时 host/clone”分片截图可能在部分浏览器出现全白，这里保留整页裁剪作为兜底。
    let fullPngDataUrl: string | null = null;
    let fullImg: HTMLImageElement | null = null;
    let pxPerCssPx = 0;

    const renderSliceFromFull = async (sliceArgs: {
      offsetYCssPx: number;
      sliceHeightCssPx: number;
    }) => {
      if (!fullPngDataUrl || !fullImg) {
        throw new Error('full_image_not_ready');
      }
      const { offsetYCssPx, sliceHeightCssPx } = sliceArgs;

      const sx = 0;
      const sy = Math.max(0, Math.round(offsetYCssPx * pxPerCssPx));
      const sw = fullImg.naturalWidth;
      const sh = Math.max(1, Math.round(sliceHeightCssPx * pxPerCssPx));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = Math.min(sh, Math.max(1, fullImg.naturalHeight - sy));
      const ctx = canvas.getContext('2d');
      if (!ctx) return fullPngDataUrl;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        fullImg,
        sx,
        sy,
        sw,
        canvas.height,
        0,
        0,
        sw,
        canvas.height,
      );

      if (EXPORT_PDF_ENABLE_COMPRESSION) {
        return canvas.toDataURL('image/jpeg', jpegQuality);
      }
      return canvas.toDataURL('image/png');
    };

    const total = Math.max(1, slices.length);
    for (let pageIndex = 0; pageIndex < slices.length; pageIndex += 1) {
      const s = slices[pageIndex]!;

      // 5%~92% 用于渲染分页截图（占用时间最多）。
      const percent = Math.min(92, Math.max(6, 5 + (pageIndex / total) * 87));
      emitProgress(options?.onProgress, {
        phase: 'render',
        percent,
        current: pageIndex + 1,
        total,
        message: `渲染页面 ${pageIndex + 1}/${total}…`,
      });

      let sliceDataUrl: string;
      if (shouldPreferPerSlice) {
        try {
          const slicePixelRatio = clampPixelRatioForSize({
            desired: desiredPixelRatio,
            widthCssPx: rootWidthCssPx,
            heightCssPx: s.sliceHeightCssPx,
          });
          const slicePng = await renderElementSliceToPngDataUrlByWrappingPage({
            el,
            widthCssPx: rootWidthCssPx,
            offsetYCssPx: s.offsetYCssPx,
            sliceHeightCssPx: s.sliceHeightCssPx,
            pixelRatio: slicePixelRatio,
            fontEmbedCSS,
          });
          sliceDataUrl = EXPORT_PDF_ENABLE_COMPRESSION
            ? await convertPngDataUrlToJpegDataUrl({
                pngDataUrl: slicePng,
                jpegQuality,
              })
            : slicePng;
        } catch (err) {
          console.warn(
            '[export] per-slice render failed, fallback to full render/crop',
            err,
          );

          // fallback：整页渲染 + 裁剪
          if (!fullPngDataUrl || !fullImg) {
            const rendered = await renderPngWithRetry({
              el,
              widthCssPx: rootWidthCssPx,
              heightCssPx: totalHeightCssPx,
              initialPixelRatio: fullPixelRatio,
            });
            fullPngDataUrl = rendered.dataUrl;
            fullImg = await loadImage(fullPngDataUrl);
            pxPerCssPx = fullImg.naturalWidth / Math.max(1, rootWidthCssPx);
          }

          sliceDataUrl = await renderSliceFromFull({
            offsetYCssPx: s.offsetYCssPx,
            sliceHeightCssPx: s.sliceHeightCssPx,
          });
        }
      } else {
        sliceDataUrl = await renderSliceFromFull({
          offsetYCssPx: s.offsetYCssPx,
          sliceHeightCssPx: s.sliceHeightCssPx,
        });
      }

      // 按“DOM 真实尺寸”计算页面高度，避免由于 PNG 像素取整导致的页间缝隙/缺行。
      const sliceHeightMm =
        (s.sliceHeightCssPx / rootWidthCssPx) * contentWidthMm;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        sliceDataUrl,
        PDF_IMAGE_FORMAT,
        marginMm,
        marginMm,
        contentWidthMm,
        sliceHeightMm,
        undefined,
        pdfImageCompression,
      );
    }

    emitProgress(options?.onProgress, {
      phase: 'compress',
      percent: 94,
      attempt,
      totalAttempts,
      message: '生成文件…',
    });

    const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
    const bytes = arrayBuffer.byteLength;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    return { pdf, bytes, blob };
  };

  // 经验：2x 在部分屏幕/字体下会偏糊；不压缩时提高到更高像素比以换取清晰度。
  // 最终仍会被 clampPixelRatioForSize 限制，避免超过 canvas 上限。
  const baseDesiredRatio = EXPORT_PDF_ENABLE_COMPRESSION
    ? Math.min(2, getExportPixelRatio())
    : Math.min(5, Math.max(4, getExportPixelRatio()));
  const attempts: Array<{ desiredPixelRatio: number; jpegQuality: number }> =
    EXPORT_PDF_ENABLE_COMPRESSION
      ? [
          // 先保证清晰度，再逐步降质量/分辨率，确保体积 <= 5MB。
          {
            desiredPixelRatio: baseDesiredRatio,
            jpegQuality: PDF_JPEG_QUALITY,
          },
          { desiredPixelRatio: baseDesiredRatio, jpegQuality: 0.72 },
          {
            desiredPixelRatio: Math.min(baseDesiredRatio, 1.5),
            jpegQuality: 0.68,
          },
          {
            desiredPixelRatio: Math.min(baseDesiredRatio, 1.25),
            jpegQuality: 0.62,
          },
          { desiredPixelRatio: 1, jpegQuality: 0.58 },
        ]
      : [
          // 不压缩：单次生成（不做体积限制、也不降质重试）。
          { desiredPixelRatio: baseDesiredRatio, jpegQuality: 1 },
        ];

  // 预先计算分页切片（这样进度条能确定总页数，也避免不同压缩尝试之间页数变化）。
  const keepTogether = getKeepTogetherRangesCssPx(el);
  const slices: Array<{ offsetYCssPx: number; sliceHeightCssPx: number }> = [];
  {
    // 用第 1 次尝试的比例来确定分页高度（只影响“每页容纳多少内容”的尺度）。
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = PDF_MARGIN_MM;
    const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);
    const contentHeightMm = Math.max(1, pageHeightMm - marginMm * 2);
    const idealPageHeightCssPx =
      (contentHeightMm / contentWidthMm) * rootWidthCssPx;

    let offsetY = 0;
    while (offsetY < totalHeightCssPx - 0.5) {
      const idealSliceHeightCssPx = Math.min(
        idealPageHeightCssPx,
        totalHeightCssPx - offsetY,
      );
      const sliceHeightCssPx = Math.min(
        idealSliceHeightCssPx,
        chooseSliceHeightPx({
          offsetY,
          idealPageHeightPx: idealPageHeightCssPx,
          imgHeightPx: totalHeightCssPx,
          keepTogether,
        }),
      );
      if (sliceHeightCssPx <= 0.5) break;
      slices.push({ offsetYCssPx: offsetY, sliceHeightCssPx });
      offsetY += sliceHeightCssPx;
    }
  }

  let last: { bytes: number; blob: Blob } | null = null;
  for (let i = 0; i < attempts.length; i += 1) {
    const { desiredPixelRatio, jpegQuality } = attempts[i]!;
    const attempt = i + 1;
    const totalAttempts = attempts.length;
    const { bytes, blob } = await buildPdf({
      desiredPixelRatio,
      jpegQuality,
      attempt,
      totalAttempts,
      slices,
    });
    last = { bytes, blob };

    if (!EXPORT_PDF_ENABLE_COMPRESSION || bytes <= PDF_MAX_BYTES) {
      emitProgress(options?.onProgress, {
        phase: 'done',
        percent: 100,
        message: '导出完成',
      });
      downloadBlob(blob, `chentao-${nowDateString()}.pdf`);
      return;
    }

    console.warn(
      `[export] pdf size ${(bytes / 1024 / 1024).toFixed(2)}MB > 5MB, ` +
        `retry with desiredPixelRatio=${desiredPixelRatio.toFixed(2)}, ` +
        `jpegQuality=${jpegQuality.toFixed(2)}`,
    );
  }

  // 兜底：仍然下载最后一次（已经尽可能压缩），同时在控制台提示。
  if (last) {
    console.warn(
      `[export] pdf still > 5MB after retries: ` +
        `${(last.bytes / 1024 / 1024).toFixed(2)}MB`,
    );
    downloadBlob(last.blob, `chentao-${nowDateString()}.pdf`);
    emitProgress(options?.onProgress, {
      phase: 'done',
      percent: 100,
      message: '导出完成（已尽可能压缩）',
    });
  }
}
