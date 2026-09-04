import Phaser from 'phaser'
import {
  CHARACTERS,
  PLAYER_FRAME_H,
  PLAYER_FRAME_W,
  PLAYER_TAKEOFF_FRAME_H,
  PLAYER_TAKEOFF_FRAME_W,
  PLAYER_TAKEOFF_FRAMES,
  PLAYER_TAKEOFF_FPS,
  PLAYER_WALK_FPS,
  PLAYER_WALK_FRAMES,
  type CharacterId,
} from '../characters'
import {
  UI_BTN_START_KEY,
  UI_BTN_REPLAY_KEY,
  UI_BTN_RETRY_KEY,
  UI_BTN_MIC_KEY,
  UI_CHAR_FRAME_H,
  UI_CHAR_FRAME_W,
  UI_CHAR_KEYS,
  UI_GAMEOVER_BG_KEY,
  UI_MIC_BG_KEY,
  UI_RULES_BG_KEY,
  UI_TITLE_BG_KEY,
  UI_WIN_BG_KEY,
} from '../config'
import { BGM_MENU_KEY, BGM_MENU_PATH, startMenuBgm } from '../menuBgm'

/** Loads assets from stable logical paths under /assets/. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    const w = this.cameras.main.width
    this.add.rectangle(w / 2, this.cameras.main.height / 2, 240, 12, 0xdddddd)
    const fill = this.add.rectangle(w / 2 - 118, this.cameras.main.height / 2, 4, 8, 0x222222)
    this.load.on('progress', (p: number) => {
      fill.width = 4 + 232 * p
      fill.x = w / 2 - 118 + fill.width / 2
    })

    const ids: CharacterId[] = ['a', 'b']
    for (const id of ids) {
      const def = CHARACTERS[id]
      this.load.spritesheet(def.walkKey, `assets/player/${id}/walk.png`, {
        frameWidth: PLAYER_FRAME_W,
        frameHeight: PLAYER_FRAME_H,
      })
      this.load.spritesheet(def.takeoffKey, `assets/player/${id}/takeoff.png`, {
        frameWidth: PLAYER_TAKEOFF_FRAME_W,
        frameHeight: PLAYER_TAKEOFF_FRAME_H,
      })
    }

    // Shared fly pose until per-character fly sheets exist.
    this.load.image('player-fly', 'assets/player/fly.png')
    // Legacy single-frame fallback (unused by walk path).
    this.load.image('player-run', 'assets/player/run.png')

    // bg-far = static sky/sun; bg-near = drifting cloud layer (prefer transparent PNG)
    this.load.image('bg-far', 'assets/world/bg-far.png')
    this.load.image('bg-near', 'assets/world/bg-near.png')
    this.load.image('ground', 'assets/world/ground.png')
    // Logical names: low wall / high wall (files keep stable paths for custom swap)
    this.load.image('obstacle-low', 'assets/obstacles/ground-a.png')
    this.load.image('obstacle-high', 'assets/obstacles/air-a.png')
    this.load.image('obstacle-vine', 'assets/obstacles/vine.png')
    this.load.image('obstacle-square', 'assets/obstacles/square.png')
    this.load.image('obstacle-square2', 'assets/obstacles/square2.png')
    this.load.image('obstacle-end', 'assets/obstacles/end.png')
    this.load.image('coin', 'assets/collectibles/coin.png')
    this.load.audio('sfx-coin', 'assets/sfx/coin.wav')
    this.load.audio('sfx-hit', 'assets/sfx/hit.wav')
    this.load.audio('sfx-fly', 'assets/sfx/fly.wav')
    this.load.audio('sfx-select', 'assets/sfx/select.wav')
    this.load.audio('sfx-win', 'assets/sfx/win.ogg')
    this.load.audio(BGM_MENU_KEY, BGM_MENU_PATH)

    this.load.image(UI_TITLE_BG_KEY, 'assets/ui/title-bg.png')
    this.load.image(UI_BTN_START_KEY, 'assets/ui/btn-start.png')
    this.load.image(UI_WIN_BG_KEY, 'assets/ui/win-bg.png')
    this.load.image(UI_BTN_REPLAY_KEY, 'assets/ui/btn-replay.png')
    this.load.image(UI_GAMEOVER_BG_KEY, 'assets/ui/gameover-bg.png')
    this.load.image(UI_BTN_RETRY_KEY, 'assets/ui/btn-retry.png')
    this.load.image(UI_MIC_BG_KEY, 'assets/ui/mic-bg.png')
    this.load.image(UI_BTN_MIC_KEY, 'assets/ui/btn-mic.png')
    this.load.image(UI_RULES_BG_KEY, 'assets/ui/rules-bg.png')
    for (const id of ids) {
      this.load.spritesheet(UI_CHAR_KEYS[id], `assets/ui/char-${id}.png`, {
        frameWidth: UI_CHAR_FRAME_W,
        frameHeight: UI_CHAR_FRAME_H,
      })
    }
  }

  create(): void {
    for (const id of ['a', 'b'] as CharacterId[]) {
      const def = CHARACTERS[id]
      if (!this.anims.exists(def.walkAnim)) {
        this.anims.create({
          key: def.walkAnim,
          frames: this.anims.generateFrameNumbers(def.walkKey, {
            start: 0,
            end: PLAYER_WALK_FRAMES - 1,
          }),
          frameRate: PLAYER_WALK_FPS,
          repeat: -1,
        })
      }
      if (!this.anims.exists(def.takeoffAnim)) {
        this.anims.create({
          key: def.takeoffAnim,
          frames: this.anims.generateFrameNumbers(def.takeoffKey, {
            start: 0,
            end: PLAYER_TAKEOFF_FRAMES - 1,
          }),
          frameRate: PLAYER_TAKEOFF_FPS,
          repeat: 0,
        })
      }
    }
    // Menu BGM: try immediately after load; unlock on any first gesture if blocked.
    startMenuBgm(this.sound)
    this.scene.start('TitleScene')
  }
}
