export type CharacterId = 'a' | 'b'

export const PLAYER_FRAME_W = 40
export const PLAYER_FRAME_H = 56
export const PLAYER_WALK_FRAMES = 6
export const PLAYER_WALK_FPS = 20

export const PLAYER_TAKEOFF_FRAME_W = 68
export const PLAYER_TAKEOFF_FRAME_H = 56
export const PLAYER_TAKEOFF_FRAMES = 3
export const PLAYER_TAKEOFF_FPS = 24

export type CharacterDef = {
  id: CharacterId
  label: string
  /** Spritesheet texture key for walk. */
  walkKey: string
  /** Animation key created in BootScene. */
  walkAnim: string
  /** Spritesheet texture key for takeoff. */
  takeoffKey: string
  /** One-shot takeoff animation key. */
  takeoffAnim: string
  /** Fallback single-image flight pose (used only if takeoff missing). */
  flyKey: string
  /** Preview tint on title screen. */
  previewTint: number
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  a: {
    id: 'a',
    label: '角色 A',
    walkKey: 'player-a-walk',
    walkAnim: 'player-a-walk',
    takeoffKey: 'player-a-takeoff',
    takeoffAnim: 'player-a-takeoff',
    flyKey: 'player-fly',
    previewTint: 0xffffff,
  },
  b: {
    id: 'b',
    label: '角色 B',
    walkKey: 'player-b-walk',
    walkAnim: 'player-b-walk',
    takeoffKey: 'player-b-takeoff',
    takeoffAnim: 'player-b-takeoff',
    flyKey: 'player-fly',
    previewTint: 0xffffff,
  },
}

export const DEFAULT_CHARACTER_ID: CharacterId = 'a'

export function resolveCharacterId(value: unknown): CharacterId {
  if (value === 'a' || value === 'b') return value
  return DEFAULT_CHARACTER_ID
}

export function getCharacter(id: unknown): CharacterDef {
  return CHARACTERS[resolveCharacterId(id)]
}
