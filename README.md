# 声控飞行跑酷（chinese-flying-sound-run-game）

横版自动跑酷网页小游戏：背景向左滚动，角色固定在左侧“向右跑”。  
**同时满足**「唱出短句 **中国人能飞**」+「麦克风呈现连续歌唱波形」时，角色飞行以躲避障碍、收集金币。

## 推荐环境

- **Chrome** 或 **Edge**（需支持 Web Speech API）
- 通过 `localhost` 或 **HTTPS** 打开（麦克风权限要求）
- 允许浏览器使用麦克风

## 本地运行

```bash
npm install
npm run assets   # 生成/重置 public/assets 占位素材
npm run dev
```

浏览器打开终端提示的本地地址（一般为 `http://localhost:5173`）。

生产构建：

```bash
npm run build
npm run preview
```

## 怎么玩

1. 点击 **开始游戏**，授权麦克风  
2. **唱出**「中国人能飞」（尽量吐字清晰、有持续音高）  
3. HUD 左侧两个指示灯：
   - **短句**：识别到目标句（约 1.5s 有效窗）
   - **歌唱**：连续歌唱波形（含 **0.3s** 换气静音缓冲）  
4. 两灯都亮 → 飞行；撞障碍结束，可再来一次  
5. **空格**：仅开发测试飞行（不代表正式玩法）

## 声控规则（实现要点）

| 规则 | 行为 |
|------|------|
| 音色过滤 | 拒绝日常说话/噪音；需稳定连续基频与谐波特征 |
| 平滑滤波 | 音量、音调、升力一阶低通，减轻角色抖动 |
| 静音冷却 | 歌唱中断后仍保持频谱有效 **300ms** |

配置常量见 `src/game/config.ts`。

## 素材

首版为可替换占位图，路径约定见 [ATTRIBUTION.md](./ATTRIBUTION.md)。  
之后用定制素材**同名覆盖** `public/assets/` 即可。

## 技术栈

Vite + TypeScript + Phaser 3 · Web Audio API · Web Speech API（`zh-CN`）

## License

[MIT](./LICENSE)
