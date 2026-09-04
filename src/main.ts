import './style.css'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './game/config'
import { BootScene } from './game/scenes/BootScene'
import { TitleScene } from './game/scenes/TitleScene'
import { RulesScene } from './game/scenes/RulesScene'
import { PlayScene } from './game/scenes/PlayScene'

const parent = document.querySelector<HTMLDivElement>('#app')
if (!parent) {
  throw new Error('#app missing')
}

parent.innerHTML = ''

new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#f5f0e6',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, RulesScene, PlayScene],
  audio: {
    disableWebAudio: false,
  },
})
