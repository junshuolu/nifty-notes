import fs from 'node:fs'
import fsp from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import {
  buildMusicXmlDocument,
  getSafeScoreFilename,
  parseMusicXml,
} from './musicxml.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const FRONTEND_DIST_DIR = path.resolve(REPO_ROOT, 'frontend', 'composer', 'dist')
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const HOST = process.env.HOST ?? '127.0.0.1'

const STATIC_MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const pdfJobs = new Map()

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 10 * 1024 * 1024) {
        reject(new Error('Request body is too large.'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

function encodeRFC5987(value) {
  return encodeURIComponent(value)
    .replaceAll("'", '%27')
    .replaceAll('(', '%28')
    .replaceAll(')', '%29')
    .replaceAll('*', '%2A')
}

function sendDownload(res, statusCode, filename, contentType, body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeRFC5987(filename)}`,
    'Content-Length': buffer.byteLength,
    'Content-Type': contentType,
  })
  res.end(buffer)
}

function assertPayloadShape(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.')
  }
}

function getPdfJobPath(urlPathname) {
  const prefix = '/api/pdf/jobs/'
  if (!urlPathname.startsWith(prefix)) {
    return null
  }
  return decodeURIComponent(urlPathname.slice(prefix.length))
}

function getContentType(filePath) {
  return STATIC_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

async function serveStaticAsset(res, pathname) {
  if (!fs.existsSync(FRONTEND_DIST_DIR)) {
    sendJson(res, 503, {
      error: 'Frontend build is missing. Run `npm --prefix ../frontend/composer run build` first.',
    })
    return true
  }

  const rawPath = pathname === '/' ? '/index.html' : pathname
  const candidatePath = path.normalize(path.join(FRONTEND_DIST_DIR, rawPath))

  if (!candidatePath.startsWith(FRONTEND_DIST_DIR)) {
    sendJson(res, 403, { error: 'Forbidden.' })
    return true
  }

  const filePath = fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()
    ? candidatePath
    : (!path.extname(rawPath) ? path.join(FRONTEND_DIST_DIR, 'index.html') : null)

  if (!filePath || !fs.existsSync(filePath)) {
    return false
  }

  const content = await fsp.readFile(filePath)
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': getContentType(filePath),
  })
  res.end(content)
  return true
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error('No Chrome or Edge executable was found for backend PDF export.')
}

async function buildPrintablePdfLayout(page, options) {
  await page.evaluate((input) => {
    const PAGE_WIDTH_MM = 210
    const PAGE_HEIGHT_MM = 297
    const PAGE_MARGIN_MM = 10
    const PAGE_SIDE_MARGIN_MM = 12
    const HEADER_GAP_MM = 4
    const SYSTEM_STACK_GAP_MM = 2
    const SYSTEM_TOP_PAD_SVG = 6
    const SYSTEM_BOTTOM_PAD_SVG = 8
    const PX_PER_MM = 96 / 25.4

    function mmToPx(value) {
      return value * PX_PER_MM
    }

    function createPage() {
      const pageEl = document.createElement('section')
      pageEl.className = 'pdf-print-page'
      pageEl.style.width = `${PAGE_WIDTH_MM}mm`
      pageEl.style.height = `${PAGE_HEIGHT_MM}mm`
      pageEl.style.boxSizing = 'border-box'
      pageEl.style.position = 'relative'
      pageEl.style.background = '#ffffff'
      pageEl.style.overflow = 'hidden'
      pageEl.style.breakAfter = 'page'
      return pageEl
    }

    function createHeader(header) {
      const wrap = document.createElement('div')
      wrap.style.paddingTop = `${PAGE_MARGIN_MM}mm`
      wrap.style.paddingLeft = `${PAGE_SIDE_MARGIN_MM}mm`
      wrap.style.paddingRight = `${PAGE_SIDE_MARGIN_MM}mm`
      wrap.style.color = '#111827'

      const title = document.createElement('div')
      title.textContent = header.title || 'Untitled'
      title.style.fontFamily = '"Times New Roman", Georgia, serif'
      title.style.fontSize = '20pt'
      title.style.fontWeight = '700'
      title.style.textAlign = 'center'
      wrap.appendChild(title)

      if (header.subtitle) {
        const subtitle = document.createElement('div')
        subtitle.textContent = header.subtitle
        subtitle.style.marginTop = '4mm'
        subtitle.style.fontFamily = '"Times New Roman", Georgia, serif'
        subtitle.style.fontSize = '11pt'
        subtitle.style.color = '#6b7280'
        subtitle.style.textAlign = 'center'
        wrap.appendChild(subtitle)
      }

      const credits = document.createElement('div')
      credits.style.display = 'flex'
      credits.style.justifyContent = 'flex-end'
      credits.style.gap = '4.5mm'
      credits.style.marginTop = '6mm'

      for (const [label, value, placeholder] of [
        ['COMPOSER', header.composer, 'Composer'],
        ['LYRICIST', header.lyricist, 'Lyricist'],
        ['ARRANGER', header.arranger, 'Arranger'],
      ]) {
        const field = document.createElement('div')
        field.style.width = '40mm'

        const fieldLabel = document.createElement('div')
        fieldLabel.textContent = label
        fieldLabel.style.color = '#64748b'
        fieldLabel.style.fontFamily = 'Arial, sans-serif'
        fieldLabel.style.fontSize = '6.5pt'
        fieldLabel.style.fontWeight = '700'
        field.appendChild(fieldLabel)

        const box = document.createElement('div')
        box.textContent = value || placeholder
        box.style.marginTop = '1.5mm'
        box.style.padding = '2mm 1.5mm'
        box.style.border = '0.2mm solid #e2e8f0'
        box.style.background = '#f8fafc'
        box.style.color = value ? '#1e293b' : '#94a3b8'
        box.style.fontFamily = 'Arial, sans-serif'
        box.style.fontSize = '9pt'
        box.style.minHeight = '7mm'
        field.appendChild(box)

        credits.appendChild(field)
      }

      wrap.appendChild(credits)
      return wrap
    }

    function estimateHeaderHeightPx(header) {
      return mmToPx(header.subtitle ? 38 : 33)
    }

    function normalizeSystemBounds(bounds, svgHeight) {
      return bounds
        .map((bound) => ({
          top: Math.max(0, Math.min(svgHeight, bound.top)),
          bottom: Math.max(0, Math.min(svgHeight, bound.bottom)),
        }))
        .filter((bound) => bound.bottom > bound.top)
        .sort((left, right) => left.top - right.top)
    }

    function expandSystemBounds(bounds, svgHeight) {
      const expanded = bounds.map((bound) => ({
        top: Math.max(0, bound.top - SYSTEM_TOP_PAD_SVG),
        bottom: Math.max(0, Math.min(svgHeight, bound.bottom + SYSTEM_BOTTOM_PAD_SVG)),
      }))

      for (let index = 0; index < expanded.length - 1; index += 1) {
        const currentRaw = bounds[index]
        const nextRaw = bounds[index + 1]
        const current = expanded[index]
        const next = expanded[index + 1]
        const seam = Math.max(
          current.top + 1,
          Math.min(next.bottom - 1, (currentRaw.bottom + nextRaw.top) / 2),
        )

        current.bottom = Math.min(current.bottom, seam)
        next.top = Math.max(next.top, seam)
      }

      return expanded.filter((bound) => bound.bottom > bound.top)
    }

    function buildGapCutPointsFromSystems(bounds, svgHeight) {
      if (bounds.length <= 1) {
        return [svgHeight]
      }

      const cuts = []
      for (let index = 0; index < bounds.length - 1; index += 1) {
        const current = bounds[index]
        const next = bounds[index + 1]
        cuts.push(next.top > current.bottom ? (current.bottom + next.top) / 2 : current.bottom)
      }

      cuts.push(svgHeight)
      return [...new Set(cuts)].sort((left, right) => left - right)
    }

    function getBestCutPoint(startY, maxHeight, totalHeight, bounds, fallbackCutPoints) {
      const target = Math.min(startY + maxHeight, totalHeight)
      let best = startY

      for (let index = 0; index < bounds.length - 1; index += 1) {
        const current = bounds[index]
        const next = bounds[index + 1]
        if (current.bottom <= startY) {
          continue
        }

        const gapTop = current.bottom
        const gapBottom = next.top
        const cut = gapBottom > gapTop ? (gapTop + gapBottom) / 2 : gapTop
        if (cut > startY && cut <= target && cut > best) {
          best = cut
        }
      }

      if (best > startY) {
        return best
      }

      for (const point of fallbackCutPoints) {
        if (point > startY && point <= target && point > best) {
          best = point
        }
      }

      return best > startY ? best : target
    }

    const sourceSvg = document.querySelector('.score-surface svg')
    if (!(sourceSvg instanceof SVGSVGElement)) {
      throw new Error('PDF render page did not produce a score SVG.')
    }

    const svgWidth = sourceSvg.viewBox?.baseVal?.width || sourceSvg.width.baseVal.value || sourceSvg.getBoundingClientRect().width
    const svgHeight = sourceSvg.viewBox?.baseVal?.height || sourceSvg.height.baseVal.value || sourceSvg.getBoundingClientRect().height
    if (!svgWidth || !svgHeight) {
      throw new Error('PDF render page produced an invalid SVG size.')
    }

    const innerWidthPx = mmToPx(PAGE_WIDTH_MM - PAGE_SIDE_MARGIN_MM * 2)
    const pageHeightPx = mmToPx(PAGE_HEIGHT_MM)
    const pageMarginPx = mmToPx(PAGE_MARGIN_MM)
    const headerGapPx = mmToPx(HEADER_GAP_MM)
    const systemStackGapPx = mmToPx(SYSTEM_STACK_GAP_MM)
    const scale = innerWidthPx / svgWidth
    const normalizedSystems = normalizeSystemBounds(input.systemBoundsSvg || [], svgHeight)
    const paddedSystems = expandSystemBounds(normalizedSystems, svgHeight)
    const fallbackCutPoints = buildGapCutPointsFromSystems(paddedSystems, svgHeight)

    const printRoot = document.createElement('main')
    printRoot.id = 'pdf-print-root'
    printRoot.style.background = '#ffffff'
    printRoot.style.width = `${PAGE_WIDTH_MM}mm`
    printRoot.style.margin = '0 auto'

    const style = document.createElement('style')
    style.textContent = `
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff !important;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #pdf-print-root {
        width: ${PAGE_WIDTH_MM}mm;
        margin: 0 auto;
        background: #ffffff;
      }
      .pdf-print-page:last-child {
        break-after: auto;
      }
    `

    const sourceCloneTemplate = sourceSvg.cloneNode(true)
    if (sourceCloneTemplate instanceof SVGSVGElement) {
      sourceCloneTemplate.removeAttribute('class')
      sourceCloneTemplate.style.display = 'block'
      sourceCloneTemplate.style.position = 'absolute'
      sourceCloneTemplate.style.inset = '0 auto auto 0'
      sourceCloneTemplate.style.maxWidth = 'none'
    }

    function appendViewport(pageEl, topPx, rangeTopSvg, rangeBottomSvg) {
      const sliceHeightSvg = Math.max(0, rangeBottomSvg - rangeTopSvg)
      const sliceHeightPx = Math.max(1, sliceHeightSvg * scale)
      const viewport = document.createElement('div')
      viewport.style.position = 'absolute'
      viewport.style.left = `${PAGE_SIDE_MARGIN_MM}mm`
      viewport.style.top = `${topPx}px`
      viewport.style.width = `${innerWidthPx}px`
      viewport.style.height = `${sliceHeightPx}px`
      viewport.style.overflow = 'hidden'

      const svgClone = sourceCloneTemplate.cloneNode(true)
      svgClone.setAttribute('width', String(svgWidth))
      svgClone.setAttribute('height', String(svgHeight))
      svgClone.style.width = `${svgWidth * scale}px`
      svgClone.style.height = `${svgHeight * scale}px`
      svgClone.style.transform = `translate(0px, ${-rangeTopSvg * scale}px)`
      svgClone.style.transformOrigin = 'top left'

      viewport.appendChild(svgClone)
      pageEl.appendChild(viewport)
      return sliceHeightPx
    }

    if (paddedSystems.length > 0) {
      let pageIndex = 0
      let systemIndex = 0

      while (systemIndex < paddedSystems.length) {
        const pageEl = createPage()
        let bodyTopPx = pageMarginPx

        if (pageIndex === 0) {
          const headerEl = createHeader(input.header)
          pageEl.appendChild(headerEl)
          bodyTopPx = estimateHeaderHeightPx(input.header) + headerGapPx
        }

        const bodyBudgetPx = pageHeightPx - pageMarginPx - bodyTopPx
        let bodyCursorPx = bodyTopPx
        let placedOnPage = 0

        while (systemIndex < paddedSystems.length) {
          const system = paddedSystems[systemIndex]
          const systemHeightPx = Math.max(1, (system.bottom - system.top) * scale)
          const extraGapPx = placedOnPage > 0 ? systemStackGapPx : 0
          const fitsOnPage = bodyCursorPx + extraGapPx + systemHeightPx <= bodyTopPx + bodyBudgetPx

          if (!fitsOnPage && placedOnPage > 0) {
            break
          }

          bodyCursorPx += extraGapPx
          appendViewport(pageEl, bodyCursorPx, system.top, system.bottom)
          bodyCursorPx += systemHeightPx
          placedOnPage += 1
          systemIndex += 1
        }

        printRoot.appendChild(pageEl)
        pageIndex += 1
      }
    } else {
      let currentY = 0
      let pageIndex = 0
      while (currentY < svgHeight - 0.5) {
        const pageEl = createPage()
        let bodyTopPx = pageMarginPx

        if (pageIndex === 0) {
          const headerEl = createHeader(input.header)
          pageEl.appendChild(headerEl)
          bodyTopPx = estimateHeaderHeightPx(input.header) + headerGapPx
        }

        const bodyBudgetPx = pageHeightPx - pageMarginPx - bodyTopPx
        const bodyBudgetSvg = bodyBudgetPx / scale
        const endY = Math.min(
          getBestCutPoint(currentY, bodyBudgetSvg, svgHeight, [], fallbackCutPoints),
          svgHeight,
        )
        appendViewport(pageEl, bodyTopPx, currentY, endY)
        printRoot.appendChild(pageEl)
        currentY = endY
        pageIndex += 1
      }
    }

    document.head.appendChild(style)
    document.body.innerHTML = ''
    document.body.appendChild(printRoot)
  }, options)
}

async function renderPdfViaHeadlessBrowser(jobId, job) {
  const browser = await puppeteer.launch({
    executablePath: findChromeExecutable(),
    headless: true,
    args: ['--disable-gpu', '--font-render-hinting=medium'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({
      width: 1440,
      height: 2200,
      deviceScaleFactor: 1.5,
    })
    page.setDefaultNavigationTimeout(120000)
    page.setDefaultTimeout(120000)
    await page.goto(`http://${HOST}:${PORT}/?pdfJob=${encodeURIComponent(jobId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })
    await page.waitForFunction(
      () => Boolean(window.__PDF_RENDER_READY__ || window.__PDF_EXPORT_ERROR__),
      { timeout: 120000 },
    )

    const error = await page.evaluate(() => window.__PDF_EXPORT_ERROR__ ?? null)
    if (error) {
      throw new Error(error)
    }

    const renderMeta = await page.evaluate(() => window.__PDF_RENDER_META__ ?? null)
    await buildPrintablePdfLayout(page, {
      header: {
        title: job.payload.scoreTitle?.trim() || 'Untitled',
        subtitle: job.payload.scoreSubtitle?.trim() || '',
        composer: job.payload.scoreComposer?.trim() || '',
        lyricist: job.payload.scoreLyricist?.trim() || '',
        arranger: job.payload.scoreArranger?.trim() || '',
      },
      systemBoundsSvg: renderMeta?.systemBoundsSvg ?? [],
    })

    await page.emulateMediaType('print')
    const buffer = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
      printBackground: true,
    })

    return {
      buffer,
      filename: `${job.filename}.pdf`,
    }
  } finally {
    await browser.close()
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { error: 'Not found.' })
    return
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`)
  const pathname = url.pathname

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  try {
    if (req.method === 'POST' && pathname === '/api/musicxml/import') {
      const body = await readJsonBody(req)
      if (!body || typeof body.xml !== 'string' || !body.xml.trim()) {
        sendJson(res, 400, { error: 'Request body must include a non-empty xml string.' })
        return
      }

      sendJson(res, 200, parseMusicXml(body.xml))
      return
    }

    if (req.method === 'POST' && pathname === '/api/musicxml/export') {
      const body = await readJsonBody(req)
      assertPayloadShape(body)
      const filename = getSafeScoreFilename(body.scoreTitle || 'score', 'musicxml')
      const xml = buildMusicXmlDocument(body)
      sendDownload(
        res,
        200,
        filename,
        'application/vnd.recordare.musicxml+xml; charset=utf-8',
        xml,
      )
      return
    }

    if (req.method === 'POST' && pathname === '/api/pdf/export') {
      const body = await readJsonBody(req)
      assertPayloadShape(body)
      const payload = body.payload
      if (!payload || typeof payload !== 'object') {
        sendJson(res, 400, { error: 'Request body must include a payload object.' })
        return
      }

      const filename = getSafeScoreFilename(body.filename || payload.scoreTitle || 'score', 'pdf')
      const jobId = globalThis.crypto?.randomUUID?.() ?? `pdf-job-${Date.now()}`
      const job = {
        filename: filename.replace(/\.pdf$/i, ''),
        payload,
      }
      pdfJobs.set(jobId, job)

      try {
        const result = await renderPdfViaHeadlessBrowser(jobId, job)
        sendDownload(res, 200, result.filename, 'application/pdf', result.buffer)
      } finally {
        pdfJobs.delete(jobId)
      }
      return
    }

    if (req.method === 'GET') {
      const jobId = getPdfJobPath(pathname)
      if (jobId) {
        const job = pdfJobs.get(jobId)
        if (!job) {
          sendJson(res, 404, { error: 'PDF export job not found.' })
          return
        }
        sendJson(res, 200, job)
        return
      }
    }

    if (req.method === 'GET') {
      const served = await serveStaticAsset(res, pathname)
      if (served) {
        return
      }
    }

    sendJson(res, 404, { error: 'Not found.' })
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'Request failed.',
    })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Composer backend listening on http://${HOST}:${PORT}`)
})
