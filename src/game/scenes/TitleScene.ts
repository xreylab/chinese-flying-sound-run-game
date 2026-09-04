import Phaser from 'phaser'
import {
  DEFAULT_CHARACTER_ID,
  type CharacterId,
} from '../characters'
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  UI_BTN_DISPLAY_H,
  UI_BTN_DISPLAY_W,
  UI_BTN_START_KEY,
  UI_BTN_Y,
  UI_CHAR_DISPLAY_H,
  UI_CHAR_DISPLAY_W,
  UI_CHAR_GAP,
  UI_CHAR_KEYS,
  UI_CHAR_Y,
  UI_TITLE_BG_KEY,
} from '../config'

type CharCard = {
  id: CharacterId
  sprite: Phaser.GameObjects.Sprite
  hovered: boolean
}

/** Character select + start. */
export class TitleScene extends Phaser.Scene {
  private selected: CharacterId = DEFAULT_CHARACTER_ID
  private cards: CharCard[] = []

  constructor() {
    super('TitleScene')
  }

  create(): void {
    const { width, height } = this.scale

    this.add
      .image(width / 2, height / 2, UI_TITLE_BG_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)

    const ids: CharacterId[] = ['a', 'b']
    const totalW = UI_CHAR_DISPLAY_W * 2 + UI_CHAR_GAP
    ids.forEach((id, i) => {
      const x =
        width / 2 -
        totalW / 2 +
        UI_CHAR_DISPLAY_W / 2 +
        i * (UI_CHAR_DISPLAY_W + UI_CHAR_GAP)
      this.cards.push(this.makeCharCard(id, x, UI_CHAR_Y))
    })

    this.refreshSelection()

    const startBtn = this.add
      .image(width / 2, UI_BTN_Y, UI_BTN_START_KEY)
      .setDisplaySize(UI_BTN_DISPLAY_W, UI_BTN_DISPLAY_H)
      .setInteractive({ useHandCursor: true })

    startBtn.on('pointerdown', () => {
      this.registry.set('characterId', this.selected)
      this.scene.start('RulesScene')
    })
  }

  private makeCharCard(id: CharacterId, x: number, y: number): CharCard {
    const sprite = this.add
      .sprite(x, y, UI_CHAR_KEYS[id], 0)
      .setDisplaySize(UI_CHAR_DISPLAY_W, UI_CHAR_DISPLAY_H)
      .setInteractive({ useHandCursor: true })

    const card: CharCard = { id, sprite, hovered: false }

    sprite.on('pointerover', () => {
      card.hovered = true
      sprite.setFrame(1)
    })
    sprite.on('pointerout', () => {
      card.hovered = false
      if (this.selected !== id) sprite.setFrame(0)
    })
    sprite.on('pointerdown', () => {
      this.sound.play('sfx-select', { volume: 0.45 })
      this.selected = id
      this.refreshSelection()
    })

    return card
  }

  private refreshSelection(): void {
    for (const card of this.cards) {
      const on = card.id === this.selected
      if (on || card.hovered) {
        card.sprite.setFrame(1)
      } else {
        card.sprite.setFrame(0)
      }
    }
  }
}
