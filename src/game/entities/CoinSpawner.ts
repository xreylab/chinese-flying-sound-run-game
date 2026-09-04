import Phaser from 'phaser'
import type { CollectibleDef } from '../levels/testLevel'

const COIN_DISPLAY = 28

/**
 * Level-placed coins. Scroll with the world; overlap collection is handled in PlayScene.
 */
export class CoinSpawner {
  group: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      allowGravity: false,
    })
  }

  placeLevel(defs: CollectibleDef[]): void {
    this.clear()
    for (const def of defs) {
      const spr = this.group.create(def.x, def.y, 'coin') as Phaser.Physics.Arcade.Sprite
      spr.setDisplaySize(COIN_DISPLAY, COIN_DISPLAY)
      spr.setDepth(6)
      const body = spr.body as Phaser.Physics.Arcade.Body
      const hit = Math.max(12, COIN_DISPLAY - 6)
      body.setSize(hit, hit)
      body.setOffset((spr.width - hit) / 2, (spr.height - hit) / 2)
      spr.refreshBody()
    }
  }

  update(deltaMs: number, advancing: boolean, speed: number): void {
    if (!advancing) return
    this.group.children.each((child) => {
      const spr = child as Phaser.Physics.Arcade.Sprite
      spr.x -= (speed * deltaMs) / 1000
      spr.rotation += deltaMs * 0.004
      if (spr.x < -40) spr.destroy()
      return true
    })
  }

  clear(): void {
    this.group.clear(true, true)
  }
}
