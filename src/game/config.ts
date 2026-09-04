export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

/** Title screen UI — source frames are 2x, scaled down at display time. */
export const UI_TITLE_BG_KEY = 'title-bg'
export const UI_BTN_START_KEY = 'btn-start'
export const UI_CHAR_KEYS = { a: 'char-a', b: 'char-b' } as const
export const UI_CHAR_FRAME_W = 480
export const UI_CHAR_FRAME_H = 640
export const UI_CHAR_DISPLAY_W = 192
export const UI_CHAR_DISPLAY_H = 256
export const UI_CHAR_GAP = 80
export const UI_CHAR_Y = GAME_HEIGHT / 2 + 20
export const UI_BTN_DISPLAY_W = 240
export const UI_BTN_DISPLAY_H = 72
export const UI_BTN_Y = GAME_HEIGHT - 72

/** Win screen — full-bleed art + replay button (replace PNGs under assets/ui/). */
export const UI_WIN_BG_KEY = 'win-bg'
export const UI_BTN_REPLAY_KEY = 'btn-replay'
export const UI_WIN_BTN_DISPLAY_W = 240
export const UI_WIN_BTN_DISPLAY_H = 72
export const UI_WIN_BTN_Y = GAME_HEIGHT / 2 + 150

/** Game Over screen — full-bleed art + retry button. */
export const UI_GAMEOVER_BG_KEY = 'gameover-bg'
export const UI_BTN_RETRY_KEY = 'btn-retry'
export const UI_GAMEOVER_BTN_DISPLAY_W = 240
export const UI_GAMEOVER_BTN_DISPLAY_H = 72
export const UI_GAMEOVER_BTN_Y = GAME_HEIGHT / 2 + 150

/** Mic permission screen — full-bleed art + enable button. */
export const UI_MIC_BG_KEY = 'mic-bg'
export const UI_BTN_MIC_KEY = 'btn-mic'
export const UI_MIC_BTN_DISPLAY_W = 240
export const UI_MIC_BTN_DISPLAY_H = 72
export const UI_MIC_BTN_Y = GAME_HEIGHT / 2 + 120

/** Rules screen — full-bleed art (any key or click continues). */
export const UI_RULES_BG_KEY = 'rules-bg'

/** Visual ground strip height — matches `ground.png` (384×84) for 1:1 seamless tiling. */
export const GROUND_HEIGHT = 84
/** Raise ground.png upward (px) so the painted surface meets character feet. */
export const GROUND_VISUAL_LIFT = 5
/**
 * Walk / collision surface: distance from the bottom of the screen to the
 * character's feet (and obstacle bases).
 */
export const GROUND_STAND_FROM_BOTTOM = 56
/** Player sprite scale (source frame 40×56). */
export const PLAYER_SCALE = 1.5
export const PLAYER_FRAME_HEIGHT = 56
/**
 * Takeoff pose by altitude (feet above stand line, px):
 * < FRAME2 → takeoff frame 0; < FRAME3 → frame 1; else frame 2 (cruise).
 */
export const TAKEOFF_FRAME2_ALTITUDE = 10
export const TAKEOFF_FRAME3_ALTITUDE = 110
/** Extra climb speed only while still in takeoff poses (below FRAME3 altitude). */
export const TAKEOFF_ASCENT_MULT = 2.2
export const TAKEOFF_MAX_UP_SPEED = -900

export const PLAYER_X = 180
/** World X the player must reach (PLAYER_X + scrolled distance) to win. */
export const LEVEL_FINISH_X = 8650
/** Flight-mode world scroll speed (px/s). Normal voice stays at this speed. */
export const SCROLL_SPEED = 280
/** Pre-flight (any-voice) scroll speed. Lower = slower ground walk. */
export const GROUND_SCROLL_SPEED = 130
/** Cloud layer parallax: fraction of world scroll speed (very slow drift). */
export const CLOUD_SCROLL_FACTOR = 0.02
/** Pre-flight: raw mic RMS above this walks. Use raw volume only — never smoothVolume. */
export const GROUND_VOICE_RMS = 0.01
/**
 * Flight volume → speed boost.
 * At/below NORMAL → SCROLL_SPEED; at/above LOUD → SCROLL_SPEED * BOOST_MAX.
 */
export const FLY_VOLUME_NORMAL_RMS = 0.035
export const FLY_VOLUME_LOUD_RMS = 0.12
export const FLY_SPEED_BOOST_MAX = 1.85
export const GRAVITY = 1600
export const FALL_GRAVITY = 4200
export const FALL_BOOST_VY = 520
/** Flight mode: gravity while silent (no voice lift). Tunable separately from exit-flight fall. */
export const FLY_SILENCE_GRAVITY = 1400
/** Feet altitude (px) above stand line before crash-land Game Over can trigger. */
export const FLY_AIRBORNE_ALTITUDE = 20

/**
 * Remember singing for this long so ASR can catch up after the sung phrase.
 */
export const FLY_ARM_SINGING_MEMORY_MS = 6500
export const FLY_FEI_BURST_PX = 240
export const FLY_FEI_PULSE_DEBOUNCE_MS = 70
export const FLY_PENDING_FEI_MS = 4500
export const FLY_LIVE_VOICE_RMS = 0.0025
export const FLY_LIVE_VOICE_HANG_MS = 320
/**
 * When ASR「飞」arrives just after you stop, briefly bridge so the shout
 * still counts as one smooth advance + pitch window.
 */
export const FLY_FEI_ASR_BRIDGE_MS = 1100
/** How recently you must have voiced for a late ASR「飞」to arm advance. */
export const FLY_FEI_RECENT_VOICE_MS = 1800
/** Ignore pitch-steer briefly after arming (phrase itself ends with 飞). */
export const FLY_STEER_ARM_IGNORE_MS = 280

// ===========================================================================
// 「飞」音高 → 飞行高度（调手感主要改这一段）
// ===========================================================================
/**
 * 音高映射区间（Hz）。区间越窄越灵敏。
 * 低于 MIN → 飞到最低；高于 MAX → 飞到最高。
 */
export const FLY_PITCH_MIN_HZ = 150
export const FLY_PITCH_MAX_HZ = 420
/**
 * 映射曲线指数。1 = 线性；>1 高音冲顶更快；<1 更柔和。
 */
export const FLY_PITCH_CURVE_EXP = 1.25
/** 认出「飞」后可持续用音高控高的时长（ms）。实际窗口由 FLY_PENDING_FEI_MS 驱动。 */
export const FLY_PITCH_STEER_MS = 4500
/**
 * 目标高度（Phaser：Y 越小越靠画面上方）。
 * TOP ≈ 画面最上；LOW ≈ 贴地低飞。
 */
export const FLY_HEIGHT_TOP_Y = 36
export const FLY_HEIGHT_LOW_Y =
  GAME_HEIGHT - GROUND_STAND_FROM_BOTTOM - (PLAYER_FRAME_HEIGHT * PLAYER_SCALE) / 2
/** 起飞瞬间 / 无「飞」窗口时保持的参考高度。 */
export const FLY_CRUISE_Y = GAME_HEIGHT / 2
/** 跟手拉力 / 升降速度上限（越大越快跟上音高）。 */
export const FLY_CRUISE_PULL = 2200
export const FLY_LIFT = 2600
export const MAX_UP_SPEED = -480
export const MAX_DOWN_SPEED = 420
/** 无控高时的轻微漂浮（与音高控高无关）。 */
export const FLY_HOVER_AMPLITUDE = 7
export const FLY_HOVER_HZ = 0.65
// ===========================================================================

export const TARGET_PHRASE = '中国人能飞'
export const PHRASE_HOLD_MS = 5000
export const SINGING_SILENCE_GRACE_MS = 2800

export const SMOOTH_ALPHA = 0.12
export const SPECTRUM_BARS = 48

export const LOW_WALL_HEIGHT = 60
export const HIGH_WALL_HEIGHT = 380

/** Lethal air vine — display size (matches `obstacles/vine.png`). */
export const VINE_WIDTH = 32
export const VINE_HEIGHT = 220
/** Lethal air square — display size (matches `obstacles/square.png`). */
export const SQUARE_SIZE = 48
/** Subtle idle bob for `obstacles/square.png` (peak offset in px). */
export const SQUARE_BOB_AMP = 5
/** Idle bob frequency in Hz. */
export const SQUARE_BOB_HZ = 0.75
/** Hitbox inset vs display (fairer than full sprite). */
export const HAZARD_HITBOX_SHRINK = 4

export const SINGING = {
  minVolume: 0.02,
  speechVolume: 0.015,
  minPitchHz: 90,
  maxPitchHz: 900,
  maxPitchJumpHz: 55,
  minStableMs: 280,
  maxSpectralFlatness: 0.5,
  minHarmonicRatio: 0.26,
  maxPitchStdHz: 36,
  pitchHistorySize: 18,
  maxSpectralFlux: 0.28,
} as const
