/* 腕上节拍器 · 核心逻辑（纯函数，可在 node 下直接跑测试）
   单位统一 ms。

   间隔语义（对应 vibrator.start 的 interval 字段）：
     gapMode = 'gap'    间隔 = 两拍之间的停顿，周期 = 振动时长 + 间隔（默认，符合文档「振动间隔时间」）
     gapMode = 'period' 间隔 = 整拍周期，周期 = 间隔（个别固件按周期实现时用它）
   两种都能选，真机上哪个对就用哪个，不用改代码。 */

export const DEFAULT_SETTINGS = {
  bpm: 60,
  vibMs: 60,
  gapMode: 'gap',
  engine: 'vibrate', // vibrate = 逐拍调 vibrator.vibrate（全机型可用；手环 9/9 Pro 只支持这个）
  //                   native  = 一次性交给系统任务 vibrator.start（官方支持明细：只有 Xiaomi Watch S5）
  accent: false, // 首拍重音（仅 timer 模式有效）
  maxBeats: 0, // 0 = 不限
  policy: 'dim' // dim = 启动后最低亮度 + 常亮；keep = 保持原亮度但常亮；system = 跟随系统（息屏实验）
};

export const LIMITS = {
  bpm: [20, 300],
  vibMs: [20, 1000],
  maxBeats: [0, 9999]
};

export const GAP_STEP = 10;

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
  s.vibMs = clampInt(s.vibMs, LIMITS.vibMs[0], LIMITS.vibMs[1]);
  s.maxBeats = clampInt(s.maxBeats, LIMITS.maxBeats[0], LIMITS.maxBeats[1]);
  s.gapMode = s.gapMode === 'period' ? 'period' : 'gap';
  s.engine = s.engine === 'native' ? 'native' : 'vibrate';
  s.policy = s.policy === 'keep' || s.policy === 'system' ? s.policy : 'dim';
  s.accent = !!s.accent;
  return s;
}

/** 一拍周期（ms） */
export function periodMsOf(s) {
  return Math.round(60000 / clampInt(s.bpm, LIMITS.bpm[0], LIMITS.bpm[1]));
}

/** 传给 vibrator.start 的 interval */
export function gapMsOf(s) {
  const period = periodMsOf(s);
  const vib = clampInt(s.vibMs, LIMITS.vibMs[0], LIMITS.vibMs[1]);
  const gap = s.gapMode === 'period' ? period : period - vib;
  return clampInt(gap, GAP_STEP, 60000);
}

/** 实际一拍（振动 + 停顿）的总时长，仅用于显示 */
export function actualPeriodMsOf(s) {
  return clampInt(s.vibMs, LIMITS.vibMs[0], LIMITS.vibMs[1]) + gapMsOf(s);
}

/** 原生任务要跑多少拍；不限时给一个足够大但仍有限的次数（防跑飞） */
export function nativeCountOf(s) {
  return s.maxBeats > 0 ? s.maxBeats : 100000;
}

/** 每拍用的振动模式：手环 9 Pro 只有 long / short 两档（重音 = 长振动） */
export function beatModeOf(s, beatIndex) {
  return s.accent && beatIndex % 4 === 1 ? 'long' : 'short';
}

/** 已跑时长 → 当前第几拍（1 起） */
export function beatIndexAt(elapsedMs, periodMs) {
  const p = Math.max(GAP_STEP, periodMs);
  return Math.floor(Math.max(0, elapsedMs) / p) + 1;
}

/** 到点自动停的判断 */
export function reachedLimit(beatIndex, maxBeats) {
  return maxBeats > 0 && beatIndex >= maxBeats;
}

/** 主界面一行摘要 */
export function summaryOf(s) {
  return (
    '振动 ' + s.vibMs + 'ms 间隔 ' + gapMsOf(s) + 'ms 周期 ' + actualPeriodMsOf(s) + 'ms'
  );
}