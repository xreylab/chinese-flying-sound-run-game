import Phaser from 'phaser'
import {
  GAME_HEIGHT,
  GROUND_STAND_FROM_BOTTOM,
  HAZARD_HITBOX_SHRINK,
  HIGH_WALL_HEIGHT,
  LOW_WALL_HEIGHT,
  SQUARE_BOB_AMP,
  SQUARE_BOB_HZ,
  SQUARE_SIZE,
  VINE_HEIGHT,
  VINE_WIDTH,
} from '../config'
import type { ObstacleDef } from '../levels/testLevel'

export class ObstacleSpawner {
  /** Ground walls / finish banner — walls may block advance. */
  group: Phaser.Physics.Arcade.Group
  /** Air vines / squares — lethal on overlap, do not block scroll. */
  hazards: Phaser.Physics.Arcade.Group
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    })
    this.hazards = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    })
  }

  placeLevel(defs: ObstacleDef[]): void {
    this.clear()
    const h = this.scene.scale.height
    const groundTop = h - GROUND_STAND_FROM_BOTTOM

    for (const def of defs) {
      if (def.type === 'end') {
        // Finish line — visual only (no collision / no block).
        const endW = 60
        const endH = GAME_HEIGHT
        const spr = this.group.create(
          def.x,
          endH / 2,
          'obstacle-end',
        ) as Phaser.Physics.Arcade.Sprite
        spr.setDisplaySize(endW, endH)
        spr.setDepth(5)
        spr.setData('marker', true)
        const body = spr.body as Phaser.Physics.Arcade.Body
        body.enable = false
        continue
      }

      if (def.type === 'vine') {
        this.placeHazard(def.x, def.y ?? VINE_HEIGHT / 2 + 8, 'obstacle-vine', VINE_WIDTH, VINE_HEIGHT)
        continue
      }

      if (def.type === 'square') {
        const cy = def.y ?? h / 2
        const size = def.size ?? SQUARE_SIZE
        const tex = def.texture ?? 'obstacle-square'
        const bobAmp =
          def.bobAmp ?? (tex === 'obstacle-square' ? SQUARE_BOB_AMP : 0)
        const bobHz =
          def.bobHz ?? (tex === 'obstacle-square' ? SQUARE_BOB_HZ : 0)
        this.placeHazard(def.x, cy, tex, size, size, bobAmp, bobHz)
        continue
      }

      if (def.type === 'high') {
        const wallH = HIGH_WALL_HEIGHT
        const spr = this.group.create(
          def.x,
          groundTop - wallH / 2,
          'obstacle-high',
        ) as Phaser.Physics.Arcade.Sprite
        spr.setDisplaySize(48, wallH)
        spr.setDepth(8)
        const body = spr.body as Phaser.Physics.Arcade.Body
        body.setSize(48, wallH)
        body.setOffset(0, 0)
        spr.refreshBody()
      } else if (def.type === 'low') {
        const wallH = LOW_WALL_HEIGHT
        const spr = this.group.create(
          def.x,
          groundTop - wallH / 2,
          'obstacle-low',
        ) as Phaser.Physics.Arcade.Sprite
        spr.setDisplaySize(70, wallH)
        spr.setDepth(8)
        const body = spr.body as Phaser.Physics.Arcade.Body
        body.setSize(70, wallH)
        spr.refreshBody()
      }
    }
  }

  private placeHazard(
    x: number,
    centerY: number,
    texture: string,
    displayW: number,
    displayH: number,
    bobAmp = 0,
    bobHz = 0,
  ): void {
    const spr = this.hazards.create(x, centerY, texture) as Phaser.Physics.Arcade.Sprite
    spr.setDisplaySize(displayW, displayH)
    spr.setDepth(9)
    spr.setData('hazard', true)
    spr.setData('baseY', centerY)
    if (bobAmp > 0 && bobHz > 0) {
      spr.setData('bobAmp', bobAmp)
      spr.setData('bobHz', bobHz)
      spr.setData('bobPhase', (x * 0.02) % (Math.PI * 2))
    }
    const body = spr.body as Phaser.Physics.Arcade.Body
    // World hitbox slightly smaller than display; convert to frame space when scaled.
    const worldW = Math.max(8, displayW - HAZARD_HITBOX_SHRINK * 2)
    const worldH = Math.max(8, displayH - HAZARD_HITBOX_SHRINK * 2)
    const bw = worldW / spr.scaleX
    const bh = worldH / spr.scaleY
    body.setSize(bw, bh)
    body.setOffset((spr.width - bw) / 2, (spr.height - bh) / 2)
    spr.refreshBody()
  }

  /**
   * Scroll left while advancing; bobbing hazards always update Y.
   * Call every playing frame (pass advancing=false to bob without scrolling).
   */
  update(deltaMs: number, advancing: boolean, speed: number): void {
    const step = advancing ? (speed * deltaMs) / 1000 : 0

    if (step !== 0) {
      this.group.children.each((child) => {
        const spr = child as Phaser.Physics.Arcade.Sprite
        spr.x -= step
        if (spr.x < -160) spr.destroy()
        return true
      })
    }

    this.hazards.children.each((child) => {
      const spr = child as Phaser.Physics.Arcade.Sprite
      if (step !== 0) spr.x -= step
      if (spr.x < -160) {
        spr.destroy()
        return true
      }
      const amp = spr.getData('bobAmp') as number | undefined
      const hz = spr.getData('bobHz') as number | undefined
      if (amp && hz) {
        const phase = (spr.getData('bobPhase') as number) + (deltaMs / 1000) * hz * Math.PI * 2
        spr.setData('bobPhase', phase)
        const baseY = spr.getData('baseY') as number
        spr.y = baseY + Math.sin(phase) * amp
      }
      return true
    })
  }

  /**
   * True when an obstacle sits in front of the player and overlaps vertically —
   * used to stop world scroll so walls block advance without ending the game.
   */
  isBlockingForward(player: Phaser.Physics.Arcade.Sprite): boolean {
    const pBody = player.body as Phaser.Physics.Arcade.Body
    const pLeft = pBody.x
    const pRight = pBody.right
    const pTop = pBody.y
    const pBottom = pBody.bottom
    let blocked = false

    this.group.children.each((child) => {
      const spr = child as Phaser.Physics.Arcade.Sprite
      if (spr.getData('marker')) return true
      const oBody = spr.body as Phaser.Physics.Arcade.Body | null
      if (!oBody || !oBody.enable) return true

      const oLeft = oBody.x
      const oRight = oBody.right
      const oTop = oBody.y
      const oBottom = oBody.bottom

      const verticalOverlap = pBottom > oTop + 4 && pTop < oBottom - 4
      const inFront = oLeft >= pLeft - 2 && oLeft <= pRight + 12
      const overlapping = oLeft < pRight + 2 && oRight > pLeft

      if (verticalOverlap && (inFront || overlapping) && oLeft + 8 > pLeft) {
        blocked = true
        return false
      }
      return true
    })

    return blocked
  }

  clear(): void {
    this.group.clear(true, true)
    this.hazards.clear(true, true)
  }
}
