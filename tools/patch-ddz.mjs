import fs from 'fs';
const F = 'src/common/doudizhu.js';
let s = fs.readFileSync(F, 'utf8');
const R = [
  // 1) 拆出独立判定：顺子 ≥5 且不含 2/王；连对 ≥3 对且不含 2/王
  [/(\/\*\* 顺子：全部单张且连续，不含 2\/王 \*\/\n  if \(vals\.length === n && isStraight\(vals\)\) return \{ ok: true, type: 'straight', main: Math\.max\(\.\.\.vals\), len: n \};\n  \/\/ 连对：成对且连续，不含 2\/王\n  if \(vals\.length === n \/ 2 && counts\.every\(\(c\) => c === 2\) && isStraight\(vals\)\) \{\n    return \{ ok: true, type: 'pairrun', main: Math\.max\(\.\.\.vals\), len: n \};\n  \}/, `  // 顺子：全部单张且连续（≥5 张，不含 2/王）
  if (vals.length === n && isConsecutive(vals, 5)) return { ok: true, type: 'straight', main: Math.max(...vals), len: n };
  // 连对：成对且连续（≥3 对，不含 2/王）
  if (vals.length === n / 2 && counts.every((c) => c === 2) && isConsecutive(vals, 3)) {
    return { ok: true, type: 'pairrun', main: Math.max(...vals), len: n };
  }`],
  // 2) isStraight → isConsecutive：max < 15（2 与王都进不了顺子/连对）
  [/(function isStraight\(vals\) \{\n  if \(vals\.length < 5\) return false;\n  const s = vals\.slice\(\)\.sort\(\(a, b\) => a - b\);\n  if \(s\[s\.length - 1\] > 15\) return false; \/\/ 不能含 2 和王\n  for \(let i = 1; i < s\.length; i\+\+\) if \(s\[i\] !== s\[i - 1\] \+ 1\) return false;\n  return true;\n\})/, `function isConsecutive(vals, minLen) {
  if (vals.length < minLen) return false;
  const s = vals.slice().sort((a, b) => a - b);
  if (s[s.length - 1] >= 15) return false; // 不能含 2 和王
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] + 1) return false;
  return true;
}`],
  // 3) AI 炸弹/火箭兜底必须真的压得过
  [/(  \/\/ 炸弹 \/ 火箭 兜底\n  for \(const v of vals\) if \(m\[v\] === 4\) return \{ idx: nIdx\(hand, v, 4\) \};\n  if \(m\[16\] && m\[17\]\) return \{ idx: \[idxOf\(16\), idxOf\(17\)\] \};\n  return \{ pass: true \};)/, `  // 炸弹 / 火箭 兜底（要真的压得过上一手）
  for (const v of vals) {
    if (m[v] === 4) {
      const okBomb =
        !need || (need.type === 'bomb' && v > need.main) || (need.type !== 'bomb' && need.type !== 'rocket');
      if (okBomb) return { idx: nIdx(hand, v, 4) };
    }
  }
  if (m[16] && m[17] && !(need && need.type === 'rocket')) {
    return { idx: [idxOf(16), idxOf(17)] };
  }
  return { pass: true };`]
];
let fail = 0;
for (const [re, to] of R) {
  const m = s.match(re);
  if (!m) { console.log('✗ 未命中: ' + String(re).slice(0, 60)); fail++; continue; }
  s = s.replace(re, to);
  console.log('✓');
}
fs.writeFileSync(F, s);
console.log(fail === 0 ? 'doudizhu.js 补丁完成' : '失败 ' + fail + ' 处');
