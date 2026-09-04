import { SINGING, SINGING_SILENCE_GRACE_MS, SMOOTH_ALPHA, SPECTRUM_BARS } from '../game/config'

export type VoiceKind = 'silent' | 'speech' | 'singing'

export type SingingFrame = {
  rawSinging: boolean
  isSingingSpectrum: boolean
  voiceKind: VoiceKind
  volume: number
  pitchHz: number
  smoothVolume: number
  smoothPitchHz: number
  smoothLift: number
  /** Normalized 0–1 bars for HUD spectrum (low→high freq). */
  spectrumBars: number[]
}

function lowPass(prev: number, next: number, alpha = SMOOTH_ALPHA): number {
  return prev + alpha * (next - prev)
}

function detectPitch(timeDomain: Float32Array, sampleRate: number): number {
  const size = timeDomain.length
  let rms = 0
  for (let i = 0; i < size; i++) rms += timeDomain[i]! * timeDomain[i]!
  rms = Math.sqrt(rms / size)
  if (rms < SINGING.minVolume * 0.5) return 0

  const minLag = Math.floor(sampleRate / SINGING.maxPitchHz)
  const maxLag = Math.floor(sampleRate / SINGING.minPitchHz)
  let bestLag = -1
  let bestCorr = 0
  let energy = 0
  for (let i = 0; i < size; i++) energy += timeDomain[i]! * timeDomain[i]!

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < size - lag; i++) {
      corr += timeDomain[i]! * timeDomain[i + lag]!
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  // Require correlation relative to energy (rejects noisy speech bursts)
  if (bestLag < 0 || energy <= 0 || bestCorr / energy < 0.25) return 0
  return sampleRate / bestLag
}

function spectralFlatnessAndHarmonics(freq: Float32Array): {
  flatness: number
  harmonicRatio: number
} {
  let logSum = 0
  let sum = 0
  let count = 0
  // Focus on voice band bins (skip DC / very high)
  const start = 2
  const end = Math.min(freq.length, Math.floor(freq.length * 0.45))
  for (let i = start; i < end; i++) {
    const v = Math.max(1e-12, freq[i]!)
    logSum += Math.log(v)
    sum += v
    count++
  }
  const geo = Math.exp(logSum / count)
  const arith = sum / count
  const flatness = geo / arith

  const band = Array.from(freq.subarray(start, end)).sort((a, b) => b - a)
  const top = band.slice(0, 6).reduce((a, b) => a + b, 0)
  const harmonicRatio = sum > 0 ? top / sum : 0
  return { flatness, harmonicRatio }
}

function buildSpectrumBars(freqDb: Float32Array, barCount: number): number[] {
  const bars: number[] = []
  const usable = Math.floor(freqDb.length * 0.5)
  const binPerBar = Math.max(1, Math.floor(usable / barCount))
  for (let b = 0; b < barCount; b++) {
    let sum = 0
    const from = b * binPerBar
    for (let i = from; i < from + binPerBar && i < usable; i++) {
      // Map dB (~-100..0) to 0..1
      sum += Math.min(1, Math.max(0, (freqDb[i]! + 90) / 70))
    }
    bars.push(sum / binPerBar)
  }
  return bars
}

export class SingingDetector {
  private timeDomain: Float32Array
  private freqDomain: Float32Array
  private prevLinear: Float32Array | null = null
  private smoothVolume = 0
  private smoothPitch = 0
  private smoothLift = 0
  private lastPitch = 0
  private stableMs = 0
  private wasRawSinging = false
  private silenceGraceMs = 0
  private pitchHistory: number[] = []
  private analyser: AnalyserNode

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser
    this.timeDomain = new Float32Array(analyser.fftSize)
    this.freqDomain = new Float32Array(analyser.frequencyBinCount)
  }

  update(deltaMs: number): SingingFrame {
    this.analyser.getFloatTimeDomainData(this.timeDomain as unknown as Float32Array<ArrayBuffer>)
    this.analyser.getFloatFrequencyData(this.freqDomain as unknown as Float32Array<ArrayBuffer>)

    const linear = new Float32Array(this.freqDomain.length)
    for (let i = 0; i < this.freqDomain.length; i++) {
      linear[i] = Math.pow(10, this.freqDomain[i]! / 20)
    }

    let spectralFlux = 0
    if (this.prevLinear) {
      let diff = 0
      let norm = 0
      const n = Math.min(linear.length, this.prevLinear.length, Math.floor(linear.length * 0.45))
      for (let i = 2; i < n; i++) {
        const d = linear[i]! - this.prevLinear[i]!
        if (d > 0) diff += d
        norm += linear[i]!
      }
      spectralFlux = norm > 0 ? diff / norm : 0
    }
    this.prevLinear = linear

    let rms = 0
    for (let i = 0; i < this.timeDomain.length; i++) {
      rms += this.timeDomain[i]! * this.timeDomain[i]!
    }
    rms = Math.sqrt(rms / this.timeDomain.length)

    const pitchHz = detectPitch(this.timeDomain, this.analyser.context.sampleRate)
    const { flatness, harmonicRatio } = spectralFlatnessAndHarmonics(linear)
    const spectrumBars = buildSpectrumBars(this.freqDomain, SPECTRUM_BARS)

    let pitchStable = false
    if (pitchHz > 0) {
      const jump = this.lastPitch > 0 ? Math.abs(pitchHz - this.lastPitch) : 0
      if (this.lastPitch === 0 || jump <= SINGING.maxPitchJumpHz) {
        this.stableMs += deltaMs
      } else {
        this.stableMs = 0
      }
      this.lastPitch = pitchHz
      this.pitchHistory.push(pitchHz)
      if (this.pitchHistory.length > SINGING.pitchHistorySize) this.pitchHistory.shift()
      pitchStable = this.stableMs >= SINGING.minStableMs
    } else {
      this.lastPitch = 0
      this.stableMs = 0
      this.pitchHistory = []
    }

    let pitchStd = 0
    if (this.pitchHistory.length >= 8) {
      const mean = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length
      const varSum = this.pitchHistory.reduce((a, b) => a + (b - mean) ** 2, 0)
      pitchStd = Math.sqrt(varSum / this.pitchHistory.length)
    }

    const rawSinging =
      rms >= SINGING.minVolume &&
      pitchHz >= SINGING.minPitchHz &&
      pitchHz <= SINGING.maxPitchHz &&
      pitchStable &&
      flatness <= SINGING.maxSpectralFlatness &&
      harmonicRatio >= SINGING.minHarmonicRatio &&
      pitchStd <= SINGING.maxPitchStdHz &&
      spectralFlux <= SINGING.maxSpectralFlux

    if (rawSinging) {
      this.silenceGraceMs = SINGING_SILENCE_GRACE_MS
    } else if (this.wasRawSinging || this.silenceGraceMs > 0) {
      this.silenceGraceMs = Math.max(0, this.silenceGraceMs - deltaMs)
    }
    this.wasRawSinging = rawSinging

    const isSingingSpectrum = rawSinging || this.silenceGraceMs > 0

    let voiceKind: VoiceKind = 'silent'
    if (isSingingSpectrum) voiceKind = 'singing'
    else if (rms >= SINGING.speechVolume) voiceKind = 'speech'

    this.smoothVolume = lowPass(this.smoothVolume, rms)
    this.smoothPitch = lowPass(this.smoothPitch, pitchHz > 0 ? pitchHz : this.smoothPitch)

    const targetLift = isSingingSpectrum ? Math.min(1, this.smoothVolume * 12) : 0
    this.smoothLift = lowPass(this.smoothLift, targetLift)

    return {
      rawSinging,
      isSingingSpectrum,
      voiceKind,
      volume: rms,
      pitchHz,
      smoothVolume: this.smoothVolume,
      smoothPitchHz: this.smoothPitch,
      smoothLift: this.smoothLift,
      spectrumBars,
    }
  }
}
