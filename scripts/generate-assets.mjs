/**
 * Silhouette-style assets (beige sky + black shapes), matching the runner reference.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets')

const SKY = [245, 240, 230, 255]
const INK = [20, 20, 20, 255]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function writePng(path, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const o = y * (width * 4 + 1) + 1 + x * 4
      raw[o] = rgba[i]
      raw[o + 1] = rgba[i + 1]
      raw[o + 2] = rgba[i + 2]
      raw[o + 3] = rgba[i + 3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, png)
}

function px(rgba, w, x, y, c) {
  if (x < 0 || y < 0 || x >= w) return
  const h = rgba.length / (w * 4)
  if (y >= h) return
  const i = (y * w + x) * 4
  rgba[i] = c[0]
  rgba[i + 1] = c[1]
  rgba[i + 2] = c[2]
  rgba[i + 3] = c[3]
}

function fillRect(rgba, w, x0, y0, bw, bh, c) {
  for (let y = y0; y < y0 + bh; y++) {
    for (let x = x0; x < x0 + bw; x++) px(rgba, w, x, y, c)
  }
}

function clear(rgba, color) {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = color[0]
    rgba[i + 1] = color[1]
    rgba[i + 2] = color[2]
    rgba[i + 3] = color[3]
  }
}

function makeTransparent(rgba) {
  for (let i = 0; i < rgba.length; i += 4) rgba[i + 3] = 0
}

/** Stickman run pose */
function makePlayerRun() {
  const w = 40
  const h = 56
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  // head
  fillRect(rgba, w, 14, 2, 10, 10, INK)
  // torso
  fillRect(rgba, w, 17, 12, 4, 16, INK)
  // arms
  fillRect(rgba, w, 6, 14, 12, 3, INK)
  fillRect(rgba, w, 20, 16, 12, 3, INK)
  // legs run
  fillRect(rgba, w, 12, 28, 4, 18, INK)
  fillRect(rgba, w, 22, 28, 4, 14, INK)
  fillRect(rgba, w, 26, 40, 8, 3, INK)
  writePng(join(root, 'player', 'run.png'), w, h, rgba)
}

/** Stickman fly / leap pose */
function makePlayerFly() {
  const w = 40
  const h = 56
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  fillRect(rgba, w, 14, 0, 10, 10, INK)
  fillRect(rgba, w, 17, 10, 4, 14, INK)
  // arms up/back
  fillRect(rgba, w, 4, 10, 14, 3, INK)
  fillRect(rgba, w, 20, 8, 14, 3, INK)
  // legs tucked back
  fillRect(rgba, w, 14, 24, 4, 16, INK)
  fillRect(rgba, w, 22, 24, 4, 12, INK)
  writePng(join(root, 'player', 'fly.png'), w, h, rgba)
}

function makeBgFar() {
  const w = 640
  const h = 360
  const rgba = Buffer.alloc(w * h * 4)
  clear(rgba, SKY)
  writePng(join(root, 'world', 'bg-far.png'), w, h, rgba)
}

function makeBgNear() {
  const w = 640
  const h = 360
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  writePng(join(root, 'world', 'bg-near.png'), w, h, rgba)
}

function makeGround() {
  const w = 64
  const h = 48
  const rgba = Buffer.alloc(w * h * 4)
  clear(rgba, INK)
  writePng(join(root, 'world', 'ground.png'), w, h, rgba)
}

/** Low wall — short thick bar just above ground (jump/fly over). */
function makeLowWall() {
  const w = 72
  const h = 28
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  fillRect(rgba, w, 0, 0, w, h, INK)
  writePng(join(root, 'obstacles', 'ground-a.png'), w, h, rgba)
}

/** High wall — tall pillar; must fly near top of screen to clear. */
function makeHighWall() {
  const w = 56
  const h = 320
  const rgba = Buffer.alloc(w * h * 4)
  clear(rgba, INK)
  writePng(join(root, 'obstacles', 'air-a.png'), w, h, rgba)
}

/** Vertical vine — lethal air hazard (display 32×220). */
function makeVine() {
  const w = 32
  const h = 220
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const leaf = [34, 90, 48, 255]
  const stem = [28, 64, 36, 255]
  // Main stem
  fillRect(rgba, w, 13, 0, 6, h, stem)
  // Leaf lumps along the vine
  for (let y = 8; y < h - 12; y += 22) {
    const side = (y / 22) % 2 === 0
    if (side) fillRect(rgba, w, 2, y, 12, 10, leaf)
    else fillRect(rgba, w, 18, y + 4, 12, 10, leaf)
  }
  writePng(join(root, 'obstacles', 'vine.png'), w, h, rgba)
}

/** Square air hazard (display 48×48). */
function makeAirSquare() {
  const w = 48
  const h = 48
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const fill = [60, 40, 28, 255]
  const edge = [20, 20, 20, 255]
  fillRect(rgba, w, 0, 0, w, h, edge)
  fillRect(rgba, w, 3, 3, w - 6, h - 6, fill)
  // Inner notch so it reads as a block, not a wall stub
  fillRect(rgba, w, 16, 16, 16, 16, edge)
  writePng(join(root, 'obstacles', 'square.png'), w, h, rgba)
}

/** Finish-line banner placeholder (60×540) — visual only, no collision. */
function makeEndBanner() {
  const w = 60
  const h = 540
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const dark = [20, 20, 20, 255]
  const light = [245, 240, 230, 255]
  const accent = [46, 204, 113, 255]
  const cell = 20
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const check = ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0)
      px(rgba, w, x, y, check ? dark : light)
    }
  }
  // Side stripes so it reads as a gate post
  fillRect(rgba, w, 0, 0, 4, h, accent)
  fillRect(rgba, w, w - 4, 0, 4, h, accent)
  writePng(join(root, 'obstacles', 'end.png'), w, h, rgba)
}

/** Large square air hazard placeholder (120×120) — swap for custom art later. */
function makeAirSquare2() {
  const w = 120
  const h = 120
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const fill = [90, 55, 35, 255]
  const edge = [20, 20, 20, 255]
  const accent = [180, 120, 60, 255]
  fillRect(rgba, w, 0, 0, w, h, edge)
  fillRect(rgba, w, 6, 6, w - 12, h - 12, fill)
  // Corner marks so it is easy to spot vs small squares
  fillRect(rgba, w, 14, 14, 28, 8, accent)
  fillRect(rgba, w, 14, 14, 8, 28, accent)
  fillRect(rgba, w, w - 42, 14, 28, 8, accent)
  fillRect(rgba, w, w - 22, 14, 8, 28, accent)
  fillRect(rgba, w, 14, h - 22, 28, 8, accent)
  fillRect(rgba, w, 14, h - 42, 8, 28, accent)
  fillRect(rgba, w, w - 42, h - 22, 28, 8, accent)
  fillRect(rgba, w, w - 22, h - 42, 8, 28, accent)
  // Center label bar (reads as "swap me")
  fillRect(rgba, w, 30, 52, 60, 16, edge)
  writePng(join(root, 'obstacles', 'square2.png'), w, h, rgba)
}

function makeCoin() {
  const w = 20
  const h = 20
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const cx = 10
  const cy = 10
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.hypot(x - cx, y - cy) < 8) px(rgba, w, x, y, INK)
      if (Math.hypot(x - cx, y - cy) < 4) px(rgba, w, x, y, [0, 0, 0, 0])
    }
  }
  writePng(join(root, 'collectibles', 'coin.png'), w, h, rgba)
}

/** Title screen background — 2x (1920×1080), scaled to 960×540 in game. */
function makeTitleBg() {
  const w = 1920
  const h = 1080
  const rgba = Buffer.alloc(w * h * 4)
  clear(rgba, SKY)
  // subtle top band
  for (let y = 0; y < h * 0.35; y++) {
    const t = y / (h * 0.35)
    for (let x = 0; x < w; x++) {
      px(rgba, w, x, y, [
        Math.floor(SKY[0] - 18 * t),
        Math.floor(SKY[1] - 22 * t),
        Math.floor(SKY[2] - 28 * t),
        255,
      ])
    }
  }
  // title placeholder bar
  fillRect(rgba, w, w / 2 - 420, 120, 840, 72, [INK[0], INK[1], INK[2], 40])
  fillRect(rgba, w, w / 2 - 280, 220, 560, 36, [INK[0], INK[1], INK[2], 55])
  // ground hint
  fillRect(rgba, w, 0, h - 96, w, 96, [INK[0], INK[1], INK[2], 30])
  writePng(join(root, 'ui', 'title-bg.png'), w, h, rgba)
}

/** Start button — 2x (480×144), transparent outside rounded rect. */
function makeBtnStart() {
  const w = 480
  const h = 144
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const green = [46, 204, 113, 255]
  const greenDark = [39, 174, 96, 255]
  const r = 24
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inRect =
        x >= r &&
        x < w - r &&
        y >= 8 &&
        y < h - 8 &&
        (y >= r || x >= r + (r - y) || x < w - r - (r - y)) &&
        (y < h - r || x >= r + (y - (h - r)) || x < w - r - (y - (h - r)))
      if (inRect) px(rgba, w, x, y, y < h / 2 ? green : greenDark)
    }
  }
  // "开始" placeholder strokes
  fillRect(rgba, w, 170, 52, 140, 12, [255, 255, 255, 255])
  fillRect(rgba, w, 170, 80, 12, 12, [255, 255, 255, 255])
  fillRect(rgba, w, 230, 52, 12, 40, [255, 255, 255, 255])
  fillRect(rgba, w, 230, 80, 40, 12, [255, 255, 255, 255])
  fillRect(rgba, w, 290, 52, 12, 40, [255, 255, 255, 255])
  writePng(join(root, 'ui', 'btn-start.png'), w, h, rgba)
}

/** Win screen background — 2x (1920×1080), scaled to 960×540. Paint title into the PNG. */
function makeWinBg() {
  const w = 1920
  const h = 1080
  const rgba = Buffer.alloc(w * h * 4)
  const sky = [90, 170, 210, 255]
  clear(rgba, sky)
  // Soft vignette bands
  for (let y = 0; y < h; y++) {
    const t = Math.abs(y - h / 2) / (h / 2)
    for (let x = 0; x < w; x++) {
      const edge = Math.abs(x - w / 2) / (w / 2)
      const dark = Math.min(1, t * 0.35 + edge * 0.15)
      px(rgba, w, x, y, [
        Math.floor(sky[0] * (1 - dark * 0.4)),
        Math.floor(sky[1] * (1 - dark * 0.35)),
        Math.floor(sky[2] * (1 - dark * 0.25)),
        255,
      ])
    }
  }
  // Placeholder "胜利" bar — replace whole PNG with custom art
  fillRect(rgba, w, w / 2 - 360, 200, 720, 100, [255, 255, 255, 220])
  fillRect(rgba, w, w / 2 - 280, 230, 560, 40, [20, 20, 20, 255])
  fillRect(rgba, w, w / 2 - 200, 360, 400, 24, [20, 20, 20, 90])
  writePng(join(root, 'ui', 'win-bg.png'), w, h, rgba)
}

/** Replay button — 2x (480×144), transparent outside. Paint "再玩一次" into the PNG. */
function makeBtnReplay() {
  const w = 480
  const h = 144
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const gold = [241, 196, 15, 255]
  const goldDark = [211, 160, 10, 255]
  const r = 24
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inRect =
        x >= r &&
        x < w - r &&
        y >= 8 &&
        y < h - 8 &&
        (y >= r || x >= r + (r - y) || x < w - r - (r - y)) &&
        (y < h - r || x >= r + (y - (h - r)) || x < w - r - (y - (h - r)))
      if (inRect) px(rgba, w, x, y, y < h / 2 ? gold : goldDark)
    }
  }
  // Placeholder label strokes
  fillRect(rgba, w, 120, 56, 240, 14, [20, 20, 20, 255])
  fillRect(rgba, w, 160, 82, 160, 10, [20, 20, 20, 255])
  writePng(join(root, 'ui', 'btn-replay.png'), w, h, rgba)
}

/** Game Over background — 2x (1920×1080). Paint failure copy into the PNG. */
function makeGameOverBg() {
  const w = 1920
  const h = 1080
  const rgba = Buffer.alloc(w * h * 4)
  const dusk = [60, 50, 70, 255]
  clear(rgba, dusk)
  for (let y = 0; y < h; y++) {
    const t = y / h
    for (let x = 0; x < w; x++) {
      px(rgba, w, x, y, [
        Math.floor(dusk[0] + 40 * t),
        Math.floor(dusk[1] + 10 * t),
        Math.floor(dusk[2] - 20 * t),
        255,
      ])
    }
  }
  fillRect(rgba, w, w / 2 - 360, 200, 720, 100, [20, 20, 20, 200])
  fillRect(rgba, w, w / 2 - 280, 230, 560, 40, [220, 80, 80, 255])
  fillRect(rgba, w, w / 2 - 220, 360, 440, 24, [255, 255, 255, 100])
  writePng(join(root, 'ui', 'gameover-bg.png'), w, h, rgba)
}

/** Retry button — 2x (480×144). Paint "再来一次" into the PNG. */
function makeBtnRetry() {
  const w = 480
  const h = 144
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const red = [231, 76, 60, 255]
  const redDark = [192, 57, 43, 255]
  const r = 24
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inRect =
        x >= r &&
        x < w - r &&
        y >= 8 &&
        y < h - 8 &&
        (y >= r || x >= r + (r - y) || x < w - r - (r - y)) &&
        (y < h - r || x >= r + (y - (h - r)) || x < w - r - (y - (h - r)))
      if (inRect) px(rgba, w, x, y, y < h / 2 ? red : redDark)
    }
  }
  fillRect(rgba, w, 120, 56, 240, 14, [255, 255, 255, 255])
  fillRect(rgba, w, 160, 82, 160, 10, [255, 255, 255, 255])
  writePng(join(root, 'ui', 'btn-retry.png'), w, h, rgba)
}

/** Mic permission background — 2x (1920×1080). Paint copy into the PNG. */
function makeMicBg() {
  const w = 1920
  const h = 1080
  const rgba = Buffer.alloc(w * h * 4)
  const teal = [36, 92, 110, 255]
  clear(rgba, teal)
  for (let y = 0; y < h; y++) {
    const t = y / h
    for (let x = 0; x < w; x++) {
      const edge = Math.abs(x - w / 2) / (w / 2)
      const dark = Math.min(1, t * 0.25 + edge * 0.18)
      px(rgba, w, x, y, [
        Math.floor(teal[0] * (1 - dark * 0.45)),
        Math.floor(teal[1] * (1 - dark * 0.3)),
        Math.floor(teal[2] * (1 - dark * 0.15)),
        255,
      ])
    }
  }
  // Simple mic silhouette (placeholder icon, above title bars)
  const ink = [245, 240, 230, 255]
  fillRect(rgba, w, w / 2 - 48, 120, 96, 140, ink)
  fillRect(rgba, w, w / 2 - 36, 132, 72, 116, teal)
  fillRect(rgba, w, w / 2 - 12, 260, 24, 56, ink)
  fillRect(rgba, w, w / 2 - 64, 308, 128, 16, ink)
  fillRect(rgba, w, w / 2 - 80, 248, 16, 76, ink)
  fillRect(rgba, w, w / 2 + 64, 248, 16, 76, ink)
  // Title / subtitle placeholder bars — leave Y≈780 clear for the button
  fillRect(rgba, w, w / 2 - 360, 400, 720, 80, [20, 20, 20, 160])
  fillRect(rgba, w, w / 2 - 280, 424, 560, 32, [245, 240, 230, 255])
  fillRect(rgba, w, w / 2 - 240, 520, 480, 24, [245, 240, 230, 140])
  writePng(join(root, 'ui', 'mic-bg.png'), w, h, rgba)
}

/** Enable-mic button — 2x (480×144). Paint "开启麦克风" into the PNG. */
function makeBtnMic() {
  const w = 480
  const h = 144
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)
  const green = [46, 204, 113, 255]
  const greenDark = [39, 174, 96, 255]
  const r = 24
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inRect =
        x >= r &&
        x < w - r &&
        y >= 8 &&
        y < h - 8 &&
        (y >= r || x >= r + (r - y) || x < w - r - (r - y)) &&
        (y < h - r || x >= r + (y - (h - r)) || x < w - r - (y - (h - r)))
      if (inRect) px(rgba, w, x, y, y < h / 2 ? green : greenDark)
    }
  }
  fillRect(rgba, w, 120, 56, 240, 14, [255, 255, 255, 255])
  fillRect(rgba, w, 160, 82, 160, 10, [255, 255, 255, 255])
  writePng(join(root, 'ui', 'btn-mic.png'), w, h, rgba)
}

/** Rules screen background — 2x (1920×1080). Paint rule copy into the PNG. */
function makeRulesBg() {
  const w = 1920
  const h = 1080
  const rgba = Buffer.alloc(w * h * 4)
  clear(rgba, SKY)
  // Title placeholder — display Y≈80
  fillRect(rgba, w, w / 2 - 280, 120, 560, 80, [INK[0], INK[1], INK[2], 40])
  fillRect(rgba, w, w / 2 - 180, 144, 360, 32, INK)
  // Five rule-line placeholders — display Y≈160 + i*44
  for (let i = 0; i < 5; i++) {
    const y = 280 + i * 88
    const barW = 720 - i * 24
    fillRect(rgba, w, w / 2 - barW / 2, y, barW, 28, [INK[0], INK[1], INK[2], 70])
  }
  // Hint: any key or click continues (paint into the PNG)
  fillRect(rgba, w, w / 2 - 200, 980, 400, 20, [INK[0], INK[1], INK[2], 55])
  writePng(join(root, 'ui', 'rules-bg.png'), w, h, rgba)
}

/** Character portrait sheet — 2 frames horizontal, 2x frame 480×640. */
function makeCharPortrait(id) {
  const frameW = 480
  const frameH = 640
  const w = frameW * 2
  const h = frameH
  const rgba = Buffer.alloc(w * h * 4)
  makeTransparent(rgba)

  const tint =
    id === 'a'
      ? [20, 20, 20, 255]
      : [40, 40, 40, 255]
  const tintHover =
    id === 'a'
      ? [46, 204, 113, 255]
      : [52, 152, 219, 255]

  function drawPortrait(frameX, color, excited) {
    const cx = frameX + frameW / 2
    // head
    fillRect(rgba, w, cx - 56, 48, 112, 112, color)
    // body
    fillRect(rgba, w, cx - 72, 168, 144, 220, color)
    // legs
    fillRect(rgba, w, cx - 64, 388, 56, 180, color)
    fillRect(rgba, w, cx + 8, 388, 56, 180, color)
    if (excited) {
      // arms up (hover frame)
      fillRect(rgba, w, cx - 140, 180, 68, 28, color)
      fillRect(rgba, w, cx + 72, 180, 68, 28, color)
    } else {
      fillRect(rgba, w, cx - 120, 220, 48, 120, color)
      fillRect(rgba, w, cx + 72, 220, 48, 120, color)
    }
  }

  drawPortrait(0, tint, false)
  drawPortrait(frameW, tintHover, true)
  writePng(join(root, 'ui', `char-${id}.png`), w, h, rgba)
}

function writeSilentWav(path, durationSec = 0.08, freq = 660) {
  const sampleRate = 22050
  const n = Math.floor(sampleRate * durationSec)
  const dataSize = n * 2
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const env = Math.max(0, 1 - t / durationSec)
    const sample = Math.floor(Math.sin(2 * Math.PI * freq * t) * 6000 * env)
    buf.writeInt16LE(sample, 44 + i * 2)
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, buf)
}

const ONLY = new Set(process.argv.slice(2).filter((a) => !a.startsWith('-')))

function run(name, fn) {
  if (ONLY.size === 0 || ONLY.has(name)) fn()
}

run('player-run', makePlayerRun)
run('player-fly', makePlayerFly)
run('bg-far', makeBgFar)
run('bg-near', makeBgNear)
run('ground', makeGround)
run('low-wall', makeLowWall)
run('high-wall', makeHighWall)
run('vine', makeVine)
run('square', makeAirSquare)
run('square2', makeAirSquare2)
run('end', makeEndBanner)
run('coin', makeCoin)
run('sfx', () => {
  writeSilentWav(join(root, 'sfx', 'coin.wav'), 0.1)
  writeSilentWav(join(root, 'sfx', 'hit.wav'), 0.15)
  writeSilentWav(join(root, 'sfx', 'fly.wav'), 0.12)
  writeSilentWav(join(root, 'sfx', 'select.wav'), 0.08, 880)
})
run('sfx-select', () => writeSilentWav(join(root, 'sfx', 'select.wav'), 0.08, 880))
run('title-bg', makeTitleBg)
run('btn-start', makeBtnStart)
run('win-bg', makeWinBg)
run('btn-replay', makeBtnReplay)
run('gameover-bg', makeGameOverBg)
run('btn-retry', makeBtnRetry)
run('mic-bg', makeMicBg)
run('btn-mic', makeBtnMic)
run('rules-bg', makeRulesBg)
run('char-a', () => makeCharPortrait('a'))
run('char-b', () => makeCharPortrait('b'))

console.log(
  ONLY.size
    ? `Wrote selected assets: ${[...ONLY].join(', ')}`
    : 'Silhouette assets written to public/assets/ (pass names to limit, e.g. vine square)',
)
