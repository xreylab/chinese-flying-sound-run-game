# 素材归属 / Attribution

本仓库 `public/assets/` 下当前文件为项目内**程序生成的占位素材**（简单像素风），可自由替换为你的定制图或第三方免费素材。

## 当前占位资源

米白底 + 黑色剪影风（参考横版跑酷线稿），路径仍保持稳定便于日后替换。

| 路径 | 说明 |
|------|------|
| `player/run.png` / `fly.png` | 黑色火柴人跑 / 飞 |
| `world/bg-far.png` / `bg-near.png` / `ground.png` | 米色天空与黑色地面 |
| `obstacles/ground-a.png` | 低墙 |
| `obstacles/air-a.png` | 高墙 |
| `obstacles/vine.png` | 空中藤蔓（致死，32×220） |
| `obstacles/square.png` | 空中方块（致死，48×48） |
| `obstacles/square2.png` | 大方块占位（致死，120×120；可替换自定义美术） |
| `obstacles/end.png` | 终点旗帜占位（无碰撞，60×540） |
| `collectibles/coin.png` | 空心圆金币 |
| `sfx/coin.wav` / `hit.wav` / `fly.wav` | 短提示音 |
| `sfx/select.wav` | 标题页点击选择角色 |
| `sfx/win.ogg` | 胜利结算页庆祝音效（播一次） |
| `bgm/menu.mp3` | 菜单段循环 BGM（选角色 → 规则 → 麦克风询问；对局开始后停止） |

### 菜单 BGM 归属

| 路径 | 说明 |
|------|------|
| `bgm/menu.mp3` | 项目提供的菜单音乐（约 621KB MP3）。若来自第三方，请在此补充作者、链接与许可证。 |

### 开始 / 选角色页 UI（`ui/`）

| 路径 | 显示尺寸 | 建议导出（2x） | 说明 |
|------|----------|----------------|------|
| `ui/title-bg.png` | 960 × 540 | 1920 × 1080 | 整页背景，标题文字建议画在图里 |
| `ui/btn-start.png` | 240 × 72 | 480 × 144 | 开始按钮，透明底 PNG |
| `ui/win-bg.png` | 960 × 540 | 1920 × 1080 | 胜利页全屏背景（文案画进图） |
| `ui/btn-replay.png` | 240 × 72 | 480 × 144 | 胜利页「再玩一次」按钮，透明底 PNG |
| `ui/gameover-bg.png` | 960 × 540 | 1920 × 1080 | 失败页全屏背景（文案画进图） |
| `ui/btn-retry.png` | 240 × 72 | 480 × 144 | 失败页「再来一次」按钮，透明底 PNG |
| `ui/mic-bg.png` | 960 × 540 | 1920 × 1080 | 麦克风许可页全屏背景（文案画进图） |
| `ui/btn-mic.png` | 240 × 72 | 480 × 144 | 许可页「开启麦克风」按钮，透明底 PNG |
| `ui/rules-bg.png` | 960 × 540 | 1920 × 1080 | 规则页全屏背景（规则文案画进图；任意键或点击继续） |
| `ui/char-a.png` / `ui/char-b.png` | 480 × 320（2 帧横拼） | 960 × 640 | 单帧 480×640；左=平时，右=悬停/选中 |

生成脚本：`scripts/generate-assets.mjs`（`npm run assets`）。

## 替换为定制素材

保持**相同文件名与路径**覆盖即可，无需改玩法代码。若帧尺寸变化较大，只需调整 `Player` 的缩放与碰撞盒。

## 推荐免费来源（日后可换）

- [Kenney.nl](https://kenney.nl/assets) — 多为 **CC0**
- [OpenGameArt](https://opengameart.org/) — 注意各资源许可证
- [itch.io free assets](https://itch.io/game-assets/free)

若使用 CC-BY 素材，请在本文件补充作者姓名与链接。
