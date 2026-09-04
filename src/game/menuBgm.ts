import Phaser from 'phaser'

export const BGM_MENU_KEY = 'bgm-menu'
export const BGM_MENU_PATH = 'assets/bgm/menu.mp3'
/** Menu UI volume (title / rules / mic overlay). */
export const BGM_MENU_VOLUME = 0.35
/** Fade-out duration when gameplay starts. */
export const BGM_MENU_FADE_MS = 300

/** Start looping menu BGM as soon as possible; unlock on first gesture if blocked. */
export function startMenuBgm(sound: Phaser.Sound.BaseSoundManager): void {
  const play = (): void => {
    const existing = sound.get(BGM_MENU_KEY)
    if (existing?.isPlaying) return
    if (existing) {
      // Created while audio was locked — resume the same instance.
      existing.play()
      if ('setVolume' in existing && typeof existing.setVolume === 'function') {
        existing.setVolume(BGM_MENU_VOLUME)
      }
      return
    }
    sound.play(BGM_MENU_KEY, { loop: true, volume: BGM_MENU_VOLUME })
  }

  play()
  if (sound.locked) {
    sound.once(Phaser.Sound.Events.UNLOCKED, play)
  }
}

/** Fade out then stop menu BGM (safe to call again after already stopped). */
export function stopMenuBgm(scene: Phaser.Scene): void {
  const existing = scene.sound.get(BGM_MENU_KEY)
  if (!existing || !existing.isPlaying) {
    scene.sound.stopByKey(BGM_MENU_KEY)
    return
  }

  scene.tweens.killTweensOf(existing)
  scene.tweens.add({
    targets: existing,
    volume: 0,
    duration: BGM_MENU_FADE_MS,
    onComplete: () => {
      scene.sound.stopByKey(BGM_MENU_KEY)
    },
  })
}
