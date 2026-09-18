/**
 * 骗子酒馆（简化版）引擎 —— 纯函数，2~4 人。
 * 规则（腕上简化）：
 *   每人 3 条命 + 起手 5 张；52 张牌（4 花色 × 13 点数）。
 *   每轮宣布一个目标点数。按座位顺序每人盖牌打 1~3 张，声称都是目标点数；
 *   下一位可选择「喊骗子」翻开上家的牌：有假牌 → 出牌者掉命；全是真的 → 喊话者掉命；
 *   否则继续出自己的牌。一轮打满一圈无人喊 → 平安结束。补牌回 5 张。
 *   命归零出局，最后存活者获胜。
 */

export const VALUE_CHARS = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
};

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

export function makeDeck() {
  const d = [];
  for (let v = 3; v <= 15; v++) {
    for (let s = 0; s < 4; s++) d.push({ v: v, suit: s });
  }
  return shuffle(d);
}

export function createGame(count) {
  const deck = makeDeck();
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push({ hp: 3, hand: deck.splice(0, 5), alive: true });
  }
  const s = {
    players: players,
    deck: deck,
    discard: [],
    round: 1,
    target: 3 + Math.floor(Math.random() * 13),
    starter: 0,
    cur: 0,
    playedCount: 0,
    lastPlay: null, // {from, cards:[...]}
    over: false,
    winner: '',
    log: []
  };
  return s;
}

export function aliveList(s) {
  return s.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
}

export function nextAlive(s, from) {
  const al = aliveList(s);
  if (!al.length) return -1;
  const pos = al.indexOf(from);
  return al[(pos + 1) % al.length];
}

function refill(s) {
  if (s.deck.length) return;
  if (!s.discard.length) return;
  s.deck = shuffle(s.discard.slice());
  s.discard = [];
}

export function drawTo(s, pid, n) {
  const p = s.players[pid];
  while (p.hand.length < n) {
    refill(s);
    if (!s.deck.length) break;
    p.hand.push(s.deck.pop());
  }
}

/** 出牌：打 1~3 张盖牌（声称都是目标点数） */
export function playBatch(s, pid, idxList) {
  const p = s.players[pid];
  if (!p.alive) return { ok: false, msg: '已出局' };
  if (idxList.length < 1 || idxList.length > 3) return { ok: false, msg: '每次 1~3 张' };
  const cards = idxList.map((i) => p.hand[i]);
  if (cards.some((c) => !c)) return { ok: false, msg: '没有这张牌' };
  const lie = cards.some((c) => c.v !== s.target);
  idxList.slice().sort((a, b) => b - a).forEach((i) => p.hand.splice(i, 1));
  // 上家未遭质疑的牌安全入弃牌堆（否则每一手都泄漏牌数）
  if (s.lastPlay) {
    for (const c of s.lastPlay.cards) s.discard.push(c);
  }
  s.lastPlay = { from: pid, cards: cards, lie: lie };
  s.playedCount++;
  s.cur = nextAlive(s, pid);
  s.log.unshift((pid + 1) + '号 盖了 ' + cards.length + ' 张（声称是 ' + VALUE_CHARS[s.target] + '）');
  if (s.log.length > 4) s.log.pop();
  return { ok: true, lie: lie };
}

/** 是否所有存活玩家都无手牌（无牌可出时收轮） */
export function allHandsEmpty(s) {
  for (const i of aliveList(s)) {
    if (s.players[i].hand.length) return false;
  }
  return true;
}

/** 喊骗子：翻开上家的牌结算 */
export function call(s, caller) {
  const lp = s.lastPlay;
  if (!lp) return { ok: false, msg: '还没有人出牌' };
  const liar = s.players[lp.from];
  const callerP = s.players[caller];
  if (lp.lie) {
    liar.hp--;
    s.log.unshift((caller + 1) + '号 喊对了！' + (lp.from + 1) + '号 掉了 1 条命');
  } else {
    callerP.hp--;
    s.log.unshift((caller + 1) + '号 喊错了，掉了 1 条命');
  }
  if (s.log.length > 4) s.log.pop();
  for (const c of lp.cards) s.discard.push(c);
  s.lastPlay = null;
  s.playedCount = 0;
  // 掉命与淘汰
  if (liar.hp <= 0) {
    liar.alive = false;
    for (const c of liar.hand) s.discard.push(c);
    liar.hand = [];
    s.log.unshift((lp.from + 1) + '号 出局！');
  }
  if (callerP.hp <= 0) {
    callerP.alive = false;
    for (const c of callerP.hand) s.discard.push(c);
    callerP.hand = [];
    s.log.unshift((caller + 1) + '号 出局！');
  }
  checkWin(s);
  if (!s.over) nextRound(s);
  return { ok: true, liar: lp.from, lie: lp.lie };
}

/** 一轮打满一圈无人喊 → 平安收牌，进下一轮 */
export function passFull(s) {
  if (s.lastPlay) {
    for (const c of s.lastPlay.cards) s.discard.push(c);
    s.lastPlay = null;
    s.playedCount = 0;
    s.log.unshift('无人喊骗，本回合平安');
  }
  if (!s.over) nextRound(s);
}

function nextRound(s) {
  const al = aliveList(s);
  if (!al.length) return;
  for (const i of al) drawTo(s, i, 5);
  s.round++;
  s.target = 3 + Math.floor(Math.random() * 13);
  s.starter = nextAlive(s, al[al.length - 1]);
  s.cur = s.starter;
  s.playedCount = 0;
  s.lastPlay = null;
  s.log.unshift('第 ' + s.round + ' 轮：目标点数 ' + VALUE_CHARS[s.target] + '，由 ' + (s.starter + 1) + '号 开始');
}

export function checkWin(s) {
  const al = aliveList(s);
  if (al.length <= 1) {
    s.over = true;
    s.winner = al.length === 1 ? al[0] : -1;
    return s.winner;
  }
  return -1;
}

/** AI：返回 {type:'play', idx:[...]} 或 {type:'call'} */
export function aiAction(s, pid) {
  const p = s.players[pid];
  const hasTarget = p.hand.filter((c) => c.v === s.target);
  const al = aliveList(s);
  // 决策点：上家刚出完牌，轮到本 AI → 决定喊还是不喊
  if (s.lastPlay && s.lastPlay.from !== pid) {
    const canCall = al.length > 1;
    if (canCall) {
      // 手里目标牌越多，越容易识破上家谎言
      const callProb = hasTarget.length >= 3 ? 0.75 : hasTarget.length === 2 ? 0.5 : 0.25;
      if (Math.random() < callProb && s.playedCount < al.length) return { type: 'call' };
    }
  }
  // 出牌：尽量出真牌（最多 3 张）；没有就混假牌
  const targetIdx = [];
  for (let i = 0; i < p.hand.length; i++) {
    if (p.hand[i].v === s.target) targetIdx.push(i);
    if (targetIdx.length >= 3) break;
  }
  if (targetIdx.length) return { type: 'play', idx: targetIdx };
  // 没牌可出 → 跳过
  if (!p.hand.length) return { type: 'pass' };
  // 混假牌：1~2 张随机
  const n = Math.random() < 0.5 ? 1 : 2;
  const idx = [];
  for (let i = 0; i < p.hand.length && idx.length < n; i++) idx.push(i);
  return { type: 'play', idx: idx };
}