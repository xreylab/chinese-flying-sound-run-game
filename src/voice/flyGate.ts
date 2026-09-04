import {
  FLY_ARM_SINGING_MEMORY_MS,
  FLY_CRUISE_Y,
  FLY_HEIGHT_LOW_Y,
  FLY_HEIGHT_TOP_Y,
  FLY_LIVE_VOICE_HANG_MS,
  FLY_LIVE_VOICE_RMS,
  FLY_PITCH_CURVE_EXP,
  FLY_PITCH_MAX_HZ,
  FLY_PITCH_MIN_HZ,
  FLY_STEER_ARM_IGNORE_MS,
} from '../game/config'
import type { SingingFrame } from './singingDetector'

export type FlyGateState = {
  canFly: boolean
  /** True while voice is providing lift (or brief hang / takeoff ignore). */
  hasLift: boolean
  phraseMatched: boolean
  isSingingSpectrum: boolean
  flyHoldActive: boolean
  flyHoldRemainingMs: number
  smoothLift: number
  rawSinging: boolean
  targetY: number
  /** True while flying and pitch may steer height. */
  pitchSteerActive: boolean
}

/**
 * Persistent flight: phrase + singing arms flying until reset().
 * While flying: auto-advance is handled by PlayScene; voiced pitch steers height;
 * silence (after hang) drops hasLift so the player falls under gravity.
 */
export class FlyGate {
  private flyingActive = false
  private steeredY = FLY_CRUISE_Y
  /** Counts down while we still credit recent singing for ASR lag. */
  private singingMemoryMs = 0
  /** Brief hold at mid height after takeoff so phrase-end pitch does not yank. */
  private steerIgnoreMs = 0
  /** Brief grace after voice drops so pitch flicker does not instantly cut lift. */
  private voiceHangMs = 0

  update(
    phraseMatched: boolean,
    singing: SingingFrame,
    deltaMs: number,
    debugPitchNorm: number | null = null,
  ): FlyGateState {
    if (!this.flyingActive) {
      if (singing.isSingingSpectrum || singing.voiceKind === 'singing') {
        this.singingMemoryMs = FLY_ARM_SINGING_MEMORY_MS
      } else if (this.singingMemoryMs > 0) {
        this.singingMemoryMs = Math.max(0, this.singingMemoryMs - deltaMs)
      }
    } else {
      this.singingMemoryMs = 0
    }

    const singingOk = !this.flyingActive && (singing.isSingingSpectrum || this.singingMemoryMs > 0)
    const wasFlying = this.flyingActive
    if (!this.flyingActive && phraseMatched && (singing.isSingingSpectrum || this.singingMemoryMs > 0)) {
      this.flyingActive = true
      this.steerIgnoreMs = FLY_STEER_ARM_IGNORE_MS
      this.steeredY = FLY_CRUISE_Y
      this.singingMemoryMs = 0
      this.voiceHangMs = FLY_LIVE_VOICE_HANG_MS
    }

    if (this.steerIgnoreMs > 0) {
      this.steerIgnoreMs = Math.max(0, this.steerIgnoreMs - deltaMs)
    }

    const voiced =
      singing.volume >= FLY_LIVE_VOICE_RMS || singing.smoothVolume >= FLY_LIVE_VOICE_RMS
    const hz = singing.pitchHz > 0 ? singing.pitchHz : singing.smoothPitchHz
    const livePitch = voiced && hz > 0
    const debugSteer = debugPitchNorm !== null

    if (this.flyingActive) {
      if (livePitch || debugSteer || this.steerIgnoreMs > 0) {
        this.voiceHangMs = FLY_LIVE_VOICE_HANG_MS
      } else if (this.voiceHangMs > 0) {
        this.voiceHangMs = Math.max(0, this.voiceHangMs - deltaMs)
      }
    } else {
      this.voiceHangMs = 0
    }

    const hasLift =
      this.flyingActive &&
      (this.steerIgnoreMs > 0 || this.voiceHangMs > 0 || livePitch || debugSteer)

    const pitchSteerActive = this.flyingActive && this.steerIgnoreMs <= 0 && hasLift
    let targetY = this.steeredY

    if (this.flyingActive) {
      if (this.steerIgnoreMs > 0 || !wasFlying) {
        targetY = FLY_CRUISE_Y
        this.steeredY = FLY_CRUISE_Y
      } else if (debugPitchNorm !== null) {
        targetY = this.pitchNormToY(debugPitchNorm)
        this.steeredY = targetY
      } else if (livePitch) {
        targetY = this.hzToY(hz)
        this.steeredY = targetY
      } else {
        // Silence: do not lock altitude; Player falls when !hasLift.
        targetY = this.steeredY
      }
    }

    return {
      canFly: this.flyingActive,
      hasLift,
      phraseMatched,
      isSingingSpectrum: this.flyingActive ? false : singingOk || singing.isSingingSpectrum,
      flyHoldActive: pitchSteerActive,
      flyHoldRemainingMs: pitchSteerActive ? 1 : 0,
      smoothLift: hasLift ? 1 : 0,
      rawSinging: singing.rawSinging,
      targetY,
      pitchSteerActive,
    }
  }

  private hzToY(hz: number): number {
    const span = Math.max(1, FLY_PITCH_MAX_HZ - FLY_PITCH_MIN_HZ)
    let t = (hz - FLY_PITCH_MIN_HZ) / span
    t = Math.max(0, Math.min(1, t))
    t = Math.pow(t, 1 / FLY_PITCH_CURVE_EXP)
    return FLY_HEIGHT_LOW_Y + (FLY_HEIGHT_TOP_Y - FLY_HEIGHT_LOW_Y) * t
  }

  /** 0 = lowest, 1 = top of screen (debug ↑/↓). */
  private pitchNormToY(norm: number): number {
    const clamped = Math.max(0, Math.min(1, norm))
    const t = Math.pow(clamped, 1 / FLY_PITCH_CURVE_EXP)
    return FLY_HEIGHT_LOW_Y + (FLY_HEIGHT_TOP_Y - FLY_HEIGHT_LOW_Y) * t
  }

  reset(): void {
    this.flyingActive = false
    this.steeredY = FLY_CRUISE_Y
    this.singingMemoryMs = 0
    this.steerIgnoreMs = 0
    this.voiceHangMs = 0
  }
}
