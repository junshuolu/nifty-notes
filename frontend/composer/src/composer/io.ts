/**
 * io.ts – Nifty Notes 2.0
 * PDF：乐谱 SVG → Canvas（canvg 栅格化）→ jsPDF 嵌入 PNG（分页）。
 * 序列化前注入 Bravura @font-face，避免离屏渲染时丢失 SMuFL 字形。
 */

import type { BaseDuration, MeasureData, NoteItem, ScoreItem, StaffId } from './constants'

// ---------------------------------------------------------------------------
// Shared Helpers
// ---------------------------------------------------------------------------

function triggerDownload(filename: string, url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

function escapeXml(str: string): string {
  return str.replace(/[<>&"']/g, (c) => {
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return map[c] ?? c
  })
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** 绝对 URL，供序列化后的 SVG 在 canvg 内加载 Bravura */
function bravuraFontUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}fonts/Bravura.ttf`, window.location.href).href
}

/** 在克隆 SVG 内插入 @font-face，canvg 离屏解析时才能用到乐谱字体 */
function injectBravuraForRasterExport(svg: SVGSVGElement) {
  const style = document.createElementNS(SVG_NS, 'style')
  style.setAttribute('type', 'text/css')
  const url = bravuraFontUrl()
  style.textContent = `@font-face{font-family:Bravura;src:url("${url}") format("truetype");font-weight:normal;font-style:normal;}`
  svg.insertBefore(style, svg.firstChild)
}

// ---------------------------------------------------------------------------
// MusicXML Export / Import
// ---------------------------------------------------------------------------

const DIVISIONS_PER_QUARTER = 32
const DURATION_TO_XML: Record<BaseDuration, { type: string; divisionMultiplier: number }> = {
  w: { type: 'whole', divisionMultiplier: 4 },
  h: { type: 'half', divisionMultiplier: 2 },
  q: { type: 'quarter', divisionMultiplier: 1 },
  '8': { type: 'eighth', divisionMultiplier: 0.5 },
  '16': { type: '16th', divisionMultiplier: 0.25 },
}

function baseDurationDivisions(dur: BaseDuration, dots: 0 | 1): number {
  const base = DURATION_TO_XML[dur].divisionMultiplier * DIVISIONS_PER_QUARTER
  return dots === 1 ? Math.round(base * 1.5) : base
}

function pitchToXmlParts(vexPitch: string) {
  const [notePart, octaveStr] = vexPitch.toLowerCase().split('/')
  const octave = parseInt(octaveStr ?? '4', 10)
  const stepMap: Record<string, string> = { c: 'C', d: 'D', e: 'E', f: 'F', g: 'G', a: 'A', b: 'B' }
  const step = stepMap[notePart[0]] ?? 'C'
  let alter = 0
  if (notePart.includes('#')) alter = 1
  if (notePart.includes('b')) alter = -1
  return { step, octave, alter }
}

function buildNoteXml(item: ScoreItem, staffId: StaffId, isChord: boolean, pIdx: number): string {
  const staffNum = staffId === 'treble' ? 1 : 2
  const dur = DURATION_TO_XML[item.baseDuration as BaseDuration]
  const divDur = baseDurationDivisions(item.baseDuration as BaseDuration, item.dots)
  const chordTag = isChord ? '<chord/>' : ''
  const dotTag = item.dots === 1 ? '<dot/>' : ''

  if (item.kind === 'rest') {
    return `      <note>
        <rest/><duration>${divDur}</duration><type>${dur.type}</type>${dotTag}
        <staff>${staffNum}</staff>
      </note>`
  }

  const note = item as NoteItem
  const { step, octave, alter: baseAlter } = pitchToXmlParts(note.pitches[pIdx])
  const manualAcc = note.accidentals?.[note.pitches[pIdx]]
  const alter = manualAcc ? (manualAcc === '#' ? 1 : manualAcc === 'b' ? -1 : 0) : baseAlter
  const accTag = manualAcc
    ? `<accidental>${manualAcc === '#' ? 'sharp' : manualAcc === 'b' ? 'flat' : 'natural'}</accidental>`
    : ''
  const tieTag = note.tieToNext ? '<tie type="start"/>' : ''
  const notationTie = note.tieToNext ? '<notations><tied type="start"/></notations>' : ''

  return `      <note>
        ${chordTag}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch>
        <duration>${divDur}</duration>${tieTag}<type>${dur.type}</type>${dotTag}${accTag}
        <staff>${staffNum}</staff>
        ${notationTie}
      </note>`
}

export function exportMusicXML(params: any): void {
  const { measures, timeSignature, scoreTitle } = params
  const [beats, beatType] = timeSignature.split('/').map(Number)
  const bodyXml = measures
    .map((m: MeasureData, idx: number) => {
      const attr =
        idx === 0
          ? `<attributes><divisions>${DIVISIONS_PER_QUARTER}</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>`
          : ''
      const treble = m.trebleItems
        .map((item) =>
          item.kind === 'note'
            ? (item as NoteItem).pitches
                .map((_, i) => buildNoteXml(item, 'treble', i > 0, i))
                .join('\n')
            : buildNoteXml(item, 'treble', false, 0),
        )
        .join('\n')
      const backup = `\n      <backup><duration>${beats * (4 / beatType) * DIVISIONS_PER_QUARTER}</duration></backup>`
      const bass = m.bassItems
        .map((item) =>
          item.kind === 'note'
            ? (item as NoteItem).pitches
                .map((_, i) => buildNoteXml(item, 'bass', i > 0, i))
                .join('\n')
            : buildNoteXml(item, 'bass', false, 0),
        )
        .join('\n')
      return `    <measure number="${idx + 1}">${attr}${treble}${backup}${bass}\n    </measure>`
    })
    .join('\n')

  const fullXml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>${escapeXml(scoreTitle)}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">\n${bodyXml}\n  </part></score-partwise>`
  const blob = new Blob([fullXml], { type: 'application/xml' })
  triggerDownload(`${scoreTitle || 'score'}.musicxml`, URL.createObjectURL(blob))
}

export function importMusicXML(xmlString: string): any {
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml')
  if (doc.querySelector('parsererror')) return { error: 'Invalid XML' }
  return { measures: [], error: 'Basic Import UI ready. Full parser logic in score.ts' }
}

// ---------------------------------------------------------------------------
// PDF：SVG → Canvas（canvg）→ PNG → jsPDF
// ---------------------------------------------------------------------------

const PDF_PAGE_MARGIN_MM = 10
const PDF_SIDE_MARGIN_MM = 12
/** 栅格倍率，越大越清晰，Canvas 像素也越大 */
const RASTER_SCALE = Math.min(3, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2)
/**
 * 仅向上扩展 viewBox（非首页）：给页首系统上方的速度记号等留余量，减轻顶边裁切。
 * 不向分页线以下扩展：否则会把「下一页第一行」画进上一页末尾，出现重复碎片。
 */
const PDF_SLICE_BLEED_TOP_SVG = 36
/**
 * 非最后一页时，栅格化下沿相对逻辑分页线略上移（仍保持 currentY→endY 不变），
 * 去掉偶发落在页缘的下一行笔划／抗锯齿；下一页 topBleed 会盖住此窄带，不丢谱。
 */
const PDF_SLICE_BOTTOM_SHRINK_SVG = 8
const PDF_SLICE_MIN_HEIGHT_FOR_SHRINK = 40

export type ExportPdfHeader = {
  title: string
  subtitle?: string
  composer?: string
  lyricist?: string
  arranger?: string
}

/** 与 App.css `.score-header-card` / `.score-credit-fields` 视觉对齐（PDF 用矢量近似） */
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

/**
 * 在不超过 target 的前提下取「最靠下」的断点。
 * 断点列表须包含谱面底部 totalH：否则只有「系统之间的缝」，最后一页永远只能画到「倒数第二行之后」，
 * 最后两行会被迫各占一页（中间大块留白）。
 */
function getBestCutPoint(startY: number, maxH: number, totalH: number, points: number[]): number {
  const target = Math.min(startY + maxH, totalH)
  let best = startY
  for (const p of points) {
    if (p > startY && p <= target) {
      if (p > best) best = p
    }
  }
  return best > startY ? best : target
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
  // VexFlow 在根 svg 上写了 style.width/height（整页尺寸）。只改 viewBox 切片时若保留该 style，
  // canvg 会用「全页高度」算 yRatio、用画布宽度算 xRatio，导致纵向被压成细条、比例错乱。
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
  header?: ExportPdfHeader
  scoreSvgSelector?: string
}): Promise<void> {
  const {
    scoreTitle,
    overrideFilename,
    pdfSafeBreakYsSvg = [],
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

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  const innerW = pdfW - PDF_SIDE_MARGIN_MM * 2

  const mmPerSvgUnit = innerW / svgW
  const cutPoints = [
    ...new Set([
      ...pdfSafeBreakYsSvg.filter((y) => y > 0 && y < svgH),
      svgH,
    ]),
  ].sort((a, b) => a - b)

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

    const budget = pageIndex === 0 ? bodyBudgetSvg * 0.92 : bodyBudgetSvg
    const endY = getBestCutPoint(currentY, budget, svgH, cutPoints)
    const sliceH = endY - currentY
    if (sliceH <= 0) break

    const topBleed = currentY > 0 ? PDF_SLICE_BLEED_TOP_SVG : 0
    const viewY = Math.max(0, currentY - topBleed)
    const bottomShrink =
      endY < svgH && sliceH >= PDF_SLICE_MIN_HEIGHT_FOR_SHRINK
        ? PDF_SLICE_BOTTOM_SHRINK_SVG
        : 0
    const renderEndY = endY - bottomShrink
    const viewH = Math.min(svgH - viewY, renderEndY - viewY)
    if (viewH <= 0) break

    const renderMmH = viewH * mmPerSvgUnit

    let drawYMm = bodyTopMm
    if (viewH < budget * 0.85 && pageIndex > 0) {
      const emptyMm = bodyBudgetMm - renderMmH
      drawYMm = bodyTopMm + emptyMm / 2
    }

    const pngDataUrl = await renderSvgSliceToPng(svg, svgW, viewY, viewH)
    pdf.addImage(pngDataUrl, 'PNG', PDF_SIDE_MARGIN_MM, drawYMm, innerW, renderMmH, undefined, 'FAST')

    currentY = endY
    pageIndex += 1
  }

  const safeName = (overrideFilename || scoreTitle || 'score')
    .replace(/[^a-zA-Z0-9_\- ]/g, '_')
    .trim()
  pdf.save(`${safeName}.pdf`)
}
