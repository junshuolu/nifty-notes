/**
 * 从官方 Bravura.otf 生成 jsPDF 可解析的 Bravura.ttf（dev 依赖 fonteditor-core）。
 * 运行: npm run font:bravura
 */
import { createFont } from 'fonteditor-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'public', 'fonts')
const outFile = path.join(outDir, 'Bravura.ttf')
const otfUrl =
  'https://raw.githubusercontent.com/musescore/MuseScore/master/fonts/bravura/Bravura.otf'

const res = await fetch(otfUrl)
if (!res.ok) throw new Error(`Failed to fetch Bravura.otf: ${res.status}`)
const buffer = Buffer.from(await res.arrayBuffer())

const font = createFont(buffer, { type: 'otf', hinting: false, kerning: false })
const ttf = font.write({ type: 'ttf', hinting: false, kerning: false })

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, Buffer.from(ttf))
console.log('Wrote', outFile, `(${(ttf.byteLength / 1024).toFixed(1)} KiB)`)
