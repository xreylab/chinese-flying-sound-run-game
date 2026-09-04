import Phaser from 'phaser'
import {
  CLOUD_SCROLL_FACTOR,
  FLY_CRUISE_Y,
  FLY_SPEED_BOOST_MAX,
  FLY_VOLUME_LOUD_RMS,
  FLY_VOLUME_NORMAL_RMS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_HEIGHT,
  GROUND_SCROLL_SPEED,
  GROUND_STAND_FROM_BOTTOM,
  GROUND_VISUAL_LIFT,
  GROUND_VOICE_RMS,
  LEVEL_FINISH_X,
  PLAYER_FRAME_HEIGHT,
  PLAYER_SCALE,
  PLAYER_X,
  SCROLL_SPEED,
  UI_BTN_MIC_KEY,
  UI_BTN_REPLAY_KEY,
  UI_BTN_RETRY_KEY,
  UI_GAMEOVER_BG_KEY,
  UI_GAMEOVER_BTN_DISPLAY_H,
  UI_GAMEOVER_BTN_DISPLAY_W,
  UI_GAMEOVER_BTN_Y,
  UI_MIC_BG_KEY,
  UI_MIC_BTN_DISPLAY_H,
  UI_MIC_BTN_DISPLAY_W,
  UI_MIC_BTN_Y,
  UI_WIN_BG_KEY,
  UI_WIN_BTN_DISPLAY_H,
  UI_WIN_BTN_DISPLAY_W,
  UI_WIN_BTN_Y,
} from '../config'
import { Player } from '../entities/Player'
import { ObstacleSpawner } from '../entities/ObstacleSpawner'
import { CoinSpawner } from '../entities/CoinSpawner'
import { TEST_COLLECTIBLES, TEST_LEVEL } from '../levels/testLevel'
import { Hud } from '../../ui/Hud'
import { openMicrophone, type MicHandle } from '../../voice/mic'
import { SingingDetector, type SingingFrame } from '../../voice/singingDetector'
import { PhraseRecognizer } from '../../voice/phraseRecognizer'
import { FlyGate } from '../../voice/flyGate'
import { stopMenuBgm } from '../menuBgm'

/** Normal volume → base SCROLL_SPEED; louder → up to FLY_SPEED_BOOST_MAX×. */
function flightSpeedFromVolume(volume: number): number {
  if (volume <= FLY_VOLUME_NORMAL_RMS) return SCROLL_SPEED
  const span = Math.max(0.001, FLY_VOLUME_LOUD_RMS - FLY_VOLUME_NORMAL_RMS)
  const t = Math.max(0, Math.min(1, (volume - FLY_VOLUME_NORMAL_RMS) / span))
  return SCROLL_SPEED * (1 + (FLY_SPEED_BOOST_MAX - 1) * t)
}

export class PlayScene extends Phaser.Scene {
  private player!: Player
  private obstacles!: ObstacleSpawner
  private coins!: CoinSpawner
  private hud!: Hud
  private ground!: Phaser.Physics.Arcade.StaticGroup
  private bgClouds!: Phaser.GameObjects.TileSprite
  /** Converts screen px scroll → tilePositionX (accounts for tileScale). */
  private cloudTileScaleX = 1
  private groundTile!: Phaser.GameObjects.TileSprite

  private score = 0
  /** Total world px scrolled this run; player world X ≈ PLAYER_X + worldScrollX. */
  private worldScrollX = 0
  private playing = false
  private mic: MicHandle | null = null
  private singing: SingingDetector | null = null
  private phrases: PhraseRecognizer | null = null
  private flyGate = new FlyGate()
  private micReady = false
  private statusText = '点击「开启麦克风」授权'
  private spaceKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private overlay!: Phaser.GameObjects.Container
  private gameOverOverlay!: Phaser.GameObjects.Container
  private winOverlay!: Phaser.GameObjects.Container
  private lastCanFly = false

  constructor() {
    super('PlayScene')
  }

  create(): void {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor(0x7ec8e3)
    // Sky + sun: one stretched image, never moves.
    this.add
      .image(0, 0, 'bg-far')
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setDepth(0)
    // Clouds: TileSprite wraps a seamless texture forever (one tile = full viewport).
    this.bgClouds = this.add.tileSprite(0, 0, width, height, 'bg-near').setOrigin(0, 0).setDepth(1)
    const cloudSrc = this.textures.get('bg-near').getSourceImage() as { width: number; height: number }
    const tw = Math.max(1, cloudSrc.width)
    const th = Math.max(1, cloudSrc.height)
    this.cloudTileScaleX = width / tw
    this.bgClouds.setTileScale(this.cloudTileScaleX, height / th)
    this.groundTile = this.add
      .tileSprite(0, height - GROUND_HEIGHT - GROUND_VISUAL_LIFT, width, GROUND_HEIGHT, 'ground')
      .setOrigin(0, 0)
      .setDepth(2)
    // Native 384×84 tiles — do not stretch (keeps horizontal seam seamless).
    this.groundTile.setTileScale(1, 1)

    this.ground = this.physics.add.staticGroup()
    // Collision top = stand line (60px from bottom); visual ground may be taller.
    this.ground
      .create(width / 2, height - GROUND_STAND_FROM_BOTTOM / 2, 'ground')
      .setDisplaySize(width, GROUND_STAND_FROM_BOTTOM)
      .setVisible(false)
      .refreshBody()

    this.player = new Player(this)
    this.obstacles = new ObstacleSpawner(this)
    this.coins = new CoinSpawner(this)
    this.hud = new Hud(this)

    this.physics.add.collider(this.player.sprite, this.ground)
    this.physics.add.collider(this.player.sprite, this.obstacles.group)
    this.physics.add.overlap(this.player.sprite, this.obstacles.hazards, () => {
      if (!this.playing) return
      this.sound.play('sfx-hit', { volume: 0.45 })
      this.showGameOver()
    })
    this.physics.add.overlap(this.player.sprite, this.coins.group, (_p, coin) => {
      const c = coin as Phaser.Physics.Arcade.Sprite
      c.destroy()
      this.score += 10
      this.sound.play('sfx-coin', { volume: 0.4 })
    })

    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)

    this.phrases = new PhraseRecognizer()
    this.buildOverlay()
    this.buildGameOverOverlay()
    this.buildWinOverlay()
    this.playing = false

    this.events.once('shutdown', () => this.teardownVoice())
  }

  private buildOverlay(): void {
    const { width, height } = this.scale
    // Full-screen custom art (copy should be painted into the PNG).
    const bg = this.add
      .image(width / 2, height / 2, UI_MIC_BG_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)

    const micBtn = this.add
      .image(width / 2, UI_MIC_BTN_Y, UI_BTN_MIC_KEY)
      .setDisplaySize(UI_MIC_BTN_DISPLAY_W, UI_MIC_BTN_DISPLAY_H)
      .setInteractive({ useHandCursor: true })
    micBtn.on('pointerdown', () => void this.startGame())

    this.overlay = this.add.container(0, 0, [bg, micBtn]).setDepth(200)
  }

  private buildGameOverOverlay(): void {
    const { width, height } = this.scale
    // Full-screen custom art (copy should be painted into the PNG).
    const bg = this.add
      .image(width / 2, height / 2, UI_GAMEOVER_BG_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)

    const retryBtn = this.add
      .image(width / 2, UI_GAMEOVER_BTN_Y, UI_BTN_RETRY_KEY)
      .setDisplaySize(UI_GAMEOVER_BTN_DISPLAY_W, UI_GAMEOVER_BTN_DISPLAY_H)
      .setInteractive({ useHandCursor: true })
    retryBtn.on('pointerdown', () => void this.startGame())

    this.gameOverOverlay = this.add
      .container(0, 0, [bg, retryBtn])
      .setDepth(210)
      .setVisible(false)
  }

  private buildWinOverlay(): void {
    const { width, height } = this.scale
    // Full-screen custom art (title / score copy should be painted into the PNG).
    const bg = this.add
      .image(width / 2, height / 2, UI_WIN_BG_KEY)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)

    const replayBtn = this.add
      .image(width / 2, UI_WIN_BTN_Y, UI_BTN_REPLAY_KEY)
      .setDisplaySize(UI_WIN_BTN_DISPLAY_W, UI_WIN_BTN_DISPLAY_H)
      .setInteractive({ useHandCursor: true })
    replayBtn.on('pointerdown', () => void this.startGame())

    this.winOverlay = this.add.container(0, 0, [bg, replayBtn]).setDepth(210).setVisible(false)
  }

  private freezePlayer(): void {
    this.playing = false
    this.lastCanFly = false
    this.flyGate.reset()
    this.sound.stopByKey('sfx-fly')
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAccelerationY(0)
    body.setGravityY(0)
  }

  private showGameOver(): void {
    this.freezePlayer()
    this.statusText = 'Game Over'
    this.winOverlay.setVisible(false)
    this.gameOverOverlay.setVisible(true)
  }

  private showWin(): void {
    this.freezePlayer()
    this.statusText = '胜利'
    this.gameOverOverlay.setVisible(false)
    this.winOverlay.setVisible(true)
    this.sound.play('sfx-win', { volume: 0.5 })
  }

  private async startGame(): Promise<void> {
    // Stop menu BGM when gameplay actually starts (mic overlay kept music playing).
    stopMenuBgm(this)
    this.sound.stopByKey('sfx-win')
    this.overlay.setVisible(false)
    this.gameOverOverlay.setVisible(false)
    this.winOverlay.setVisible(false)
    this.score = 0
    this.worldScrollX = 0
    this.obstacles.clear()
    this.coins.clear()
    this.obstacles.placeLevel(TEST_LEVEL)
    this.coins.placeLevel(TEST_COLLECTIBLES)
    this.player.resetFlightState()
    this.player.sprite.setPosition(
      PLAYER_X,
      this.scale.height -
        GROUND_STAND_FROM_BOTTOM -
        (PLAYER_FRAME_HEIGHT * PLAYER_SCALE) / 2,
    )

    try {
      if (!this.mic) {
        this.mic = await openMicrophone()
        if (this.mic.audioContext.state === 'suspended') {
          await this.mic.audioContext.resume()
        }
        this.singing = new SingingDetector(this.mic.analyser)
      }
      this.phrases?.clearMatch()
      this.flyGate.reset()
      this.phrases?.setFlightMode(false)
      this.lastCanFly = false
      this.phrases?.start()
      this.micReady = true
      this.statusText = '说话前进；唱「中国人能飞」起飞'
      this.playing = true
    } catch {
      this.micReady = false
      this.statusText = '麦克风失败；空格起飞，↑↓调高度'
      this.playing = true
      this.phrases?.setFlightMode(false)
      this.lastCanFly = false
    }
  }

  update(_time: number, delta: number): void {
    let singingFrame: SingingFrame = {
      rawSinging: false,
      isSingingSpectrum: false,
      voiceKind: 'silent',
      volume: 0,
      pitchHz: 0,
      smoothVolume: 0,
      smoothPitchHz: 0,
      smoothLift: 0,
      spectrumBars: [],
    }

    if (this.singing && this.micReady) {
      singingFrame = this.singing.update(delta)
    }

    // —— Mode isolation ——
    // Ground walk: live mic energy only (silence → stop). Singing alone does not walk.
    // Takeoff: singing + phrase「中国人能飞」. Flight: always advance; pitch → height; silence → fall.
    const inFlight = this.lastCanFly
    if (inFlight) {
      this.phrases?.setFlightMode(true)
      this.phrases?.clearSingingContext()
    } else {
      this.phrases?.setFlightMode(false)
      this.phrases?.setSingingContext(
        singingFrame.isSingingSpectrum || singingFrame.voiceKind === 'singing',
      )
    }

    let phraseMatched = this.phrases?.phraseMatched ?? false

    // Dev: Space arms flight on ground only; ↑/↓ = pitch while flying
    let debugPitchNorm: number | null = null
    if (this.spaceKey.isDown && !inFlight) {
      phraseMatched = true
      singingFrame = {
        ...singingFrame,
        isSingingSpectrum: true,
        voiceKind: 'singing',
        smoothLift: Math.max(singingFrame.smoothLift, 0.8),
      }
    }
    if (this.upKey.isDown) {
      debugPitchNorm = 1
    } else if (this.downKey.isDown) {
      debugPitchNorm = 0
    }

    const rawVoice = singingFrame.volume
    // Ground: raw RMS only — smoothVolume decays slowly and felt like coasting after speech.
    // Active singing alone never walks (takeoff still needs singing + phrase in FlyGate).
    const groundedVoicing = rawVoice >= GROUND_VOICE_RMS && !singingFrame.rawSinging

    // While paused (Game Over), do not re-arm flight — otherwise canFly stays edged
    // against lastCanFly=false and sfx-fly spam-stacks into a drone.
    const gate = this.playing
      ? this.flyGate.update(phraseMatched, singingFrame, delta, debugPitchNorm)
      : {
          canFly: false,
          hasLift: false,
          phraseMatched: false,
          isSingingSpectrum: false,
          flyHoldActive: false,
          flyHoldRemainingMs: 0,
          smoothLift: 0,
          rawSinging: singingFrame.rawSinging,
          targetY: FLY_CRUISE_Y,
          pitchSteerActive: false,
        }

    if (this.playing && gate.canFly && !this.lastCanFly) {
      this.phrases?.setFlightMode(true)
      this.phrases?.clearSingingContext()
      this.phrases?.clearFeiLatch()
      this.sound.play('sfx-fly', { volume: 0.25 })
      this.statusText = '出声控高 · 停声下落 · 大声加速'
    } else if (this.playing && !gate.canFly && this.lastCanFly) {
      this.phrases?.setFlightMode(false)
      this.phrases?.clearFeiLatch()
    }

    // Flight: always scroll forward (volume can boost speed). Ground: any live sound.
    const wantAdvance = gate.canFly ? true : groundedVoicing
    const wallBlocked = this.obstacles.isBlockingForward(this.player.sprite)
    const advancing = this.playing && wantAdvance && !wallBlocked

    if (this.playing) {
      const flyVol = Math.max(singingFrame.volume, singingFrame.smoothVolume)
      const speed = gate.canFly
        ? flightSpeedFromVolume(flyVol)
        : GROUND_SCROLL_SPEED

      if (advancing) {
        const boosted = gate.canFly && speed > SCROLL_SPEED * 1.05
        const step = (speed * delta) / 1000
        const cloudStep = (speed * CLOUD_SCROLL_FACTOR * delta) / 1000
        // tilePosition is in texture px; divide by tileScale so motion matches screen px.
        this.bgClouds.tilePositionX += cloudStep / this.cloudTileScaleX
        this.groundTile.tilePositionX += step
        this.worldScrollX += step
        this.coins.update(delta, true, speed)
        this.score += Math.floor(delta * 0.01 * (boosted ? 1.25 : 1))
      }

      // Always update hazards so bobbing continues even when scroll is paused.
      this.obstacles.update(delta, advancing, speed)

      this.player.updateFlight(gate.canFly, gate.targetY, delta, advancing, gate.hasLift)
      this.lastCanFly = gate.canFly

      if (PLAYER_X + this.worldScrollX >= LEVEL_FINISH_X) {
        this.showWin()
      } else if (this.player.didCrashLand()) {
        this.showGameOver()
      } else if (gate.canFly) {
        if (wallBlocked) {
          this.statusText = '被矮墙挡住 · 用音调调高度绕开'
        } else if (!gate.hasLift) {
          this.statusText = '下落中 · 出声可拉升'
        } else {
          const flyVol = Math.max(singingFrame.volume, singingFrame.smoothVolume)
          const boosted = flyVol > FLY_VOLUME_NORMAL_RMS
          this.statusText = boosted
            ? '大声加速中 · 音调控制高低'
            : '出声控高 · 停声下落 · 大声可加速'
        }
      } else if (wallBlocked && groundedVoicing) {
        this.statusText = '被矮墙挡住 · 飞过去再前进'
      } else if (singingFrame.rawSinging) {
        this.statusText = '检测到歌唱 · 唱「中国人能飞」起飞'
      } else if (!groundedVoicing) {
        this.statusText = '出声即可前进 · 停声即停'
      } else {
        this.statusText = '前进中 · 唱「中国人能飞」起飞'
      }
    }

    if (this.phrases?.errorMessage) {
      this.statusText = this.phrases.errorMessage
    }

    this.hud.update({
      phraseMatched: gate.canFly ? false : gate.phraseMatched,
      phraseProgress: gate.canFly ? 0 : (this.phrases?.phraseProgress ?? 0),
      isSingingSpectrum: gate.canFly ? false : gate.isSingingSpectrum,
      canFly: gate.canFly,
      flyHoldActive: gate.flyHoldActive,
      pitchSteerActive: gate.pitchSteerActive,
      score: this.score,
      micReady: this.micReady,
      statusText: this.statusText,
      transcript: this.phrases?.transcript ?? '',
      voiceKind: gate.canFly
        ? gate.hasLift && singingFrame.volume > 0.002
          ? 'speech'
          : 'silent'
        : singingFrame.voiceKind,
      spectrumBars: singingFrame.spectrumBars,
      advancing,
      wallBlocked,
    })
  }

  private teardownVoice(): void {
    this.phrases?.stop()
    this.mic?.stop()
    this.mic = null
    this.singing = null
  }
}
