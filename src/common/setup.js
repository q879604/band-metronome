/**
 * 玩家设置（名字 / 颜色）—— 各游戏共用。
 * Vela 里没有输入框（键盘会被系统键盘挡住），所以名字用「◀ ▶ 从名字池里挑」的方式。
 */

export const NAME_POOL = [
  '大卫', '安娜', '李雷', '韩梅梅', '麦克', '小美', '阿强', '丽丽',
  '老王', '阿珍', '汤姆', '露西'
];

export const COLOR_NAMES = ['红', '蓝', '橙', '绿', '紫', '青', '黄', '粉'];
export const COLOR_CLASSES = ['pc-r', 'pc-b', 'pc-o', 'pc-g', 'pc-p', 'pc-c', 'pc-y', 'pc-k'];

/** 默认名字：按座位取名字池（同房不重名） */
export function defaultNames(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(NAME_POOL[i % NAME_POOL.length]);
  return out;
}

/** 在该名字之后循环取下一个（用于 ◀ ▶ 切换） */
export function cycleName(cur, dir) {
  let idx = NAME_POOL.indexOf(cur);
  if (idx < 0) idx = 0;
  idx = (idx + (dir > 0 ? 1 : -1) + NAME_POOL.length) % NAME_POOL.length;
  return NAME_POOL[idx];
}

export function colorOf(i) {
  return COLOR_CLASSES[i % COLOR_CLASSES.length];
}

export function colorNameOf(i) {
  return COLOR_NAMES[i % COLOR_NAMES.length];
}

/** 初始化座位：真人前 humans 个，其余为电脑 */
export function makeSeats(humans, ai) {
  const total = humans + ai;
  const names = defaultNames(total);
  const seats = [];
  for (let i = 0; i < total; i++) {
    seats.push({
      id: i,
      name: names[i],
      color: colorOf(i),
      colorName: colorNameOf(i),
      isAi: i >= humans
    });
  }
  return seats;
}