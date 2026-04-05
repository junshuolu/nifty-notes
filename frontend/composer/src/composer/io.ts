/**
 * io.ts – Nifty Notes 2.0
 * PDF：乐谱 SVG → Canvas（canvg 栅格化）→ jsPDF 嵌入 PNG（分页）。
 *
 * 改进版：
 * 1. 优先基于 system 边界分页，而不是仅靠 cut points
 * 2. 分页线落在相邻 systems 空白区中点，减少“下一页碎片漏到上一页”
 * 3. 保留 top bleed + 轻量 bottom shrink + 白边遮罩，增强鲁棒性
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function bravuraFontUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}fonts/Bravura.ttf`, window.location.href).href
}

function injectBravuraForRasterExport(svg: SVGSVGElement) {
  const style = document.createElementNS(SVG_NS, 'style')
  style.setAttribute('type', 'text/css')
  const url = bravuraFontUrl()
  style.textContent =
    `@font-face{font-family:Bravura;src:url("${url}") format("truetype");font-weight:normal;font-style:normal;}`
  svg.insertBefore(style, svg.firstChild)
}

// ---------------------------------------------------------------------------
// PDF：SVG → Canvas（canvg）→ PNG → jsPDF
// ---------------------------------------------------------------------------

const PDF_PAGE_MARGIN_MM = 10
const PDF_SIDE_MARGIN_MM = 12
const RASTER_SCALE = Math.min(3, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2)

const PDF_SLICE_BLEED_TOP_SVG = 36
const PDF_SLICE_BOTTOM_SHRINK_SVG = 8
const PDF_SLICE_MIN_HEIGHT_FOR_SHRINK = 40
const PDF_BOTTOM_MASK_MM = 1.4

export type ExportPdfHeader = {
  title: string
  subtitle?: string
  composer?: string
  lyricist?: string
  arranger?: string
}

export type PdfSystemBound = {
  top: number
  bottom: number
}

function drawVectorScoreHeader(
  pdf: import('jspdf').jsPDF,
  header: ExportPdfHeader,
  sideMarginMm: number,
  startY: number,
): number {
  const pageW = pdf.internal.pageSize.getWidth()
  const cx = pageW / 2
  let y = startY + 2

  const title = (header.title || '').trim() || 'Untitled'
  pdf.setTextColor(17, 24, 39)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(20)
  pdf.text(title, cx, y, { align: 'center' })
  y += 9

  const sub = (header.subtitle || '').trim()
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  if (sub) {
    pdf.setTextColor(107, 114, 128)
    pdf.text(sub, cx, y, { align: 'center' })
    y += 6.5
  } else {
    y += 2
  }

  y += 3

  const colW = 40
  const colGap = 4.5
  const blockW = colW * 3 + colGap * 2
  const blockRight = pageW - sideMarginMm
  const blockLeft = blockRight - blockW

  const fields: { label: string; value: string; placeholder: string }[] = [
    { label: 'COMPOSER', value: (header.composer || '').trim(), placeholder: 'Composer' },
    { label: 'LYRICIST', value: (header.lyricist || '').trim(), placeholder: 'Lyricist' },
    { label: 'ARRANGER', value: (header.arranger || '').trim(), placeholder: 'Arranger' },
  ]

  const labelY = y
  const boxTop = y + 4.2
  const boxH = 7
  let colX = blockLeft

  for (const f of fields) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(6.5)
    pdf.setTextColor(100, 116, 139)
    pdf.text(f.label, colX, labelY)

    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.15)
    pdf.rect(colX, boxTop, colW, boxH, 'FD')

    const hasVal = f.value.length > 0
    const display = hasVal ? f.value : f.placeholder
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(hasVal ? 30 : 148, hasVal ? 41 : 163, hasVal ? 59 : 184)

    const lines = pdf.splitTextToSize(display, colW - 3)
    const lineH = 3.6
    let ty = boxTop + 4.8
    for (let i = 0; i < lines.length && i < 2; i++) {
      pdf.text(lines[i], colX + 1.5, ty)
      ty += lineH
    }

    colX += colW + colGap
  }

  pdf.setTextColor(0, 0, 0)
  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.2)

  const bottom = boxTop + boxH + 5
  return bottom - startY
}

function normalizeSystemBounds(bounds: PdfSystemBound[], svgH: number): PdfSystemBound[] {
  return bounds
    .map((b) => ({
      top: Math.max(0, Math.min(svgH, b.top)),
      bottom: Math.max(0, Math.min(svgH, b.bottom)),
    }))
    .filter((b) => b.bottom > b.top)
    .sort((a, b) => a.top - b.top)
}

function buildGapCutPointsFromSystems(bounds: PdfSystemBound[], svgH: number): number[] {
  if (bounds.length <= 1) return [svgH]

  const cuts: number[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const curr = bounds[i]
    const next = bounds[i + 1]

    if (next.top > curr.bottom) {
      cuts.push((curr.bottom + next.top) / 2)
    } else {
      cuts.push(curr.bottom)
    }
  }

  cuts.push(svgH)
  return [...new Set(cuts)].sort((a, b) => a - b)
}

function getBestCutPoint(startY: number, maxH: number, totalH: number, points: number[]): number {
  const target = Math.min(startY + maxH, totalH)
  let best = startY

  for (const p of points) {
    if (p > startY && p <= target && p > best) {
      best = p
    }
  }

  return best > startY ? best : target
}

/**
 * 优先按 system gap 断页：
 * 找到“不超过 target 的最后一个合法 gap 中点”。
 * 若没有，再回退到 cut points / target。
 */
function getBestCutPointBySystems(
  startY: number,
  maxH: number,
  totalH: number,
  systemBounds: PdfSystemBound[],
  fallbackPoints: number[],
): number {
  const target = Math.min(startY + maxH, totalH)
  let best = startY

  for (let i = 0; i < systemBounds.length - 1; i++) {
    const curr = systemBounds[i]
    const next = systemBounds[i + 1]

    if (curr.bottom <= startY) continue

    const gapTop = curr.bottom
    const gapBottom = next.top
    const cut = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : gapTop

    if (cut > startY && cut <= target && cut > best) {
      best = cut
    }
  }

  if (best > startY) return best
  return getBestCutPoint(startY, maxH, totalH, fallbackPoints)
}

async function renderSvgSliceToPng(
  source: SVGSVGElement,
  svgW: number,
  currentY: number,
  sliceH: number,
): Promise<string> {
  const { Canvg } = await import('canvg')

  const clone = source.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', SVG_NS)
  }

  clone.removeAttribute('style')
  clone.setAttribute('viewBox', `0 ${currentY} ${svgW} ${sliceH}`)
  clone.setAttribute('width', String(svgW))
  clone.setAttribute('height', String(sliceH))
  injectBravuraForRasterExport(clone)

  const svgText = new XMLSerializer().serializeToString(clone)
  const cw = Math.max(1, Math.floor(svgW * RASTER_SCALE))
  const ch = Math.max(1, Math.floor(sliceH * RASTER_SCALE))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cw, ch)

  const canvg = await Canvg.from(ctx, svgText, {
    ignoreMouse: true,
    ignoreAnimation: true,
    ignoreDimensions: true,
    scaleWidth: cw,
    scaleHeight: ch,
  })

  await canvg.render()

  try {
    return canvas.toDataURL('image/png')
  } catch {
    throw new Error('Canvas 导出被浏览器策略阻止（跨域资源）。请确保字体与页面同源。')
  }
}

export async function exportPDF(params: {
  scoreTitle: string
  overrideFilename?: string
  pdfSafeBreakYsSvg?: number[]
  pdfSystemBoundsSvg?: PdfSystemBound[]
  header?: ExportPdfHeader
  scoreSvgSelector?: string
}): Promise<void> {
  const {
    scoreTitle,
    overrideFilename,
    pdfSafeBreakYsSvg = [],
    pdfSystemBoundsSvg = [],
    header,
    scoreSvgSelector = '.score-surface svg',
  } = params

  const { jsPDF } = await import('jspdf')

  const svg = document.querySelector(scoreSvgSelector) as SVGSVGElement | null
  if (!svg) {
    throw new Error('未找到乐谱 SVG（.score-surface 内应有 VexFlow 生成的 svg）')
  }

  const vb = svg.viewBox?.baseVal
  const svgW = vb?.width ?? svg.clientWidth
  const svgH = vb?.height ?? svg.clientHeight

  if (svgW <= 0 || svgH <= 0) {
    throw new Error('SVG 尺寸无效')
  }

  const normalizedSystems = normalizeSystemBounds(pdfSystemBoundsSvg, svgH)

  const fallbackCutPoints = [
    ...new Set([
      ...pdfSafeBreakYsSvg.filter((y) => y > 0 && y < svgH),
      ...buildGapCutPointsFromSystems(normalizedSystems, svgH),
      svgH,
    ]),
  ].sort((a, b) => a - b)

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  const innerW = pdfW - PDF_SIDE_MARGIN_MM * 2
  const mmPerSvgUnit = innerW / svgW

  let currentY = 0
  let pageIndex = 0

  const headerBlockMm = header
    ? drawVectorScoreHeader(pdf, header, PDF_SIDE_MARGIN_MM, PDF_PAGE_MARGIN_MM)
    : 0
  const headerEndMm = PDF_PAGE_MARGIN_MM + headerBlockMm
  const gapAfterHeaderMm = 4

  while (currentY < svgH) {
    if (pageIndex > 0) {
      pdf.addPage()
    }

    const bodyTopMm =
      pageIndex === 0 ? headerEndMm + gapAfterHeaderMm : PDF_PAGE_MARGIN_MM

    const bodyBudgetMm = pdfH - PDF_PAGE_MARGIN_MM - bodyTopMm
    const bodyBudgetSvg = bodyBudgetMm / mmPerSvgUnit

    const endY =
      normalizedSystems.length > 0
        ? getBestCutPointBySystems(
            currentY,
            bodyBudgetSvg,
            svgH,
            normalizedSystems,
            fallbackCutPoints,
          )
        : getBestCutPoint(currentY, bodyBudgetSvg, svgH, fallbackCutPoints)

    const sliceH = endY - currentY
    if (sliceH <= 0) break

    const isLastPage = endY >= svgH
    const topBleed = currentY > 0 ? PDF_SLICE_BLEED_TOP_SVG : 0
    const viewY = Math.max(0, currentY - topBleed)

    const bottomShrink =
      !isLastPage && sliceH >= PDF_SLICE_MIN_HEIGHT_FOR_SHRINK
        ? PDF_SLICE_BOTTOM_SHRINK_SVG
        : 0

    const renderEndY = endY - bottomShrink
    const viewH = Math.min(svgH - viewY, renderEndY - viewY)
    if (viewH <= 0) break

    const renderMmH = viewH * mmPerSvgUnit
    const drawYMm = bodyTopMm

    const pngDataUrl = await renderSvgSliceToPng(svg, svgW, viewY, viewH)

    pdf.addImage(
      pngDataUrl,
      'PNG',
      PDF_SIDE_MARGIN_MM,
      drawYMm,
      innerW,
      renderMmH,
      undefined,
      'FAST',
    )

    if (!isLastPage) {
      pdf.setFillColor(255, 255, 255)
      pdf.rect(
        PDF_SIDE_MARGIN_MM,
        drawYMm + renderMmH - PDF_BOTTOM_MASK_MM / 2,
        innerW,
        PDF_BOTTOM_MASK_MM,
        'F',
      )
    }

    currentY = endY
    pageIndex += 1
  }

  const safeName = (overrideFilename || scoreTitle || 'score')
    .replace(/[^a-zA-Z0-9_\- ]/g, '_')
    .trim()

  pdf.save(`${safeName}.pdf`)
}