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
const s1 = M.sanitize({ bpm: 999, vibMs: -5, engine: 'x', gapMode: 'y', policy: 'z', maxBeats: 1e9 });
eq('bpm 上限', s1.bpm, 300);
eq('vibMs 下限', s1.vibMs, 20);
eq('engine 回落', s1.engine, 'native');
eq('gapMode 回落', s1.gapMode, 'gap');
eq('policy 回落', s1.policy, 'dim');
eq('maxBeats 上限', s1.maxBeats, 9999);

eq('空输入用默认', M.sanitize(null).bpm, 60);

// 周期换算
eq('60bpm → 1000ms', M.periodMsOf({ bpm: 60 }), 1000);
eq('120bpm → 500ms', M.periodMsOf({ bpm: 120 }), 500);
eq('200bpm → 300ms', M.periodMsOf({ bpm: 200 }), 300);

// 间隔语义
eq('停顿语义 60bpm/60ms', M.gapMsOf({ bpm: 60, vibMs: 60, gapMode: 'gap' }), 940);
eq('整拍语义 60bpm/60ms', M.gapMsOf({ bpm: 60, vibMs: 60, gapMode: 'period' }), 1000);
eq('实际周期 = 时长 + 间隔', M.actualPeriodMsOf({ bpm: 60, vibMs: 60, gapMode: 'gap' }), 1000);
ok('时长超过一拍时间隔不为负', M.gapMsOf({ bpm: 300, vibMs: 1000, gapMode: 'gap' }) >= M.GAP_STEP);

// 次数与拍号
eq('不限 → 大次数', M.nativeCountOf({ maxBeats: 0 }), 100000);
eq('限 40 拍', M.nativeCountOf({ maxBeats: 40 }), 40);
eq('第 1 拍', M.beatIndexAt(0, 1000), 1);
eq('第 3 拍', M.beatIndexAt(2500, 1000), 3);
eq('未到上限', M.reachedLimit(39, 40), false);
eq('到上限', M.reachedLimit(40, 40), true);
eq('不限不会停', M.reachedLimit(99999, 0), false);

// 极端 bpm
ok('20bpm 周期 3000ms', M.periodMsOf({ bpm: 20 }) === 3000);
ok('300bpm 周期 200ms', M.periodMsOf({ bpm: 300 }) === 200);

console.log('logic self-test: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);