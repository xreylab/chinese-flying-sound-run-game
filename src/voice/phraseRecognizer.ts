import { FLY_ARM_SINGING_MEMORY_MS, FLY_FEI_PULSE_DEBOUNCE_MS, PHRASE_HOLD_MS, TARGET_PHRASE } from '../game/config'

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: { transcript: string; confidence?: number }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

/** How long to keep ASR fragments for cumulative matching (sung speech is bursty). */
const BUFFER_MS = 7000

/** Ordered syllable classes for 中国人能飞 (ASR often swaps lookalikes). */
const TARGET_SLOTS: RegExp[] = [
  /[中钟终忠仲肿盅踵]/,
  /[国果过锅郭帼]/,
  /[人仁任认]/,
  /[能会弄嫩]/,
  /[飞非菲费肥匪废啡斐妃沸肺吠翡扉]/,
]

const FEI_SLOT = TARGET_SLOTS[4]!

/** Looser ASR aliases — sung Chinese is often partial / rearranged. */
const PHRASE_ALIASES = [
  '中国人能飞',
  '中国人会飞',
  '中国人能非',
  '中国人能菲',
  '中国人能费',
  '中国人能飞了',
  '中国人能飞啊',
  '中國人能飛',
  '中國人會飛',
  '中国人飞',
  '国人能飞',
  '中国能飞',
  '人能飞',
  '中国人能',
  '能飞',
]

function normalize(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?;；：:"""''（）()【】\[\]~～…·]/g, '')
}

function softenHomophones(text: string): string {
  return text
    .replace(/[飛非菲费肥匪废啡斐妃沸肺吠翡扉]/g, '飞')
    .replace(/[會会弄嫩]/g, '能')
    .replace(/[國果过锅郭帼]/g, '国')
    .replace(/[钟终忠仲肿盅踵]/g, '中')
    .replace(/[仁任认]/g, '人')
}

/** How many target syllables appear in order (0–5). */
export function orderedHitCount(text: string): number {
  const soft = softenHomophones(normalize(text))
  let hit = 0
  for (const ch of soft) {
    if (hit < TARGET_SLOTS.length && TARGET_SLOTS[hit]!.test(ch)) {
      hit++
    }
  }
  return hit
}

/** Relaxed match: aliases, wide gaps, or 4/5 ordered syllables. */
function strongPhraseMatch(text: string): boolean {
  const soft = softenHomophones(normalize(text))
  if (!soft) return false
  if (soft.includes(TARGET_PHRASE)) return true
  if (PHRASE_ALIASES.some((p) => soft.includes(softenHomophones(normalize(p))))) return true
  // Wide gaps for ASR insertions between syllables
  if (/中.{0,4}国.{0,4}人.{0,4}能.{0,4}飞/.test(soft)) return true
  if (/中.{0,3}国.{0,3}人.{0,3}飞/.test(soft)) return true
  return orderedHitCount(soft) >= 4
}

export function containsFeiHomophone(text: string): boolean {
  const soft = softenHomophones(normalize(text))
  if (!soft) return false
  if (/fei|fēi|fèi|飛/i.test(text)) return true
  // Single-syllable shouts and common ASR tails
  if (/飞|非|菲|费|肺|吠/.test(soft)) return true
  return [...soft].some((ch) => FEI_SLOT.test(ch))
}

type BufferChunk = { at: number; text: string }

export class PhraseRecognizer {
  private recognition: SpeechRecognitionLike | null = null
  private matchUntil = 0
  private feiUntil = 0
  private feiPulseCount = 0
  private lastFeiPulseAt = 0
  private lastTranscript = ''
  private running = false
  private supported = false
  private buffer: BufferChunk[] = []
  private progress = 0
  private singingContextUntil = 0
  /** Ground = phrase+sing arming; flight = only 飞 pulses (phrase/singing rules off). */
  private flightMode = false
  errorMessage: string | null = null

  constructor() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) {
      this.supported = false
      this.errorMessage = '当前浏览器不支持语音识别，请使用 Chrome / Edge'
      return
    }
    this.supported = true
    this.recognition = new Ctor()
    this.recognition.lang = 'zh-CN'
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.maxAlternatives = 5

    this.recognition.onresult = (ev) => {
      const now = performance.now()
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i]
        if (!result) continue
        for (let a = 0; a < result.length; a++) {
          const alt = result[a]
          if (!alt) continue
          const text = alt.transcript
          if (a === 0) this.lastTranscript = text
          this.pushChunk(now, text)
        }
      }
      this.recomputeMatch(now)
    }

    this.recognition.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        this.errorMessage = '麦克风或语音识别权限被拒绝'
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        this.errorMessage = `语音识别错误: ${ev.error}`
      }
    }

    this.recognition.onend = () => {
      if (this.running && this.recognition) {
        try {
          this.recognition.start()
        } catch {
          // ignore restart races
        }
      }
    }
  }

  /** While / recently singing, accept a looser syllable bar (ground mode only). */
  setSingingContext(active: boolean): void {
    if (this.flightMode) return
    if (active) {
      this.singingContextUntil = performance.now() + FLY_ARM_SINGING_MEMORY_MS
      this.recomputeMatch(performance.now())
    }
  }

  clearSingingContext(): void {
    this.singingContextUntil = 0
  }

  /**
   * Switch ASR rule set.
   * Flight mode: stop phrase/singing matching; only enqueue 飞 pulses for hop advance.
   */
  setFlightMode(on: boolean): void {
    if (this.flightMode === on) return
    this.flightMode = on
    this.matchUntil = 0
    this.singingContextUntil = 0
    this.feiUntil = 0
    this.feiPulseCount = 0
    this.lastFeiPulseAt = 0
    this.progress = 0
    if (on) {
      // Drop ground-mode buffer so 「中国人能飞」 does not keep looking like new 飞.
      this.buffer = []
      this.lastTranscript = ''
    }
  }

  /** Bounce SpeechRecognition so short「飞」interim results arrive more reliably. */
  restartListening(): void {
    if (!this.recognition || !this.running) return
    try {
      this.recognition.stop()
    } catch {
      // onend will restart when running
    }
  }

  get isFlightMode(): boolean {
    return this.flightMode
  }

  private get singingContext(): boolean {
    return !this.flightMode && performance.now() < this.singingContextUntil
  }

  private pushChunk(at: number, text: string): void {
    const n = normalize(text)
    if (!n) return
    const last = this.buffer[this.buffer.length - 1]
    if (last && last.text === n && at - last.at < 200) {
      last.at = at
      return
    }
    this.buffer.push({ at, text: n })
    this.prune(at)
  }

  private prune(now: number): void {
    this.buffer = this.buffer.filter((c) => now - c.at <= BUFFER_MS)
  }

  private combinedText(now: number): string {
    this.prune(now)
    return this.buffer.map((c) => c.text).join('')
  }

  private noteFei(now: number, text: string): void {
    if (!containsFeiHomophone(text)) return
    if (this.flightMode) {
      // Refresh generously so PlayScene pending stays hot while repeating 飞.
      this.feiUntil = now + 1400
      if (now - this.lastFeiPulseAt >= FLY_FEI_PULSE_DEBOUNCE_MS) {
        this.feiPulseCount += 1
        this.lastFeiPulseAt = now
      }
      return
    }
    this.feiUntil = now + 900
  }

  private recomputeMatch(now: number): void {
    const combined = this.combinedText(now)
    const latest = softenHomophones(normalize(this.lastTranscript))
    const pool = softenHomophones(combined)

    // Flight mode: no phrase / singing — scan every alternative chunk for 飞 only.
    if (this.flightMode) {
      this.progress = 0
      this.matchUntil = 0
      this.singingContextUntil = 0
      this.noteFei(now, latest)
      this.noteFei(now, this.lastTranscript)
      this.noteFei(now, pool)
      for (const chunk of this.buffer) {
        this.noteFei(now, chunk.text)
      }
      return
    }

    this.progress = Math.max(orderedHitCount(latest), orderedHitCount(pool))

    const hit =
      strongPhraseMatch(latest) ||
      strongPhraseMatch(pool) ||
      this.progress >= 4 ||
      (this.singingContext && this.progress >= 3)

    if (hit) {
      this.matchUntil = now + PHRASE_HOLD_MS
    }

    // Ground mode still tracks 飞 latch for HUD, but does not enqueue flight pulses.
    if (containsFeiHomophone(latest) || containsFeiHomophone(this.lastTranscript)) {
      this.feiUntil = now + 900
    }
  }

  get isSupported(): boolean {
    return this.supported
  }

  get phraseMatched(): boolean {
    if (this.flightMode) return false
    return performance.now() < this.matchUntil
  }

  /** Recently heard 飞 / homophone (pitch steer while flying). */
  get heardFei(): boolean {
    return performance.now() < this.feiUntil
  }

  /** Consume one ASR 飞 pulse for a forward hop. */
  consumeFeiPulse(): boolean {
    if (this.feiPulseCount <= 0) return false
    this.feiPulseCount -= 1
    return true
  }

  /** 0–5 syllables matched in order toward 中国人能飞. */
  get phraseProgress(): number {
    if (this.flightMode) return 0
    if (this.phraseMatched) return 5
    return this.progress
  }

  get transcript(): string {
    return this.lastTranscript
  }

  clearMatch(): void {
    this.matchUntil = 0
    this.feiUntil = 0
    this.feiPulseCount = 0
    this.lastFeiPulseAt = 0
    this.singingContextUntil = 0
    this.flightMode = false
    this.buffer = []
    this.progress = 0
    this.lastTranscript = ''
  }

  clearFeiLatch(): void {
    this.feiUntil = 0
    this.feiPulseCount = 0
    this.lastFeiPulseAt = 0
  }

  start(): void {
    if (!this.recognition || this.running) return
    this.running = true
    this.errorMessage = null
    try {
      this.recognition.start()
    } catch {
      // already started
    }
  }

  stop(): void {
    this.running = false
    try {
      this.recognition?.stop()
    } catch {
      // ignore
    }
  }
}
