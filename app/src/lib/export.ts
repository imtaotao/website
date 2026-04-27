import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

const EXPORT_PADDING_CSS_PX = 24;
const PDF_MARGIN_MM = 10;

// 经验值：部分浏览器/设备的 canvas 单边上限接近 16384px。
// 一旦超出，`html-to-image` 生成的图片会被“静默截断”，表现为导出的 PDF 中间/后半段内容缺失。
const MAX_CANVAS_SIDE_PX = 16384;

const PDF_IMAGE_FORMAT = 'JPEG' as const;
const PDF_JPEG_QUALITY = 0.82;

const downloadDataUrl = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
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

export async function exportElementToJpg(el: HTMLElement) {
  const desiredRatio = getExportPixelRatio();
  const rect = el.getBoundingClientRect();
  const pixelRatio = clampPixelRatioForSize({
    desired: desiredRatio,
    widthCssPx: rect.width,
    heightCssPx: rect.height,
  });
  if (pixelRatio < desiredRatio) {
    // 避免触发 canvas 上限导致“静默截断”
    console.warn(
      `[export] clamp pixelRatio ${desiredRatio.toFixed(2)} -> ` +
        `${pixelRatio.toFixed(2)} to avoid canvas truncation`,
    );
  }
  await prepareForExport(el);

  // Export as PNG first, then add padding and encode as JPG.
  const { dataUrl: pngDataUrl } = await renderPngWithRetry({
    el,
    widthCssPx: rect.width,
    heightCssPx: rect.height,
    initialPixelRatio: pixelRatio,
  });
  const img = await loadImage(pngDataUrl);

  const paddingPx = Math.round(EXPORT_PADDING_CSS_PX * pixelRatio);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth + paddingPx * 2;
  canvas.height = img.naturalHeight + paddingPx * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, paddingPx, paddingPx);

  const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  downloadDataUrl(jpgDataUrl, `chentao-${nowDateString()}.jpg`);
}

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

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();

  const marginMm = PDF_MARGIN_MM;
  const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);
  const contentHeightMm = Math.max(1, pageHeightMm - marginMm * 2);

  // 不要把整页内容一次性转成超长 PNG：会触发 canvas 上限导致“中间截断”。
  // 这里按 A4 比例切页，然后每页单独截图。
  const rootRect = el.getBoundingClientRect();
  const rootWidthCssPx = Math.max(1, rootRect.width);
  const totalHeightCssPx = Math.max(1, rootRect.height);

  const idealPageHeightCssPx =
    (contentHeightMm / contentWidthMm) * rootWidthCssPx;

  // PDF 更关注文件体积与可读性：像素比过高会导致体积暴涨。
  const desiredRatio = Math.min(2, getExportPixelRatio());
  // 每页截图高度有限，像素比可尽量高，但仍需保证不超 canvas 上限。
  const pixelRatio = clampPixelRatioForSize({
    desired: desiredRatio,
    widthCssPx: rootWidthCssPx,
    heightCssPx: idealPageHeightCssPx,
  });
  if (pixelRatio < desiredRatio) {
    console.warn(
      `[export] clamp pixelRatio ${desiredRatio.toFixed(
        2,
      )} -> ${pixelRatio.toFixed(2)} to avoid canvas truncation`,
    );
  }

  const keepTogether = getKeepTogetherRangesCssPx(el);

  const renderSlice = async (args: {
    offsetYCssPx: number;
    sliceHeightCssPx: number;
  }) => {
    const { offsetYCssPx, sliceHeightCssPx } = args;

    const host = document.createElement('div');
    host.style.position = 'fixed';
    // 注意：不能用 opacity:0/visibility:hidden，否则 html-to-image 会把结果渲染成透明/空白。
    // 放到屏幕外即可，不影响用户视图。
    host.style.left = '-100000px';
    host.style.top = '0';
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

    // PDF 用 JPEG 会比 PNG 小很多，基本可以稳定压到 5MB 内。
    const sliceDataUrl =
      PDF_IMAGE_FORMAT === 'JPEG'
        ? await pngDataUrlToJpegDataUrl(slicePngDataUrl, PDF_JPEG_QUALITY)
        : slicePngDataUrl;

    // 按“DOM 真实尺寸”计算页面高度，避免由于 PNG 像素取整导致的页间缝隙/缺行。
    const sliceHeightMm = (sliceHeightCssPx / rootWidthCssPx) * contentWidthMm;

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

  pdf.save(`chentao-${nowDateString()}.pdf`);
}
