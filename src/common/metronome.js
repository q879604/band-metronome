/* 腕上节拍器 · 核心逻辑（纯函数，可在 node 下直接跑测试）
   单位统一 ms。

   手环（9/9 Pro 等）只支持 vibrator.vibrate({mode})，且只有 'long'/'short' 两档，
   没有「时长 / 间隔 / 次数 / 强度」参数。社区做法（米环9「环间跳蛋」）与这里一致：
   把 vibrate 按 burstStep 毫秒连击若干次，凑出可调的「震动时长」；
   拍与拍的间隔由我们自己的调度器控制（BPM 或直接填毫秒）。 */

export const DEFAULT_SETTINGS = {
  speedMode: 'bpm', // 'bpm' 按拍速 / 'gap' 直接填每拍间隔毫秒
  bpm: 60,
  gapMs: 800, // speedMode==='gap' 时的拍间隔
  vibMs: 60, // 一次震动的总时长（连击凑出来）
  vibMode: 'long', // 'long' | 'short'（9 Pro 只有这两档，long 带动马达更久 → 震感更强）
  burstStep: 25, // 连击步长：每 step 毫秒叫一次 vibrate（越小越连续、越强）
  strength: 4, // 强度档 1~5（本质就是 vibMode + burstStep 的快捷档）
  accent: false, // 首拍重音 = 时长翻倍
  engine: 'vibrate', // vibrate = 逐拍 vibrate（全机型）；native = vibrator.start（仅 Xiaomi Watch S5）
  maxBeats: 0, // 0 = 不限
  policy: 'dim' // dim 最低亮度常亮 / keep 保持常亮 / system 跟随系统（息屏实验）
};

export const LIMITS = {
  bpm: [20, 300],
  gapMs: [20, 5000],
  vibMs: [20, 2000],
  burstStep: [20, 200],
  maxBeats: [0, 9999]
};

export function clampInt(v, lo, hi) {
  let n = Math.round(Number(v));
  if (!isFinite(n)) n = lo;
  if (n < lo) n = lo;
  if (n > hi) n = hi;
  return n;
}

export function sanitize(raw) {
  const s = Object.assign({}, DEFAULT_SETTINGS, raw || {});
  s.bpm = clampInt(s.bpm, LIMITS.bpm[0], LIMITS.bpm[1]);
  s.gapMs = clampInt(s.gapMs, LIMITS.gapMs[0], LIMITS.gapMs[1]);
  s.vibMs = clampInt(s.vibMs, LIMITS.vibMs[0], LIMITS.vibMs[1]);
  s.burstStep = clampInt(s.burstStep, LIMITS.burstStep[0], LIMITS.burstStep[1]);
  s.maxBeats = clampInt(s.maxBeats, LIMITS.maxBeats[0], LIMITS.maxBeats[1]);
  s.vibMode = s.vibMode === 'long' ? 'long' : 'short';
  s.strength = clampInt(s.strength, 1, 5);
  s.speedMode = s.speedMode === 'gap' ? 'gap' : 'bpm';
  s.engine = s.engine === 'native' ? 'native' : 'vibrate';
  s.policy = s.policy === 'keep' || s.policy === 'system' ? s.policy : 'dim';
  s.accent = !!s.accent;
  return s;
}

/** 拍与拍之间的间隔（ms）：BPM 换算或直接填的毫秒 */
export function periodMsOf(s) {
  if (s.speedMode === 'gap') return clampInt(s.gapMs, LIMITS.gapMs[0], LIMITS.gapMs[1]);
  return Math.round(60000 / clampInt(s.bpm, LIMITS.bpm[0], LIMITS.bpm[1]));
}

/** 只有 long / short 两档，重音靠时长翻倍而不是换 mode */
export function beatModeOf(s) {
  return s.vibMode === 'long' ? 'long' : 'short';
}

/* 手环没有强度参数，能改变「震感强弱」的只有两件事：
   ① 用 long 还是 short（long 带动马达更久）
   ② 连击步长：步长越小，马达还没停就被再次叫起，等于一直满速转 → 震感最强
   所以强度档 = 上面两者的预设组合。 */
export const STRENGTH_PRESETS = [
  { level: 1, name: '微', mode: 'short', step: 100 },
  { level: 2, name: '轻', mode: 'short', step: 60 },
  { level: 3, name: '中', mode: 'short', step: 40 },
  { level: 4, name: '强', mode: 'long', step: 25 },
  { level: 5, name: '最强', mode: 'long', step: 20 }
];

export function presetOf(level) {
  const n = clampInt(level, 1, 5);
  for (let i = 0; i < STRENGTH_PRESETS.length; i++) {
    if (STRENGTH_PRESETS[i].level === n) return STRENGTH_PRESETS[i];
  }
  return STRENGTH_PRESETS[2];
}

/** 把强度档写进 vibMode / burstStep */
export function applyStrength(s, level) {
  const p = presetOf(level);
  s.strength = p.level;
  s.vibMode = p.mode;
  s.burstStep = p.step;
  return s;
}

/** 当前参数对得上哪一档（对不上就是自定义） */
export function strengthLabelOf(s) {
  for (let i = 0; i < STRENGTH_PRESETS.length; i++) {
    const p = STRENGTH_PRESETS[i];
    if (p.mode === s.vibMode && p.step === clampInt(s.burstStep, LIMITS.burstStep[0], LIMITS.burstStep[1])) {
      return p.level + ' ' + p.name;
    }
  }
  return '自定义';
}

/** 这一拍要塞几次 vibrate：时长 ÷ 连击步长（重音拍翻倍） */
export function burstCountOf(s, beatIndex) {
  const step = clampInt(s.burstStep, LIMITS.burstStep[0], LIMITS.burstStep[1]);
  let n = Math.ceil(clampInt(s.vibMs, LIMITS.vibMs[0], LIMITS.vibMs[1]) / step);
  if (n < 1) n = 1;
  if (s.accent && beatIndex % 4 === 1) n = n * 2;
  return n;
}

/** 实际震感时长（连击次数 × 步长），显示用 */
export function actualVibMsOf(s, beatIndex) {
  return burstCountOf(s, beatIndex) * clampInt(s.burstStep, LIMITS.burstStep[0], LIMITS.burstStep[1]);
}

/** 原生任务（仅 S5）用的 interval：间隔 = 拍间隔 - 震动时长 */
export function nativeIntervalOf(s) {
  return clampInt(periodMsOf(s) - s.vibMs, 10, 60000);
}

/** 原生任务要跑多少拍；不限时给一个足够大但仍有限的次数（防跑飞） */
export function nativeCountOf(s) {
  return s.maxBeats > 0 ? s.maxBeats : 100000;
}

/** 已跑时长 → 当前第几拍（1 起） */
export function beatIndexAt(elapsedMs, periodMs) {
  const p = Math.max(LIMITS.gapMs[0], periodMs);
  return Math.floor(Math.max(0, elapsedMs) / p) + 1;
}

/** 到点自动停的判断 */
export function reachedLimit(beatIndex, maxBeats) {
  return maxBeats > 0 && beatIndex >= maxBeats;
}

/** 主界面一行摘要 */
export function summaryOf(s) {
  return (
    '振动 ' +
    s.vibMs +
    'ms(' +
    (s.vibMode === 'long' ? '长' : '短') +
    ') 间隔 ' +
    periodMsOf(s) +
    'ms'
  );
}