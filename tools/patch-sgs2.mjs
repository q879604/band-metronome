import fs from 'fs';
const F = 'src/common/sgs.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
function rep(a, b, name) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('✗ ' + name + ' 命中 ' + (parts.length - 1) + ' 次'); fail++; return; }
  s = parts[0] + b + parts[1];
  console.log('✓ ' + name);
}
const helper = `function takeRandom(hand) {
  if (!hand.length) return null;
  return hand.splice(Math.floor(Math.random() * hand.length), 1)[0];
}

/** 从手牌移除一张指定牌并放入弃牌堆（removeCard 只移除不回收，禁用） */
function discardFrom(s, hand, t) {
  const c = removeCard(hand, t);
  if (c) s.discard.push(c);
}`;
rep('function takeRandom(hand) {\n  if (!hand.length) return null;\n  return hand.splice(Math.floor(Math.random() * hand.length), 1)[0];\n}', helper, 'discardFrom helper');
rep("removeCard(s.players[0].hand, 'shan');", "discardFrom(s, s.players[0].hand, 'shan');", 'respond 闪');
rep("removeCard(p.hand, 'tao');", "discardFrom(s, p.hand, 'tao');", '濒死桃');
rep("removeCard(t.hand, 'shan');", "discardFrom(s, t.hand, 'shan');", 'AI出闪');
rep("removeCard(s.players[cur].hand, 'sha');", "discardFrom(s, s.players[cur].hand, 'sha');", '决斗AI出杀');
rep("removeCard(s.players[0].hand, 'sha');", "discardFrom(s, s.players[0].hand, 'sha');", '决斗人出杀');
fs.writeFileSync(F, s);
console.log(fail === 0 ? 'OK' : 'FAIL ' + fail);
