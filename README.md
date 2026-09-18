# 腕上节拍器（Band Metronome）

小米手环 / 手表（Xiaomi Vela OS）上的震动节拍器快应用。目标设备：**小米手环 9 Pro（336×480）**，
布局按屏幕实际宽度自适应，手环 8 Pro / 10 / REDMI Watch 等 Vela 穿戴设备同样可用。

## 它解决什么

腕上练琴 / 打拍子时不方便看屏幕：节拍全靠**震动**给，屏幕降到最暗不刺眼，还能一直亮着。

| 功能 | 说明 |
| --- | --- |
| 震动节拍 | `@system.vibrator.start()` 把「时长 / 间隔 / 次数」整段交给系统振动任务，不靠 JS 计时器逐拍，息屏后更可能继续震 |
| 可调参数 | BPM 20–300、振动时长 20–1000ms、间隔含义（停顿 / 整拍）可切、拍数上限（到点自动停，防跑飞） |
| 两种引擎 | **原生任务**（省电、硬定时、息屏更稳）／**JS 逐拍**（能打首拍重音，`mode:'long'/'short'`） |
| 屏幕策略 | **最低亮度**：启动即 `setValue(1)` + `setMode(0)` + `setKeepScreenOn(true)`，**连点屏幕 5 次**恢复原亮度与原「自动亮度」模式<br>保持常亮：只有常亮，不动亮度<br>跟随系统：息屏实验，用来验证息屏后震动是否还在 |
| 安全兜底 | 离开页面 / 停止 / 页面销毁一律还原亮度与常亮状态，绝不把用户困在黑屏里 |

### 震动强度的实话

Vela 的 `@system.vibrator` **只开放系统级强度**：`getSystemDefaultMode()` 返回 0 关闭 / 1 标准 / 2 加强，
**只读不能写**，没有 per-app 强度或振幅参数。所以设置页只显示当前系统强度，想改强弱得去手环
「设置 → 振动强度」（或小米运动健康里）。这是平台限制，不是没做。

## 云端构建（无需 PC 端 AIoT-IDE）

打包器是公开 npm 包 `aiot-toolkit`，直接在 GitHub Actions 里出 rpk：

- `.github/workflows/ci.yml`：push / 手动触发 → `npm test` + `aiot build` → 下载 Actions 里的 `rpk` artifact
- `.github/workflows/release.yml`：推 `v*` tag → 构建并发布到 Releases（没配 `SIGN_ARCHIVE` 时自动出 debug 包，可直接装表）

本地开发（需 AIoT-IDE 提供模拟器）：

```bash
npm install
npm run start     # 模拟器实时预览
npm run build     # dist/*.debug.rpk
npm test          # 纯逻辑自测（23 项）
npm run icon      # 重新生成图标
```

## 安装到手表

云端只产出 rpk，装机仍需侧载：**小米运动健康 → 我的 → 关于 → Debug → 第三方应用 → 输入包名 → Install third app**，
或 AstroBox / 社区 ADB 脚本。**每次改装必须 `versionCode` +1**，否则手环用缓存的旧包。

## 结构

```
src/
├── manifest.json          包名 io.github.q879604.metronome / 路由 / features / designWidth
├── app.ux                 应用级生命周期
├── common/
│   ├── theme.css          全局视觉（纯黑 + 青色；无渐变、只 class 选择器）
│   ├── metronome.js       纯函数核心：BPM↔周期、间隔语义、拍号换算（可 node 直测）
│   └── icon.png           应用图标（tools/gen-icon.mjs 生成）
└── pages/
    ├── index/             节拍器主界面（含低亮度运行屏 + 连点 5 次解锁）
    └── settings/          设置（BPM / 时长 / 间隔含义 / 引擎 / 重音 / 屏幕策略 / 拍数上限）
```

## 开发铁律（真机踩出来的，改代码前先看）

1. 交互元素一律 flex 流式布局 + 每个元素独立原生 `onclick`；**不要**绝对定位放按钮、不要自己算触摸坐标。
2. `.ux` 只支持 class 选择器（无 `:hover` / 后代 / 属性 / 伪元素），文字必须包在 `<text>` 里且不换行。
3. 滚动用 `<scroll scroll-y="true">` + **显式高度**。
4. 文件只有 `internal://` 协议，没有 `window` / `document`，渐变不支持。
5. 纯逻辑抽到 `src/common/*.js`，`npm test` 在沙盒里就能跑。