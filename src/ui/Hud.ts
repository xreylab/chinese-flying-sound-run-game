import Phaser from 'phaser'
import type { VoiceKind } from '../voice/singingDetector'

export type HudFlags = {
  phraseMatched: boolean
  phraseProgress: number
  isSingingSpectrum: boolean
  canFly: boolean
  flyHoldActive: boolean
  pitchSteerActive: boolean
  score: number
  micReady: boolean
  statusText: string
  transcript: string
  voiceKind: VoiceKind
  spectrumBars: number[]
  advancing: boolean
  wallBlocked: boolean
}

export class Hud {
  private scoreText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.scoreText = scene.add
      .text(16, 36, '分数 0', {
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#1a1a1a',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(100)
  }

  update(flags: HudFlags): void {
    this.scoreText.setText(`分数 ${flags.score}`)
  }
}
