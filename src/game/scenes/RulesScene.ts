import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, UI_RULES_BG_KEY } from '../config'

/** Show rules; any key or click continues to PlayScene. */
export class RulesScene extends Phaser.Scene {
  private advanced = false

  constructor() {
    super('RulesScene')
  }

  create(): void {
    const { width, height } = this.scale
    this.advanced = false

    this.add
      .image(width / 2, height / 2, UI_RULES_BG_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)

    this.input.keyboard?.on('keydown', this.advance, this)
    this.input.on('pointerdown', this.advance, this)
  }

  private advance(): void {
    if (this.advanced) return
    this.advanced = true
    this.input.keyboard?.off('keydown', this.advance, this)
    this.input.off('pointerdown', this.advance, this)
    this.scene.start('PlayScene')
  }
}
