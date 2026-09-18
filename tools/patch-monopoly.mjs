import fs from 'fs';
const F = 'src/common/monopoly.js';
let s = fs.readFileSync(F, 'utf8');
const R = [
  [/return \{ players: players, current: 0, log: \['1号 开局'\] \};/, 'return { players: players, current: 0, round: 1, log: [\'1号 开局\'] };'],
  [/export function endTurn\(s\) \{\n  const n = s\.players\.length;\n  for \(let i = 1; i <= n; i\+\+\) \{\n    s\.current = \(s\.current \+ 1\) % n;\n    if \(s\.players\[s\.current\]\.alive\) return \{ done: false \};\n  \}\n  return \{ done: true \};\n\}/, `export function endTurn(s) {
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    s.current = (s.current + 1) % n;
    if (s.current === 0) s.round++;
    if (s.players[s.current].alive) return { done: false, round: s.round };
  }
  return { done: true, round: s.round };
}

/** 玩家总资产 = 现金 + 地产价值 */
export function wealthOf(p) {
  let w = Math.max(0, p.money);
  for (const e of p.props) w += BOARD[e.i].price;
  return w;
}

/** 总资产最高的存活玩家（回合上限结算用） */
export function roundWinner(s) {
  let best = -1;
  let bestW = -1;
  for (let i = 0; i < s.players.length; i++) {
    if (s.players[i].alive && wealthOf(s.players[i]) > bestW) {
      bestW = wealthOf(s.players[i]);
      best = i;
    }
  }
  return { player: best, wealth: bestW };
}`]
];
let fail = 0;
for (const [re, to] of R) {
  const m = s.match(re);
  if (!m) { console.log('✗ 未命中: ' + re); fail++; continue; }
  s = s.replace(re, to);
  console.log('✓');
}
fs.writeFileSync(F, s);
console.log(fail === 0 ? 'monopoly.js 补丁完成' : '有 ' + fail + ' 处未命中');
