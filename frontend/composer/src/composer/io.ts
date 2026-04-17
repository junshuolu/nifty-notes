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
const XLINK_NS = 'http://www.w3.org/1999/xlink'

let bravuraFontDataUrlPromise: Promise<string> | null = null

function bravuraFontUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}fonts/Bravura.ttf`, window.location.href).href
}

async function getBravuraFontDataUrl(): Promise<string> {
  if (!bravuraFontDataUrlPromise) {
    bravuraFontDataUrlPromise = (async () => {
      const response = await fetch(bravuraFontUrl())
      if (!response.ok) {
        throw new Error('Failed to load Bravura font for PDF export.')
      }

      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Failed to read Bravura font for PDF export.'))
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
            return
          }
          reject(new Error('Bravura font data could not be converted for PDF export.'))
        }
        reader.readAsDataURL(blob)
      })
    })()
  }

  return await bravuraFontDataUrlPromise
}

async function ensureMusicFontsReady() {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return
  }

  try {
    await Promise.allSettled([
      document.fonts.load('16px Bravura'),
      document.fonts.ready,
    ])
  } catch {
    // Best effort only; the inline font-face below is the primary fallback.
  }
}

async function injectBravuraForRasterExport(svg: SVGSVGElement) {
  const style = document.createElementNS(SVG_NS, 'style')
  style.setAttribute('type', 'text/css')
  const url = await getBravuraFontDataUrl()
  style.textContent =
    `@font-face{font-family:Bravura;src:url("${url}") format("truetype");font-weight:normal;font-style:normal;}`
  svg.insertBefore(style, svg.firstChild)
}

// ---------------------------------------------------------------------------
// PDF：SVG → Canvas（canvg）→ PNG → jsPDF
// ---------------------------------------------------------------------------

const PDF_PAGE_MARGIN_MM = 10
const PDF_SIDE_MARGIN_MM = 12
const PDF_TARGET_DPI = 220
const PDF_MAX_RASTER_SCALE = 6
const PDF_MAX_CANVAS_DIMENSION_PX = 8192
const PDF_MAX_CANVAS_AREA_PX = 24_000_000
const PDF_EXPORT_HORIZONTAL_PAD_SVG = 96

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
  svgX: number,
  svgW: number,
  currentY: number,
  sliceH: number,
  outputMmW: number,
  outputMmH: number,
): Promise<string> {
  const { Canvg } = await import('canvg')

  const sourceClone = source.cloneNode(true) as SVGSVGElement
  const clone = document.createElementNS(SVG_NS, 'svg')
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('xmlns:xlink', XLINK_NS)
  clone.setAttribute('viewBox', `0 0 ${svgW} ${sliceH}`)
  clone.setAttribute('width', String(svgW))
  clone.setAttribute('height', String(sliceH))
  clone.setAttribute('overflow', 'visible')

  const defsNodes: Node[] = []
  const contentGroup = document.createElementNS(SVG_NS, 'g')
  contentGroup.setAttribute('transform', `translate(${-svgX} ${-currentY})`)

  for (const child of Array.from(sourceClone.childNodes)) {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName.toLowerCase() === 'defs'
    ) {
      defsNodes.push(child)
      continue
    }

    contentGroup.appendChild(child)
  }

  for (const defsNode of defsNodes) {
    clone.appendChild(defsNode)
  }

  clone.appendChild(contentGroup)
  await ensureMusicFontsReady()
  await injectBravuraForRasterExport(clone)

  const svgText = new XMLSerializer().serializeToString(clone)
  const deviceScale =
    typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1
  const targetPxW = Math.max(1, Math.round((outputMmW / 25.4) * PDF_TARGET_DPI))
  const targetPxH = Math.max(1, Math.round((outputMmH / 25.4) * PDF_TARGET_DPI))
  const dpiScale = Math.max(targetPxW / svgW, targetPxH / sliceH)
  const preferredScale = Math.max(deviceScale, dpiScale)
  const dimensionScaleLimit =
    Math.min(PDF_MAX_CANVAS_DIMENSION_PX / svgW, PDF_MAX_CANVAS_DIMENSION_PX / sliceH)
  const areaScaleLimit = Math.sqrt(PDF_MAX_CANVAS_AREA_PX / (svgW * sliceH))
  const rasterScale = Math.max(
    1,
    Math.min(PDF_MAX_RASTER_SCALE, preferredScale, dimensionScaleLimit, areaScaleLimit),
  )

  const cw = Math.max(1, Math.floor(svgW * rasterScale))
  const ch = Math.max(1, Math.floor(sliceH * rasterScale))

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

async function buildPdfDocument(params: {
  scoreTitle: string
  overrideFilename?: string
  pdfSafeBreakYsSvg?: number[]
  pdfSystemBoundsSvg?: PdfSystemBound[]
  header?: ExportPdfHeader
  scoreSvgSelector?: string
}): Promise<{ pdf: import('jspdf').jsPDF; safeName: string }> {
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
  const baseX = vb?.x ?? 0
  const svgW = vb?.width ?? svg.clientWidth
  const svgH = vb?.height ?? svg.clientHeight

  if (svgW <= 0 || svgH <= 0) {
    throw new Error('SVG 尺寸无效')
  }

  let contentX = baseX
  let contentW = svgW
  try {
    const bbox = svg.getBBox()
    if (Number.isFinite(bbox.x) && Number.isFinite(bbox.width) && bbox.width > 0) {
      const bboxLeft = bbox.x - PDF_EXPORT_HORIZONTAL_PAD_SVG
      const bboxRight = bbox.x + bbox.width + PDF_EXPORT_HORIZONTAL_PAD_SVG
      const baseRight = baseX + svgW + PDF_EXPORT_HORIZONTAL_PAD_SVG
      contentX = Math.min(baseX - PDF_EXPORT_HORIZONTAL_PAD_SVG, bboxLeft)
      contentW = Math.max(baseRight, bboxRight) - contentX
    }
  } catch {
    contentX = baseX
    contentW = svgW
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
  const mmPerSvgUnit = innerW / contentW

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

    const pngDataUrl = await renderSvgSliceToPng(
      svg,
      contentX,
      contentW,
      viewY,
      viewH,
      innerW,
      renderMmH,
    )

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

  return { pdf, safeName }
}

export async function exportPDF(params: {
  scoreTitle: string
  overrideFilename?: string
  pdfSafeBreakYsSvg?: number[]
  pdfSystemBoundsSvg?: PdfSystemBound[]
  header?: ExportPdfHeader
  scoreSvgSelector?: string
}): Promise<void> {
  const { pdf, safeName } = await buildPdfDocument(params)
  pdf.save(`${safeName}.pdf`)
}

export async function exportPDFToDataUri(params: {
  scoreTitle: string
  overrideFilename?: string
  pdfSafeBreakYsSvg?: number[]
  pdfSystemBoundsSvg?: PdfSystemBound[]
  header?: ExportPdfHeader
  scoreSvgSelector?: string
}): Promise<{ dataUri: string; filename: string }> {
  const { pdf, safeName } = await buildPdfDocument(params)
  return {
    dataUri: pdf.output('datauristring'),
    filename: `${safeName}.pdf`,
  }
}

export type MusicXmlScoreSlur = {
  fromNoteId: string
  id?: string
  staffId: StaffId
  toNoteId: string
}

export type MusicXmlScorePayload = {
  keySignature: KeySignatureSpec
  measures: MeasureData[]
  scoreArranger: string
  scoreComposer: string
  scoreLyricist: string
  scoreSubtitle: string
  scoreTitle: string
  slurs: MusicXmlScoreSlur[]
  tempoBpm: number
  timeSignature: TimeSignature
  timeSignatureGrouping: number[] | null
  warnings?: string[]
}

const MUSICXML_DIVISIONS = 8
const MUSICXML_TYPE_BY_DURATION: Record<BaseDuration, string> = {
  '8': 'eighth',
  '16': '16th',
  '32': '32nd',
  h: 'half',
  q: 'quarter',
  w: 'whole',
}

const MUSICXML_DURATION_CHOICES: Array<{
  baseDuration: BaseDuration
  dots: 0 | 1
  subdivisions: number
}> = [
  { baseDuration: 'w', dots: 1, subdivisions: 48 },
  { baseDuration: 'w', dots: 0, subdivisions: 32 },
  { baseDuration: 'h', dots: 1, subdivisions: 24 },
  { baseDuration: 'h', dots: 0, subdivisions: 16 },
  { baseDuration: 'q', dots: 1, subdivisions: 12 },
  { baseDuration: 'q', dots: 0, subdivisions: 8 },
  { baseDuration: '8', dots: 1, subdivisions: 6 },
  { baseDuration: '8', dots: 0, subdivisions: 4 },
  { baseDuration: '16', dots: 1, subdivisions: 3 },
  { baseDuration: '16', dots: 0, subdivisions: 2 },
  { baseDuration: '32', dots: 0, subdivisions: 1 },
]

const KEY_SIGNATURE_TO_FIFTHS: Record<KeySignatureSpec, number> = {
  A: 3,
  Ab: -4,
  B: 5,
  Bb: -2,
  C: 0,
  'C#': 7,
  Cb: -7,
  D: 2,
  Db: -5,
  E: 4,
  Eb: -3,
  F: -1,
  'F#': 6,
  Gb: -6,
  G: 1,
}

const ARTICULATION_TO_MUSICXML: Partial<Record<ArticulationType, string>> = {
  accent: 'accent',
  marcato: 'strong-accent type="up"',
  portato: 'detached-legato',
  staccatissimo: 'staccatissimo',
  staccato: 'staccato',
  tenuto: 'tenuto',
}

const ORNAMENT_TO_MUSICXML: Partial<Record<OrnamentType, string>> = {
  mordent: 'mordent',
  mordentInverted: 'inverted-mordent',
  trill: 'trill-mark',
  turn: 'turn',
  turnInverted: 'inverted-turn',
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(filename, blob)
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function getSafeScoreFilename(name: string, fallbackExtension: string): string {
  const safeName = name.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u4e00-\u9fff ]/g, '_').trim() || 'score'
  return `${safeName}.${fallbackExtension}`
}

function parseDownloadFilename(contentDisposition: string | null, fallbackFilename: string): string {
  if (!contentDisposition) {
    return fallbackFilename
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition)
  return plainMatch?.[1] ?? fallbackFilename
}

async function parseErrorResponse(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      return payload.error
    }
  } catch {
    // ignore invalid JSON error responses
  }

  return fallbackMessage
}

async function downloadResponseFile(response: Response, fallbackFilename: string) {
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, 'File export failed.'))
  }

  const filename = parseDownloadFilename(
    response.headers.get('Content-Disposition'),
    fallbackFilename,
  )
  const blob = await response.blob()
  downloadBlob(filename, blob)
}

function splitSubdivisions(subdivisions: number): Array<{ baseDuration: BaseDuration; dots: 0 | 1 }> {
  let remaining = subdivisions
  const chunks: Array<{ baseDuration: BaseDuration; dots: 0 | 1 }> = []

  for (const choice of MUSICXML_DURATION_CHOICES) {
    while (remaining >= choice.subdivisions) {
      chunks.push({ baseDuration: choice.baseDuration, dots: choice.dots })
      remaining -= choice.subdivisions
    }
  }

  if (remaining !== 0) {
    throw new Error(`Cannot encode a ${subdivisions}-subdivision span as MusicXML with the current duration set.`)
  }

  return chunks
}

function getGroupBoundaryAfter(
  subdivision: number,
  groupSubdivisionLengths: number[],
  measureSubdivisions: number,
): number {
  let cursor = 0

  for (const groupLength of groupSubdivisionLengths) {
    cursor += groupLength
    if (subdivision < cursor) {
      return cursor
    }
  }

  return measureSubdivisions
}

function splitSubdivisionsByGroups(
  startSubdivision: number,
  totalSubdivisions: number,
  groupSubdivisionLengths: number[],
  measureSubdivisions: number,
): Array<{ baseDuration: BaseDuration; dots: 0 | 1 }> {
  if (totalSubdivisions <= 0) {
    return []
  }

  const chunks: Array<{ baseDuration: BaseDuration; dots: 0 | 1 }> = []
  let cursor = startSubdivision
  let remaining = totalSubdivisions

  while (remaining > 0) {
    const nextBoundary = getGroupBoundaryAfter(
      cursor,
      groupSubdivisionLengths,
      measureSubdivisions,
    )
    const segmentLength = Math.min(remaining, nextBoundary - cursor)
    chunks.push(...splitSubdivisions(segmentLength))
    cursor += segmentLength
    remaining -= segmentLength
  }

  return chunks
}

function buildTieStopMap(
  measures: MeasureData[],
  timeSignature: TimeSignature,
  keySignature: KeySignatureSpec,
) {
  const stopTargets = new Set<string>()
  const subdivisionsPerMeasure = parseTimeSignature(timeSignature).subdivisionsPerMeasure

  measures.forEach((measure, measureIndex) => {
    STAFF_IDS.forEach((staffId) => {
      getItemsForStaff(measure, staffId).forEach((item) => {
        if (item.kind !== 'note' || !item.tieToNext) {
          return
        }

        const next = findNextContiguousItem(
          measures,
          measureIndex,
          staffId,
          item,
          subdivisionsPerMeasure,
        )

        if (
          next?.item.kind === 'note' &&
          haveSameNotePitches(item, next.item, keySignature)
        ) {
          stopTargets.add(next.item.id)
        }
      })
    })
  })

  return stopTargets
}

function buildSlurMaps(slurs: MusicXmlScoreSlur[]) {
  const startMap = new Map<string, number[]>()
  const stopMap = new Map<string, number[]>()

  slurs.forEach((slur, index) => {
    const number = (index % 6) + 1
    startMap.set(slur.fromNoteId, [...(startMap.get(slur.fromNoteId) ?? []), number])
    stopMap.set(slur.toNoteId, [...(stopMap.get(slur.toNoteId) ?? []), number])
  })

  return { startMap, stopMap }
}

function getAccidentalTag(
  pitch: string,
  accidental: AccidentalType | undefined,
  keySignature: KeySignatureSpec,
): string | null {
  const displayAccidental = getDisplayAccidentalForPitch(
    pitch,
    accidental ?? null,
    keySignature,
  )

  if (displayAccidental === '##') return 'double-sharp'
  if (displayAccidental === '#') return 'sharp'
  if (displayAccidental === 'bb') return 'flat-flat'
  if (displayAccidental === 'b') return 'flat'
  if (displayAccidental === 'n') return 'natural'
  return null
}

function pushTempoDirection(lines: string[], bpm: number) {
  lines.push('      <direction placement="above">')
  lines.push('        <direction-type>')
  lines.push('          <metronome>')
  lines.push('            <beat-unit>quarter</beat-unit>')
  lines.push(`            <per-minute>${Math.round(bpm)}</per-minute>`)
  lines.push('          </metronome>')
  lines.push('        </direction-type>')
  lines.push(`        <sound tempo="${Math.round(bpm)}"/>`)
  lines.push('        <staff>1</staff>')
  lines.push('      </direction>')
}

function pushDynamicDirection(lines: string[], dynamic: DynamicType, staffNumber: 1 | 2) {
  lines.push('      <direction placement="below">')
  lines.push('        <direction-type>')
  lines.push('          <dynamics>')
  lines.push(`            <${dynamic}/>`)
  lines.push('          </dynamics>')
  lines.push('        </direction-type>')
  lines.push(`        <staff>${staffNumber}</staff>`)
  lines.push('      </direction>')
}

function pushRestNote(
  lines: string[],
  baseDuration: BaseDuration,
  dots: 0 | 1,
  staffNumber: 1 | 2,
) {
  lines.push('      <note>')
  lines.push('        <rest/>')
  lines.push(`        <duration>${getItemSubdivisions({ baseDuration, dots, id: 'rest', kind: 'rest', start: 0 })}</duration>`)
  lines.push('        <voice>1</voice>')
  lines.push(`        <type>${MUSICXML_TYPE_BY_DURATION[baseDuration]}</type>`)
  if (dots === 1) {
    lines.push('        <dot/>')
  }
  lines.push(`        <staff>${staffNumber}</staff>`)
  lines.push('      </note>')
}

function pushNoteItem(
  lines: string[],
  item: NoteItem,
  staffNumber: 1 | 2,
  tieStops: Set<string>,
  slurStarts: Map<string, number[]>,
  slurStops: Map<string, number[]>,
  keySignature: KeySignatureSpec,
) {
  const tieStop = tieStops.has(item.id)
  const slurStartNumbers = slurStarts.get(item.id) ?? []
  const slurStopNumbers = slurStops.get(item.id) ?? []
  const articulationTag = item.articulation ? ARTICULATION_TO_MUSICXML[item.articulation] : null
  const ornamentTag = item.ornament ? ORNAMENT_TO_MUSICXML[item.ornament] : null

  item.pitches.forEach((pitch, index) => {
    const { letter, octave } = parsePitchToken(pitch)
    const effectiveAlter = getEffectiveAlterForPitch(
      pitch,
      item.accidentals?.[pitch],
      keySignature,
    )
    const accidentalTag = getAccidentalTag(
      pitch,
      item.accidentals?.[pitch],
      keySignature,
    )

    lines.push('      <note>')
    if (index > 0) {
      lines.push('        <chord/>')
    }
    lines.push('        <pitch>')
    lines.push(`          <step>${letter.toUpperCase()}</step>`)
    if (effectiveAlter !== 0) {
      lines.push(`          <alter>${effectiveAlter}</alter>`)
    }
    lines.push(`          <octave>${octave}</octave>`)
    lines.push('        </pitch>')
    lines.push(`        <duration>${getItemSubdivisions(item)}</duration>`)
    lines.push('        <voice>1</voice>')
    lines.push(`        <type>${MUSICXML_TYPE_BY_DURATION[item.baseDuration]}</type>`)
    if (item.dots === 1) {
      lines.push('        <dot/>')
    }
    if (tieStop) {
      lines.push('        <tie type="stop"/>')
    }
    if (item.tieToNext) {
      lines.push('        <tie type="start"/>')
    }
    if (accidentalTag) {
      lines.push(`        <accidental>${accidentalTag}</accidental>`)
    }
    lines.push(`        <staff>${staffNumber}</staff>`)

    if (index === 0 && item.lyrics) {
      lines.push('        <lyric>')
      lines.push(`          <text>${escapeXml(item.lyrics)}</text>`)
      lines.push('        </lyric>')
    }

    const hasNotations =
      tieStop ||
      item.tieToNext ||
      slurStartNumbers.length > 0 ||
      slurStopNumbers.length > 0 ||
      Boolean(articulationTag) ||
      Boolean(ornamentTag)

    if (hasNotations) {
      lines.push('        <notations>')
      if (tieStop) {
        lines.push('          <tied type="stop"/>')
      }
      if (item.tieToNext) {
        lines.push('          <tied type="start"/>')
      }
      slurStopNumbers.forEach((number) => {
        lines.push(`          <slur type="stop" number="${number}"/>`)
      })
      slurStartNumbers.forEach((number) => {
        lines.push(`          <slur type="start" number="${number}"/>`)
      })
      if (articulationTag) {
        lines.push('          <articulations>')
        if (articulationTag.includes(' ')) {
          const [tagName, attrs] = articulationTag.split(' ', 2)
          lines.push(`            <${tagName} ${attrs}/>`)
        } else {
          lines.push(`            <${articulationTag}/>`)
        }
        lines.push('          </articulations>')
      }
      if (ornamentTag) {
        lines.push('          <ornaments>')
        lines.push(`            <${ornamentTag}/>`)
        lines.push('          </ornaments>')
      }
      lines.push('        </notations>')
    }

    lines.push('      </note>')
  })
}

function pushStaffContents(
  lines: string[],
  measure: MeasureData,
  staffId: StaffId,
  measureSubdivisions: number,
  groupSubdivisionLengths: number[],
  tieStops: Set<string>,
  slurStarts: Map<string, number[]>,
  slurStops: Map<string, number[]>,
  keySignature: KeySignatureSpec,
) {
  const staffNumber = staffId === 'treble' ? 1 : 2
  const items = [...getItemsForStaff(measure, staffId)].sort((left, right) => left.start - right.start)
  let cursor = 0

  for (const item of items) {
    if (item.start > cursor) {
      const padding = splitSubdivisionsByGroups(
        cursor,
        item.start - cursor,
        groupSubdivisionLengths,
        measureSubdivisions,
      )
      padding.forEach((chunk) => pushRestNote(lines, chunk.baseDuration, chunk.dots, staffNumber))
      cursor = item.start
    }

    if (item.kind === 'note' && item.dynamic) {
      pushDynamicDirection(lines, item.dynamic, staffNumber)
    }

    if (item.kind === 'note') {
      pushNoteItem(lines, item, staffNumber, tieStops, slurStarts, slurStops, keySignature)
    } else {
      pushRestNote(lines, item.baseDuration, item.dots, staffNumber)
    }
    cursor = item.start + getItemSubdivisions(item)
  }

  if (cursor < measureSubdivisions) {
    splitSubdivisionsByGroups(
      cursor,
      measureSubdivisions - cursor,
      groupSubdivisionLengths,
      measureSubdivisions,
    ).forEach((chunk) => pushRestNote(lines, chunk.baseDuration, chunk.dots, staffNumber))
  }
}

function buildMusicXmlDocument(payload: MusicXmlScorePayload): string {
  const { measures, keySignature, scoreArranger, scoreComposer, scoreLyricist, scoreSubtitle, scoreTitle, slurs, tempoBpm, timeSignature } = payload
  const { startMap: slurStarts, stopMap: slurStops } = buildSlurMaps(slurs)
  const tieStops = buildTieStopMap(measures, timeSignature, keySignature)
  const meter = parseTimeSignature(timeSignature, payload.timeSignatureGrouping)
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
  ]

  if (scoreTitle.trim()) {
    lines.push(`  <movement-title>${escapeXml(scoreTitle.trim())}</movement-title>`)
  }

  const credits = [
    scoreSubtitle.trim(),
    scoreComposer.trim() ? `Composer: ${scoreComposer.trim()}` : '',
    scoreLyricist.trim() ? `Lyricist: ${scoreLyricist.trim()}` : '',
    scoreArranger.trim() ? `Arranger: ${scoreArranger.trim()}` : '',
  ].filter(Boolean)

  credits.forEach((credit, index) => {
    lines.push('  <credit>')
    lines.push(`    <credit-words default-y="${1450 - index * 60}">${escapeXml(credit)}</credit-words>`)
    lines.push('  </credit>')
  })

  if (scoreComposer.trim() || scoreLyricist.trim() || scoreArranger.trim()) {
    lines.push('  <identification>')
    if (scoreComposer.trim()) {
      lines.push(`    <creator type="composer">${escapeXml(scoreComposer.trim())}</creator>`)
    }
    if (scoreLyricist.trim()) {
      lines.push(`    <creator type="lyricist">${escapeXml(scoreLyricist.trim())}</creator>`)
    }
    if (scoreArranger.trim()) {
      lines.push(`    <creator type="arranger">${escapeXml(scoreArranger.trim())}</creator>`)
    }
    lines.push('  </identification>')
  }

  lines.push('  <part-list>')
  lines.push('    <score-part id="P1">')
  lines.push('      <part-name>Piano</part-name>')
  lines.push('    </score-part>')
  lines.push('  </part-list>')
  lines.push('  <part id="P1">')

  measures.forEach((measure, index) => {
    lines.push(`    <measure number="${index + 1}">`)

    if (index === 0) {
      lines.push('      <attributes>')
      lines.push(`        <divisions>${MUSICXML_DIVISIONS}</divisions>`)
      lines.push(`        <key><fifths>${KEY_SIGNATURE_TO_FIFTHS[keySignature]}</fifths></key>`)
      lines.push(`        <time><beats>${meter.numerator}</beats><beat-type>${meter.denominator}</beat-type></time>`)
      lines.push('        <staves>2</staves>')
      lines.push('        <clef number="1"><sign>G</sign><line>2</line></clef>')
      lines.push('        <clef number="2"><sign>F</sign><line>4</line></clef>')
      lines.push('      </attributes>')
    }

    if (index === 0 || measure.tempoBpm !== null) {
      pushTempoDirection(lines, index === 0 ? tempoBpm : (measure.tempoBpm ?? tempoBpm))
    }

    pushStaffContents(
      lines,
      measure,
      'treble',
      meter.subdivisionsPerMeasure,
      meter.groupSubdivisionLengths,
      tieStops,
      slurStarts,
      slurStops,
      keySignature,
    )

    lines.push('      <backup>')
    lines.push(`        <duration>${meter.subdivisionsPerMeasure}</duration>`)
    lines.push('      </backup>')

    pushStaffContents(
      lines,
      measure,
      'bass',
      meter.subdivisionsPerMeasure,
      meter.groupSubdivisionLengths,
      tieStops,
      slurStarts,
      slurStops,
      keySignature,
    )

    lines.push('    </measure>')
  })

  lines.push('  </part>')
  lines.push('</score-partwise>')
  return lines.join('\n')
}

export function exportMusicXML(payload: MusicXmlScorePayload) {
  const filename = getSafeScoreFilename(payload.scoreTitle || 'score', 'musicxml')
  const document = buildMusicXmlDocument(payload)
  downloadTextFile(filename, document, 'application/vnd.recordare.musicxml+xml;charset=utf-8')
}

export async function exportMusicXMLViaBackend(payload: MusicXmlScorePayload) {
  const response = await fetch('/api/musicxml/export', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  await downloadResponseFile(
    response,
    getSafeScoreFilename(payload.scoreTitle || 'score', 'musicxml'),
  )
}

export async function exportPDFViaBackend(params: {
  filename: string
  payload: MusicXmlScorePayload
}) {
  const response = await fetch('/api/pdf/export', {
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  await downloadResponseFile(
    response,
    getSafeScoreFilename(params.filename || params.payload.scoreTitle || 'score', 'pdf'),
  )
}

export async function importMusicXMLViaBackend(xml: string): Promise<MusicXmlScorePayload> {
  const response = await fetch('/api/musicxml/import', {
    body: JSON.stringify({ xml }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, 'MusicXML import failed.'))
  }

  return await response.json() as MusicXmlScorePayload
}
import {
  STAFF_IDS,
  type AccidentalType,
  type ArticulationType,
  type BaseDuration,
  type DynamicType,
  type KeySignatureSpec,
  type MeasureData,
  type NoteItem,
  type OrnamentType,
  type StaffId,
  type TimeSignature,
} from './constants'
import {
  findNextContiguousItem,
  getDisplayAccidentalForPitch,
  getEffectiveAlterForPitch,
  getItemSubdivisions,
  getItemsForStaff,
  haveSameNotePitches,
  parsePitchToken,
  parseTimeSignature,
} from './score'
