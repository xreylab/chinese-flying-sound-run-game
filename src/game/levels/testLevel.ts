export type ObstacleDef = {
  /**
   * low/high: block path until flown over.
   * vine/square: lethal air hazards (Game Over on touch).
   * end: finish-line visual only (no collision).
   */
  type: 'low' | 'high' | 'vine' | 'square' | 'end'
  /** World X at level start (player at PLAYER_X ≈ 180). */
  x: number
  /**
   * Screen-space center Y for air hazards (vine / square).
   * Ignored for ground types.
   */
  y?: number
  /** Optional display size for square hazards (default SQUARE_SIZE). */
  size?: number
  /**
   * Optional Phaser texture key for square hazards.
   * Default: `obstacle-square` → assets/obstacles/square.png
   * Large boss block uses `obstacle-square2` → square2.png
   */
  texture?: string
  /** Vertical bob amplitude in px (sine around `y`). */
  bobAmp?: number
  /** Vertical bob frequency in Hz. */
  bobHz?: number
}

export type CollectibleDef = {
  /** World X at level start (player at PLAYER_X ≈ 180). */
  x: number
  /** Screen-space center Y. */
  y: number
}

/** One low wall near the start — blocks walking until the player flies over once. */
const BLOCKING_WALLS: ObstacleDef[] = [
  { type: 'low', x: 900 },
]

/**
 * Air hazards — dodge by pitch height.
 * Vine hangs from upper sky (center Y ≈ half height + margin).
 * Squares sit on high / mid / low flight lanes.
 */
const AIR_HAZARDS: ObstacleDef[] = [
  // Vine from top — fly under (gap under vine ≈ 110px+)
  { type: 'vine', x: 1200, y: 220 / 2 },
  { type: 'vine', x: 2100, y: 220 },
  { type: 'vine', x: 3000, y: 220 / 2 },
  { type: 'vine', x: 4000, y: 340 },
  { type: 'vine', x: 5000, y: 130 },
  { type: 'vine', x: 6000, y: 340 },
  // Squares on different altitudes
  { type: 'square', x: 1550, y: 140 },
  { type: 'square', x: 2300, y: 360 },
  { type: 'square', x: 2700, y: 200 },
  { type: 'square', x: 3300, y: 300 },
  { type: 'square', x: 3600, y: 200 },
  { type: 'square', x: 4200, y: 200 },
  { type: 'square', x: 4600, y: 250 },
  { type: 'square', x: 5300, y: 150 },
  { type: 'square', x: 5700, y: 250 },
  // Large standalone square — art: assets/obstacles/square2.png (bobs vertically)
  { type: 'square', x: 8300, y: 250, size: 120, texture: 'obstacle-square2', bobAmp: 140, bobHz: 0.25 },
]

/**
 * Coins start after x=1200 (past the first vine).
 * Edit x/y here the same way as air hazards.
 */
export const TEST_COLLECTIBLES: CollectibleDef[] = [
  { x: 1320, y: 280 },
  { x: 1380, y: 300 },
  { x: 1440, y: 260 },
  { x: 1680, y: 220 },
  { x: 1750, y: 180 },
  { x: 1950, y: 320 },
  { x: 2020, y: 280 },
  { x: 2450, y: 200 },
  { x: 2520, y: 240 },
  { x: 2580, y: 280 },
  { x: 2900, y: 360 },
  { x: 3150, y: 120 },
  { x: 3500, y: 200 },
  { x: 3800, y: 100 },
  { x: 4000, y: 200 },
  { x: 4400, y: 140 },
  { x: 4800, y: 200 },
  { x: 5100, y: 340 },
  { x: 5500, y: 220 },
  { x: 5900, y: 120 },
  { x: 6200, y: 250 },
  { x: 6300, y: 250 },
  { x: 6400, y: 250 },
  { x: 6500, y: 250 },
  { x: 6600, y: 250 },
  { x: 6700, y: 250 },
  { x: 6800, y: 250 },
  { x: 6900, y: 250 },
  { x: 7000, y: 250 },
  { x: 7100, y: 250 },
  { x: 7200, y: 250 },
  { x: 7300, y: 250 },
  { x: 7400, y: 250 },
  { x: 7500, y: 250 },
  { x: 7600, y: 250 },
  { x: 7700, y: 250 },
  { x: 7800, y: 250 },
]

/** Finish banner at x=8650 — visual only (assets/obstacles/end.png). */
const FINISH_MARKERS: ObstacleDef[] = [
  { type: 'end', x: 8650 },
]

export const TEST_LEVEL: ObstacleDef[] = [
  ...BLOCKING_WALLS,
  ...AIR_HAZARDS,
  ...FINISH_MARKERS,
]
