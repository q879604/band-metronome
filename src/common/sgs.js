/**
 * 三国杀（简化版）引擎 —— 纯函数，2~8 人身份局。
 * 身份按人数配比：2人=主反 / 3人=主反内 / 4人=主忠反反 / 5人=主忠反反内 /
 *                6人=主忠反反反内 / 7人=主忠反反反内内 / 8人=主忠忠反反反内内
 * 牌：杀24 闪18 桃8 决斗3 无中生有3 拆2 顺2 无懈2（共 62）。
 * 简化：每回合 1 杀；濒死一桃救回 hp=1；无懈为自动响应（AI 对 AI、AI 对人）；
 *      自动弃牌（弃杀/锦囊，留闪桃）；无装备、无武将技能。
 */

export const ROLE_NAME = { zhu: '主公', zhong: '忠臣', fan: '反贼', nei: '内奸' };
export const CARD_NAME = {
  sha: '杀', shan: '闪', tao: '桃', juedou: '决斗',
  wuzhong: '无中生有', chai: '过河拆桥', shun: '顺手牵羊', wuxie: '无懈可击'
};
export const CARD_NEED_TARGET = { sha: true, juedou: true, chai: true, shun: true };

export function rolesFor(n) {
  if (n === 2) return ['zhu', 'fan'];
  if (n === 3) return ['zhu', 'fan', 'nei'];
  if (n === 4) return ['zhu', 'zhong', 'fan', 'fan'];
  if (n === 5) return ['zhu', 'zhong', 'fan', 'fan', 'nei'];
  if (n === 6) return ['zhu', 'zhong', 'fan', 'fan', 'fan', 'nei'];
  if (n === 7) return ['zhu', 'zhong', 'fan', 'fan', 'fan', 'nei', 'nei'];
  return ['zhu', 'zhong', 'zhong', 'fan', 'fan', 'fan', 'nei', 'nei'];
}

export function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

function buildDeck() {
  const d = [];
  for (let i = 0; i < 24; i++) d.push({ t: 'sha' });
  for (let i = 0; i < 18; i++) d.push({ t: 'shan' });
  for (let i = 0; i < 8; i++) d.push({ t: 'tao' });
  for (let i = 0; i < 3; i++) d.push({ t: 'juedou' });
  for (let i = 0; i < 3; i++) d.push({ t: 'wuzhong' });
  for (let i = 0; i < 2; i++) d.push({ t: 'chai' });
  for (let i = 0; i < 2; i++) d.push({ t: 'shun' });
  for (let i = 0; i < 2; i++) d.push({ t: 'wuxie' });
  return shuffle(d);
}

export function createGame(count, allHuman) {
  const roles = shuffle(rolesFor(count).slice(1));
  const all = ['zhu'].concat(roles);
  const players = all.map((r, i) => ({
    id: i,
    role: r,
    hp: r === 'zhu' ? 4 : 3,
    maxHp: r === 'zhu' ? 4 : 3,
    hand: [],
    alive: true
  }));
  const s = {
    players: players,
    deck: buildDeck(),
    discard: [],
    current: 0,
    phase: 'draw',
    shaUsed: 0,
    allHuman: !!allHuman, // 同表多人：所有座位都由真人操作
    pending: null, // {type:'shan'|'tao'|'juedou', who}
    duel: null,
    events: [],
    winner: ''
  };
  for (const p of players) drawCards(s, p.id, 4);
  return s;
}

export function aliveList(s) {
  return s.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
}

function refill(s) {
  if (s.deck.length) return;
  const top = s.discard.pop();
  s.deck = shuffle(s.discard.slice());
  s.discard = [];
  if (top) s.discard.push(top);
}

export function drawCards(s, pid, n) {
  const p = s.players[pid];
  for (let i = 0; i < n; i++) {
    refill(s);
    if (!s.deck.length) return;
    p.hand.push(s.deck.pop());
  }
}

export function hasCard(hand, t) {
  return hand.some((c) => c.t === t);
}

export function removeCard(hand, t) {
  const i = hand.findIndex((c) => c.t === t);
  if (i >= 0) return hand.splice(i, 1)[0];
  return null;
}

function takeRandom(hand) {
  if (!hand.length) return null;
  return hand.splice(Math.floor(Math.random() * hand.length), 1)[0];
}

/** 从手牌移除一张指定牌并放入弃牌堆（removeCard 只移除不回收，禁用） */
function discardFrom(s, hand, t) {
  const c = removeCard(hand, t);
  if (c) s.discard.push(c);
}

export function isFoe(a, b) {
  if (b === 'zhu' && (a === 'fan' || a === 'nei')) return true;
  if (b === 'zhong' && (a === 'fan' || a === 'nei')) return true;
  if (b === 'fan' && (a === 'zhu' || a === 'zhong')) return true;
  if (b === 'nei' && (a === 'fan' || a === 'zhu' || a === 'zhong')) return true;
  return false;
}

export function aiTarget(s, pid) {
  const p = s.players[pid];
  const al = aliveList(s).filter((x) => x !== pid);
  if (!al.length) return -1;
  const foes = al.filter((x) => isFoe(p.role, s.players[x].role));
  const pool = foes.length ? foes : al;
  // 打残血优先
  return pool.sort((a, b) => s.players[a].hp - s.players[b].hp)[0];
}

function pushEvent(s, e) {
  s.events.push(e);
  if (s.events.length > 8) s.events.shift();
}

/** 受伤（可能触发濒死。濒死者为玩家 0 时挂起 pending 等待决策） */
function damage(s, pid, n) {
  const p = s.players[pid];
  p.hp -= n;
  pushEvent(s, (pid + 1) + '号 受伤，HP=' + p.hp);
  if (p.hp <= 0) {
    if (hasCard(p.hand, 'tao')) {
      if (s.allHuman || pid === 0) {
        s.pending = { type: 'tao', who: pid };
        return;
      }
      discardFrom(s, p.hand, 'tao');
      p.hp = 1;
      pushEvent(s, (pid + 1) + '号 濒死吃桃救回');
    } else {
      die(s, pid);
    }
  }
}

function die(s, pid) {
  const p = s.players[pid];
  p.alive = false;
  for (const c of p.hand) s.discard.push(c);
  p.hand = [];
  pushEvent(s, (pid + 1) + '号 阵亡（' + ROLE_NAME[p.role] + '）');
  // 身份奖励
  if (p.role === 'fan') {
    s.players.forEach((q, i) => {
      if (q.alive && (q.role === 'zhu' || q.role === 'zhong')) drawCards(s, i, 3);
    });
  } else if (p.role === 'zhong') {
    s.players.forEach((q, i) => {
      if (q.alive && q.role === 'fan') drawCards(s, i, 3);
    });
  }
  checkWin(s);
}

export function checkWin(s) {
  if (s.winner) return s.winner;
  const al = aliveList(s);
  if (!al.length) {
    s.winner = 'zhu';
    return s.winner;
  }
  if (!s.players[0].alive) {
    // 主公死：若只剩内奸 → 内奸胜，否则反贼胜
    const onlyNei = al.every((i) => s.players[i].role === 'nei');
    s.winner = onlyNei ? 'nei' : 'fan';
    return s.winner;
  }
  const hasFan = al.some((i) => s.players[i].role === 'fan');
  const hasNei = al.some((i) => s.players[i].role === 'nei');
  if (!hasFan && !hasNei) {
    s.winner = 'zhu';
    return s.winner;
  }
  return '';
}

/** 玩家打牌；target 仅杀/决斗/拆/顺需要。返回 {ok, msg} */
export function playCard(s, pid, idx, target) {
  const p = s.players[pid];
  const card = p.hand[idx];
  if (!card) return { ok: false, msg: '没这张牌' };
  if (card.t === 'sha' && s.shaUsed >= 1) return { ok: false, msg: '每回合只能出一张杀' };
  if (card.t === 'tao' && p.hp >= p.maxHp) return { ok: false, msg: '满血不能吃桃' };
  if (card.t === 'wuxie') return { ok: false, msg: '无懈可击自动生效，不用手动出' };

  p.hand.splice(idx, 1);
  s.discard.push(card);
  if (card.t === 'sha') {
    s.shaUsed++;
    const t = s.players[target];
    if (s.allHuman || target === 0) {
      if (hasCard(t.hand, 'shan')) {
        s.pending = { type: 'shan', who: target, from: pid };
        pushEvent(s, (pid + 1) + '号 对 ' + (target + 1) + '号 出杀');
        return { ok: true, msg: '请出闪' };
      }
      damage(s, target, 1);
      return { ok: true, msg: '杀中' };
    }
    if (hasCard(t.hand, 'shan')) {
      discardFrom(s, t.hand, 'shan');
      pushEvent(s, (target + 1) + '号 出闪');
    } else {
      damage(s, target, 1);
    }
    return { ok: true, msg: '杀' };
  }
  if (card.t === 'tao') {
    p.hp++;
    pushEvent(s, (pid + 1) + '号 吃桃 +1');
    return { ok: true, msg: '回血' };
  }
  if (card.t === 'wuzhong') {
    drawCards(s, pid, 2);
    pushEvent(s, (pid + 1) + '号 无中生有摸两张');
    return { ok: true, msg: '摸两张' };
  }
  if (card.t === 'juedou') {
    s.duel = { players: [pid, target], index: 1 };
    stepDuel(s);
    return { ok: true, msg: '决斗' };
  }
  if (card.t === 'chai') {
    const t = s.players[target];
    if (t.hand.length) {
      const c = takeRandom(t.hand);
      if (c) s.discard.push(c);
      pushEvent(s, '拆掉 ' + (target + 1) + '号 一张牌');
    }
    return { ok: true, msg: '拆牌' };
  }
  if (card.t === 'shun') {
    const t = s.players[target];
    if (t.hand.length) {
      const c = takeRandom(t.hand);
      p.hand.push(c);
      pushEvent(s, '顺手牵羊拿走 ' + (target + 1) + '号 一张牌');
    }
    return { ok: true, msg: '摸走一张' };
  }
  return { ok: true, msg: 'ok' };
}

/** 决斗推进：双方轮流出杀，谁先没有谁受 1 点伤害（轮到玩家 0 时挂起） */
function stepDuel(s) {
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
    if (s.allHuman || cur === 0) {
      s.pending = { type: 'juedou', who: cur };
      return;
    }
    discardFrom(s, s.players[cur].hand, 'sha');
    d.index = 1 - d.index;
  }
  s.duel = null;
}

/** 玩家 0 响应挂起事件：shan=出闪 true/false；tao=用桃 true/false；juedou=出杀 true/false */
export function respond(s, action) {
  const pend = s.pending;
  if (!pend) return;
  const who = pend.who;
  if (pend.type === 'shan') {
    if (action) {
      discardFrom(s, s.players[who].hand, 'shan');
      pushEvent(s, (who + 1) + '号 出闪');
    } else {
      damage(s, who, 1);
    }
    s.pending = null;
  } else if (pend.type === 'tao') {
    if (action) {
      discardFrom(s, s.players[who].hand, 'tao');
      s.players[who].hp = 1;
      pushEvent(s, (who + 1) + '号 吃桃救回');
    } else {
      die(s, who);
    }
    s.pending = null;
  } else if (pend.type === 'juedou') {
    if (!s.duel) {
      s.pending = null;
      return;
    }
    if (action) {
      discardFrom(s, s.players[who].hand, 'sha');
      s.duel.index = 1 - s.duel.index;
      stepDuel(s);
    } else {
      damage(s, who, 1);
      s.duel = null;
      s.pending = null;
    }
  }
}

/** AI 回合：一口气出牌，直到需要玩家响应或出牌阶段结束。返回 false=被挂起，true=阶段结束 */
export function aiTakeTurn(s, pid) {
  const p = s.players[pid];
  // 桃
  while (p.hp < p.maxHp && hasCard(p.hand, 'tao')) {
    const idx = p.hand.findIndex((c) => c.t === 'tao');
    playCard(s, pid, idx, -1);
  }
  // 无中生有
  while (hasCard(p.hand, 'wuzhong')) {
    const idx = p.hand.findIndex((c) => c.t === 'wuzhong');
    playCard(s, pid, idx, -1);
  }
  // 拆/顺/决斗
  for (const t of ['chai', 'shun', 'juedou']) {
    while (hasCard(p.hand, t)) {
      const tg = aiTarget(s, pid);
      if (tg < 0) break;
      const idx = p.hand.findIndex((c) => c.t === t);
      playCard(s, pid, idx, tg);
      if (s.pending) return false;
      if (s.winner) return false;
    }
  }
  // 杀
  if (s.shaUsed === 0 && hasCard(p.hand, 'sha')) {
    const tg = aiTarget(s, pid);
    if (tg >= 0) {
      const idx = p.hand.findIndex((c) => c.t === 'sha');
      playCard(s, pid, idx, tg);
      if (s.pending) return false;
    }
  }
  if (s.pending) return false;
  endTurn(s);
  return true;
}

/** 结束出牌：自动弃牌到 ≤ HP，然后换下一个存活玩家 */
export function endTurn(s) {
  const p = s.players[s.current];
  // 自动弃牌：优先弃 杀 > 锦囊 > 闪/桃（保留闪桃）
  while (p.hand.length > p.hp) {
    const drop = p.hand.findIndex((c) => c.t === 'sha' || c.t === 'juedou' || c.t === 'chai' || c.t === 'shun' || c.t === 'wuzhong');
    const idx = drop >= 0 ? drop : 0;
    s.discard.push(p.hand.splice(idx, 1)[0]);
  }
  s.shaUsed = 0;
  // 下一个存活
  const al = aliveList(s);
  if (!al.length) return;
  const pos = al.indexOf(s.current);
  s.current = al[(pos + 1) % al.length];
  s.phase = 'draw';
  drawCards(s, s.current, 2);
}