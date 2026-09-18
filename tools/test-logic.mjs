// 纯逻辑自测：src/common/metronome.js 是 ES module，node 直接把 .js 当 CJS，
// 所以先复制成 .mjs 再动态 import。
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const srcPath = path.join(root, 'src', 'common', 'metronome.js');
const tmp = path.join(os.tmpdir(), 'metronome-selftest.mjs');
fs.writeFileSync(tmp, fs.readFileSync(srcPath));
const M = await import('file://' + tmp);

let pass = 0;
let fail = 0;

function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else {
    fail++;
    console.error('  ✗ ' + name + '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want));
  }
}

function ok(name, cond) {
  eq(name, !!cond, true);
}

// sanitize：越界钳制 + 非法值回落
const s1 = M.sanitize({
  bpm: 999,
  gapMs: 1,
  vibMs: -5,
  burstStep: 5000,
  engine: 'x',
  speedMode: 'y',
  vibMode: 'z',
  policy: 'w',
  maxBeats: 1e9
});
eq('bpm 上限', s1.bpm, 300);
eq('gapMs 下限', s1.gapMs, 20);
eq('vibMs 下限', s1.vibMs, 20);
eq('burstStep 上限', s1.burstStep, 200);
eq('engine 回落', s1.engine, 'vibrate');
eq('speedMode 回落', s1.speedMode, 'bpm');
eq('vibMode 回落', s1.vibMode, 'short');
eq('policy 回落', s1.policy, 'dim');
eq('maxBeats 上限', s1.maxBeats, 9999);
eq('空输入用默认', M.sanitize(null).bpm, 60);

// 拍间隔
eq('60bpm → 1000ms', M.periodMsOf({ speedMode: 'bpm', bpm: 60 }), 1000);
eq('120bpm → 500ms', M.periodMsOf({ speedMode: 'bpm', bpm: 120 }), 500);
eq('200bpm → 300ms', M.periodMsOf({ speedMode: 'bpm', bpm: 200 }), 300);
eq('20bpm → 3000ms', M.periodMsOf({ speedMode: 'bpm', bpm: 20 }), 3000);
eq('直接填间隔 250ms', M.periodMsOf({ speedMode: 'gap', gapMs: 250 }), 250);
eq('直接填间隔越界钳制', M.periodMsOf({ speedMode: 'gap', gapMs: 5 }), 20);

// 连击凑时长
eq('60ms / 40ms 步长 → 2 击', M.burstCountOf({ vibMs: 60, burstStep: 40, accent: false }, 2), 2);
eq('100ms / 40ms 步长 → 3 击', M.burstCountOf({ vibMs: 100, burstStep: 40, accent: false }, 2), 3);
eq('重音第 1 拍翻倍', M.burstCountOf({ vibMs: 60, burstStep: 40, accent: true }, 1), 4);
eq('重音第 2 拍不翻倍', M.burstCountOf({ vibMs: 60, burstStep: 40, accent: true }, 2), 2);
eq('重音第 5 拍翻倍', M.burstCountOf({ vibMs: 60, burstStep: 40, accent: true }, 5), 4);
ok('至少 1 击', M.burstCountOf({ vibMs: 20, burstStep: 200, accent: false }, 2) >= 1);
eq('实际震感时长', M.actualVibMsOf({ vibMs: 100, burstStep: 40, accent: false }, 2), 120);

// 振动模式只有两档
eq('短振动', M.beatModeOf({ vibMode: 'short' }), 'short');
eq('长振动', M.beatModeOf({ vibMode: 'long' }), 'long');
eq('非法值回落短振动', M.beatModeOf({ vibMode: 'x' }), 'short');

// 原生任务参数（仅 S5）
eq('原生 interval = 拍间隔 - 时长', M.nativeIntervalOf({ speedMode: 'bpm', bpm: 60, vibMs: 100 }), 900);
ok('时长超过拍间隔时 interval 不为负', M.nativeIntervalOf({ speedMode: 'bpm', bpm: 300, vibMs: 2000 }) >= 10);
eq('不限 → 大次数', M.nativeCountOf({ maxBeats: 0 }), 100000);
eq('限 40 拍', M.nativeCountOf({ maxBeats: 40 }), 40);

// 拍号与上限
eq('第 1 拍', M.beatIndexAt(0, 1000), 1);
eq('第 3 拍', M.beatIndexAt(2500, 1000), 3);
eq('未到上限', M.reachedLimit(39, 40), false);
eq('到上限', M.reachedLimit(40, 40), true);
eq('不限不会停', M.reachedLimit(99999, 0), false);

console.log('logic self-test: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);