import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const PDF_MARGIN_MM = 10;

// 经验值：部分浏览器/设备的 canvas 单边上限接近 16384px。
// 一旦超出，`html-to-image` 生成的图片会被“静默截断”，表现为导出的 PDF 中间/后半段内容缺失。
const MAX_CANVAS_SIDE_PX = 16384;

const PDF_IMAGE_FORMAT = 'JPEG' as const;
const PDF_JPEG_QUALITY = 0.82;

// 需求：导出的 PDF 文件体积控制在 5MB 以内。
const PDF_MAX_BYTES = 5 * 1024 * 1024;

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
) => {
  return await toPng(el, {
    backgroundColor: '#ffffff',
    pixelRatio,
    cacheBust: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !isHiddenForExport(node);
    },
  });
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

  let pixelRatio = args.initialPixelRatio;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const dataUrl = await renderElementToPngDataUrl(el, pixelRatio);
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

  const dataUrl = await renderElementToPngDataUrl(el, pixelRatio);
  return { dataUrl, pixelRatio };
};

type KeepTogetherRangePx = {
  topPx: number;
  bottomPx: number;
};

const getKeepTogetherRangesCssPx = (
  root: HTMLElement,
): KeepTogetherRangePx[] => {
  const rootRect = root.getBoundingClientRect();
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-export-keep-together="true"]'),
  );

  return nodes
    .map((node) => {
      const r = node.getBoundingClientRect();
      const top = Math.max(0, r.top - rootRect.top);
      const bottom = Math.max(top, r.bottom - rootRect.top);
      return { topPx: top, bottomPx: bottom };
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
  const minSlice = Math.floor(idealPageHeightPx * 0.35);
  // 太小的话宁愿拆分，也不要生成几乎空白的一页
  if (sliceHeight < minSlice) return idealPageHeightPx;
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

const pngDataUrlToJpegDataUrl = async (pngDataUrl: string, quality: number) => {
  const img = await loadImage(pngDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return pngDataUrl;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
};

export async function exportElementToPdf(el: HTMLElement) {
  await prepareForExport(el);

  // 不要把整页内容一次性转成超长 PNG：会触发 canvas 上限导致“中间截断”。
  // 这里按 A4 比例切页，然后每页单独截图。
  const rootRect = el.getBoundingClientRect();
  const rootWidthCssPx = Math.max(1, rootRect.width);
  const totalHeightCssPx = Math.max(1, rootRect.height);

  const buildPdf = async (args: {
    desiredPixelRatio: number;
    jpegQuality: number;
  }): Promise<{ pdf: jsPDF; bytes: number; blob: Blob }> => {
    const { desiredPixelRatio, jpegQuality } = args;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      // 尽可能压缩内部对象流。
      compress: true,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    const marginMm = PDF_MARGIN_MM;
    const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);
    const contentHeightMm = Math.max(1, pageHeightMm - marginMm * 2);

    const idealPageHeightCssPx =
      (contentHeightMm / contentWidthMm) * rootWidthCssPx;

    // 每页截图高度有限，但仍需保证不超 canvas 上限。
    const pixelRatio = clampPixelRatioForSize({
      desired: desiredPixelRatio,
      widthCssPx: rootWidthCssPx,
      heightCssPx: idealPageHeightCssPx,
    });

    const keepTogether = getKeepTogetherRangesCssPx(el);

    const renderSlice = async (sliceArgs: {
      offsetYCssPx: number;
      sliceHeightCssPx: number;
    }) => {
      const { offsetYCssPx, sliceHeightCssPx } = sliceArgs;

      const host = document.createElement('div');
      host.style.position = 'fixed';
      // 注意：不能用 opacity:0/visibility:hidden，否则 html-to-image 会把结果渲染成透明/空白。
      // 同时也不要把被截图节点本身挪到屏幕外（left:-100000px），否则在 foreignObject 中可能被裁掉，导致空白页。
      host.style.left = '0';
      host.style.top = '0';
      // 避免遮挡用户视图，但也不要把节点挪到极端的负坐标（某些浏览器/实现会导致截图为空白）。
      host.style.transform = 'translateX(-200vw)';
      host.style.width = `${rootWidthCssPx}px`;
      host.style.height = `${sliceHeightCssPx}px`;
      host.style.overflow = 'hidden';
      host.style.background = '#ffffff';
      host.style.pointerEvents = 'none';
      host.style.display = 'block';

      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.style.transform = `translateY(-${offsetYCssPx}px)`;
      cloned.style.transformOrigin = 'top left';
      cloned.style.width = `${rootWidthCssPx}px`;

      host.appendChild(cloned);
      document.body.appendChild(host);
      try {
        // clone 内的图片需要重新加载；不等资源就绪可能会截图成空白。
        await prepareForExport(host);
        const result = await renderPngWithRetry({
          el: host,
          widthCssPx: rootWidthCssPx,
          heightCssPx: sliceHeightCssPx,
          initialPixelRatio: pixelRatio,
        });
        return result.dataUrl;
      } finally {
        document.body.removeChild(host);
      }
    };

    let offsetY = 0;
    let pageIndex = 0;
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

      const slicePngDataUrl = await renderSlice({
        offsetYCssPx: offsetY,
        sliceHeightCssPx,
      });

      // PDF 用 JPEG 会比 PNG 小很多。
      const sliceDataUrl =
        PDF_IMAGE_FORMAT === 'JPEG'
          ? await pngDataUrlToJpegDataUrl(slicePngDataUrl, jpegQuality)
          : slicePngDataUrl;

      // 按“DOM 真实尺寸”计算页面高度，避免由于 PNG 像素取整导致的页间缝隙/缺行。
      const sliceHeightMm =
        (sliceHeightCssPx / rootWidthCssPx) * contentWidthMm;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        sliceDataUrl,
        PDF_IMAGE_FORMAT,
        marginMm,
        marginMm,
        contentWidthMm,
        sliceHeightMm,
        undefined,
        'FAST',
      );

      offsetY += sliceHeightCssPx;
      pageIndex += 1;
    }

    const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
    const bytes = arrayBuffer.byteLength;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    return { pdf, bytes, blob };
  };

  // 先保证清晰度，再逐步降质量/分辨率，确保体积 <= 5MB。
  const baseDesiredRatio = Math.min(2, getExportPixelRatio());
  const attempts: Array<{ desiredPixelRatio: number; jpegQuality: number }> = [
    { desiredPixelRatio: baseDesiredRatio, jpegQuality: PDF_JPEG_QUALITY },
    { desiredPixelRatio: baseDesiredRatio, jpegQuality: 0.72 },
    { desiredPixelRatio: Math.min(baseDesiredRatio, 1.5), jpegQuality: 0.68 },
    { desiredPixelRatio: Math.min(baseDesiredRatio, 1.25), jpegQuality: 0.62 },
    { desiredPixelRatio: 1, jpegQuality: 0.58 },
  ];

  let last: { bytes: number; blob: Blob } | null = null;
  for (let i = 0; i < attempts.length; i += 1) {
    const { desiredPixelRatio, jpegQuality } = attempts[i]!;
    const { bytes, blob } = await buildPdf({ desiredPixelRatio, jpegQuality });
    last = { bytes, blob };

    if (bytes <= PDF_MAX_BYTES) {
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
  }
}
