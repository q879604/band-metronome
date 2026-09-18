import fs from 'fs';

const F = 'src/common/sgs.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;

function rep(a, b) {
  const i = s.indexOf(a);
  if (i < 0) {
    console.log('✗ 未找到: ' + JSON.stringify(a).slice(0, 60));
    fail++;
    return;
  }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('✓');
}

rep('s.duel = { a: pid, b: target };', 's.duel = { players: [pid, target], index: 1 };');

rep(`function stepDuel(s) {
  const d = s.duel;
  if (!d) return;
  let cur = d.b;
  let other = d.a;
  for (let k = 0; k < 30; k++) {
    const p = s.players[cur];
    if (!hasCard(p.hand, 'sha')) {
      damage(s, cur, 1);
      s.duel = null;
      return;
    }
    if (cur === 0) {
      s.pending = { type: 'juedou', who: 0 };
      return;
    }
    removeCard(p.hand, 'sha');
    const t = cur;
    cur = other;
    other = t;
  }
  s.duel = null;
}`, `function stepDuel(s) {
  const d = s.duel;
  if (!d) return;
  let guard = 0;
  while (guard++ < 30) {
    const cur = d.players[d.index];
    if (!s.players[cur].alive) {
      s.duel = null;
      return;
    }
    if (!hasCard(s.players[cur].hand, 'sha')) {
      damage(s, cur, 1);
      s.duel = null;
      return;
    }
    if (cur === 0) {
      s.pending = { type: 'juedou', who: 0 };
      return;
    }
    removeCard(s.players[cur].hand, 'sha');
    d.index = 1 - d.index;
  }
  s.duel = null;
}`);

rep(`  } else if (pend.type === 'juedou') {
    if (action) {
      removeCard(s.players[0].hand, 'sha');
      const d = s.duel;
      // 轮换：玩家 0 出杀后，由对方继续
      const t = d.a;
      d.a = d.b;
      d.b = t;
      stepDuel(s);
    } else {
      damage(s, 0, 1);
      s.duel = null;
      s.pending = null;
    }
  }`, `  } else if (pend.type === 'juedou') {
    if (!s.duel) {
      s.pending = null;
      return;
    }
    if (action) {
      removeCard(s.players[0].hand, 'sha');
      s.duel.index = 1 - s.duel.index;
      stepDuel(s);
    } else {
      damage(s, 0, 1);
      s.duel = null;
      s.pending = null;
    }
  }`);

fs.writeFileSync(F, s);
console.log(fail === 0 ? 'sgs.js 补丁完成' : '失败 ' + fail + ' 处');