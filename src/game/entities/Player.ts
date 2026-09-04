import Phaser from 'phaser'
import {
  FALL_BOOST_VY,
  FALL_GRAVITY,
  FLY_AIRBORNE_ALTITUDE,
  FLY_CRUISE_PULL,
  FLY_HOVER_AMPLITUDE,
  FLY_HOVER_HZ,
  FLY_LIFT,
  FLY_SILENCE_GRAVITY,
  GRAVITY,
  GROUND_STAND_FROM_BOTTOM,
  MAX_DOWN_SPEED,
  MAX_UP_SPEED,
  PLAYER_FRAME_HEIGHT,
  PLAYER_SCALE,
  PLAYER_X,
  TAKEOFF_ASCENT_MULT,
  TAKEOFF_FRAME2_ALTITUDE,
  TAKEOFF_FRAME3_ALTITUDE,
  TAKEOFF_MAX_UP_SPEED,
} from '../config'
import { getCharacter, PLAYER_TAKEOFF_FRAMES } from '../characters'

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite
  private flying = false
  private wasFlying = false
  private fastFall = false
  private hoverPhase = 0
  private hasLift = false
  private hasBeenAirborne = false
  private readonly walkKey: string
  private readonly walkAnim: string
  private readonly takeoffKey: string
  private takeoffFrame = -1
  private readonly sceneHeight: number

  constructor(scene: Phaser.Scene) {
    const character = getCharacter(scene.registry.get('characterId'))
    this.walkKey = character.walkKey
    this.walkAnim = character.walkAnim
    this.takeoffKey = character.takeoffKey
    this.sceneHeight = scene.scale.height

    // Feet on the stand line (center origin → subtract half display height).
    const standY =
      this.sceneHeight -
      GROUND_STAND_FROM_BOTTOM -
      (PLAYER_FRAME_HEIGHT * PLAYER_SCALE) / 2
    this.sprite = scene.physics.add.sprite(PLAYER_X, standY, this.walkKey, 0)
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setDepth(10)
    this.sprite.setScale(PLAYER_SCALE)
    this.syncBody()
  }

  updateFlight(
    canFly: boolean,
    targetY: number,
    deltaMs = 16,
    advancing = false,
    hasLift = true,
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.flying = canFly
    this.hasLift = canFly && hasLift

    if (this.flying) {
      if (this.feetAltitude() >= FLY_AIRBORNE_ALTITUDE) {
        this.hasBeenAirborne = true
      }

      if (this.hasLift) {
        this.fastFall = false
        body.setGravityY(0)

        // Continuous sine bob around target — works even when world is not scrolling
        this.hoverPhase += (deltaMs / 1000) * FLY_HOVER_HZ * Math.PI * 2
        const hoverY = targetY + Math.sin(this.hoverPhase) * FLY_HOVER_AMPLITUDE

        const dy = this.sprite.y - hoverY
        const inTakeoffClimb = this.feetAltitude() < TAKEOFF_FRAME3_ALTITUDE
        const ascent = inTakeoffClimb ? TAKEOFF_ASCENT_MULT : 1
        const pull = FLY_CRUISE_PULL * ascent * Math.max(-1, Math.min(1, dy / 70))
        const liftBoost = dy > 5 ? FLY_LIFT * ascent * Math.min(1, dy / 90) : 0
        body.setAccelerationY(-(pull + liftBoost))

        const maxUp = inTakeoffClimb ? TAKEOFF_MAX_UP_SPEED : MAX_UP_SPEED
        if (body.velocity.y < maxUp) body.setVelocityY(maxUp)
        if (body.velocity.y > MAX_DOWN_SPEED) body.setVelocityY(MAX_DOWN_SPEED)

        // Light damp only — do not snap/freeze so hover keeps moving
        if (Math.abs(dy) < 10) {
          body.setVelocityY(body.velocity.y * 0.9)
        }

        this.sprite.setAngle(
          this.takeoffFrame === PLAYER_TAKEOFF_FRAMES - 1
            ? Math.sin(this.hoverPhase) * 4
            : 0,
        )
      } else {
        // Silent flight: fall under gravity; keep takeoff/cruise poses by altitude.
        this.hoverPhase = 0
        body.setGravityY(FLY_SILENCE_GRAVITY)
        body.setAccelerationY(0)
        if (body.velocity.y > MAX_DOWN_SPEED * 1.5) {
          body.setVelocityY(MAX_DOWN_SPEED * 1.5)
        }
        this.sprite.setAngle(0)
      }

      this.updateTakeoffPoseByAltitude()
    } else {
      this.hoverPhase = 0
      this.hasBeenAirborne = false
      this.hasLift = false
      if (this.wasFlying) {
        this.fastFall = true
        body.setVelocityY(Math.max(body.velocity.y, FALL_BOOST_VY))
      }
      if (this.fastFall) {
        body.setGravityY(FALL_GRAVITY)
        if (body.blocked.down || body.touching.down) {
          this.fastFall = false
          body.setGravityY(GRAVITY)
        }
      } else {
        body.setGravityY(GRAVITY)
      }
      body.setAccelerationY(0)

      if (this.sprite.texture.key !== this.walkKey) {
        this.sprite.anims.stop()
        this.sprite.setTexture(this.walkKey, 0)
        this.takeoffFrame = -1
        this.syncBody()
      }
      if (advancing) {
        if (
          !this.sprite.anims.isPlaying ||
          this.sprite.anims.currentAnim?.key !== this.walkAnim
        ) {
          this.sprite.play(this.walkAnim, true)
        }
      } else if (this.sprite.anims.isPlaying) {
        this.sprite.anims.stop()
        this.sprite.setFrame(0)
      }
      this.sprite.setAngle(0)
    }

    this.wasFlying = this.flying
    this.sprite.x = PLAYER_X
    body.setVelocityX(0)
  }

  /** Crash-land after having been airborne while silent in flight mode. */
  didCrashLand(): boolean {
    if (!this.flying || !this.hasBeenAirborne || this.hasLift) return false
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    return body.blocked.down || body.touching.down
  }

  /** Reset flight-side flags for a new round (position set by scene). */
  resetFlightState(): void {
    this.flying = false
    this.wasFlying = false
    this.fastFall = false
    this.hoverPhase = 0
    this.hasLift = false
    this.hasBeenAirborne = false
    this.takeoffFrame = -1
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setGravityY(GRAVITY)
    body.setAccelerationY(0)
    body.setVelocity(0, 0)
    this.sprite.anims.stop()
    this.sprite.setTexture(this.walkKey, 0)
    this.sprite.setAngle(0)
    this.syncBody()
  }

  get isFlying(): boolean {
    return this.flying
  }

  destroy(): void {
    this.sprite.destroy()
  }

  /** Feet altitude above the stand line (px). */
  private feetAltitude(): number {
    const groundY = this.sceneHeight - GROUND_STAND_FROM_BOTTOM
    const feetY = this.sprite.y + this.sprite.displayHeight / 2
    return groundY - feetY
  }

  /**
   * Frame 0 on/near ground; frame 1 after TAKEOFF_FRAME2_ALTITUDE;
   * frame 2 (cruise) after TAKEOFF_FRAME3_ALTITUDE.
   */
  private updateTakeoffPoseByAltitude(): void {
    const alt = this.feetAltitude()
    let frame = 0
    if (alt >= TAKEOFF_FRAME3_ALTITUDE) frame = 2
    else if (alt >= TAKEOFF_FRAME2_ALTITUDE) frame = 1

    if (this.sprite.anims.isPlaying) this.sprite.anims.stop()
    if (this.sprite.texture.key !== this.takeoffKey || this.takeoffFrame !== frame) {
      this.sprite.setTexture(this.takeoffKey, frame)
      this.takeoffFrame = frame
      this.syncBody()
    }
  }

  /** Keep a compact hitbox centered in the current frame. */
  private syncBody(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const frame = this.sprite.frame
    const fw = frame.realWidth
    const fh = frame.realHeight
    const bw = 16
    const bh = Math.min(44, fh - 8)
    body.setSize(bw, bh)
    body.setOffset((fw - bw) / 2, Math.max(0, fh - bh - 6))
  }
}
