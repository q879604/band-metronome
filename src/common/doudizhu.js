/**
 * 斗地主（简化版）引擎 —— 纯函数，1 人 + 2 AI。
 * 54 张牌：3~10/J/Q/K/A/2 + 小王/大王。
 * 牌型：单 / 对 / 三带一 / 三带二 / 顺子(≥5 连) / 连对(≥3 连) / 炸弹 / 火箭。
 * 简化：不支持飞机、四带二；顺子/连对必须同长度压；叫地主简化为随机。
 * 规则约束：顺子/连对不含 2 与王；AI 的炸弹/火箭兜底必须真压得过上一手。
 */

export const SUIT_CHARS = ['♠', '♥', '♣', '♦'];
export const VALUE_CHARS = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王'
};

export function makeDeck() {
  const deck = [];
  for (let v = 3; v <= 15; v++) {
    for (let s = 0; s < 4; s++) deck.push({ v: v, suit: s });
  }
  deck.push({ v: 16, suit: 4 });
  deck.push({ v: 17, suit: 4 });
  return deck;
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

export function cardText(c) {
  return SUIT_CHARS[c.suit] + VALUE_CHARS[c.v];
}

/** 洗牌发牌：返回 {hands: 3×17, bottom: 3, landlord} */
export function deal() {
  const deck = shuffle(makeDeck());
  return {
    hands: [deck.slice(0, 17), deck.slice(17, 34), deck.slice(34, 51)],
    bottom: deck.slice(51, 54),
    landlord: Math.floor(Math.random() * 3)
  };
}

/** 计数：按面值统计牌 */
export function countByValue(cards) {
  const m = {};
  for (const c of cards) m[c.v] = (m[c.v] || 0) + 1;
  return m;
}

function isConsecutive(vals, minLen) {
  if (vals.length < minLen) return false;
  const s = vals.slice().sort((a, b) => a - b);
  if (s[s.length - 1] >= 15) return false; // 不能含 2 和王
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] + 1) return false;
  return true;
}

/** 解析一手牌型。返回 {ok, type, main, len} */
export function parsePlay(cards) {
  const n = cards.length;
  if (n === 0) return { ok: false, type: '', main: 0, len: 0 };
  const m = countByValue(cards);
  const vals = Object.keys(m).map(Number);
  const counts = vals.map((v) => m[v]);

  if (n === 1) return { ok: true, type: 'single', main: cards[0].v, len: 1 };
  if (n === 2) {
    if (vals.length === 1) return { ok: true, type: 'pair', main: vals[0], len: 2 };
    if (vals.length === 2 && vals.indexOf(16) >= 0 && vals.indexOf(17) >= 0)
      return { ok: true, type: 'rocket', main: 17, len: 2 };
    return { ok: false, type: '', main: 0, len: 0 };
  }
  if (n === 3) {
    if (vals.length === 1) return { ok: true, type: 'triple', main: vals[0], len: 3 };
    return { ok: false, type: '', main: 0, len: 0 };
  }
  if (n === 4) {
    if (vals.length === 1) return { ok: true, type: 'bomb', main: vals[0], len: 4 };
    const t = vals.find((v) => m[v] === 3);
    if (t != null) return { ok: true, type: 'triple1', main: t, len: 4 };
    return { ok: false, type: '', main: 0, len: 0 };
  }
  if (n === 5) {
    const t = vals.find((v) => m[v] === 3);
    if (t != null && vals.length === 2) return { ok: true, type: 'triple2', main: t, len: 5 };
  }
  // 顺子：全部单张且连续（≥5 张，不含 2/王）
  if (vals.length === n && isConsecutive(vals, 5))
    return { ok: true, type: 'straight', main: Math.max(...vals), len: n };
  // 连对：成对且连续（≥3 对，不含 2/王）
  if (vals.length === n / 2 && counts.every((c) => c === 2) && isConsecutive(vals, 3)) {
    return { ok: true, type: 'pairrun', main: Math.max(...vals), len: n };
  }
  return { ok: false, type: '', main: 0, len: 0 };
}

/** a 是否压过 b；b 为 null 表示领出 */
export function beats(a, b) {
  if (!b || !b.ok) return a.ok;
  if (!a.ok) return false;
  if (a.type === 'rocket') return true;
  if (b.type === 'rocket') return false;
  if (a.type === 'bomb' && b.type !== 'bomb') return true;
  if (a.type !== b.type) return false;
  if (a.len !== b.len) return false;
  return a.main > b.main;
}

function nIdx(hand, v, n) {
  const out = [];
  for (let i = 0; i < hand.length && out.length < n; i++) {
    if (hand[i].v === v) out.push(i);
  }
  return out;
}

/** AI 找牌：hand 为牌数组，pending 为上一手（或 null）。返回 {idx:[...]} 或 {pass:true} */
export function findPlay(hand, pending) {
  const m = countByValue(hand);
  const vals = Object.keys(m).map(Number).sort((a, b) => a - b);
  const idxOf = (v) => hand.findIndex((c) => c.v === v);
  const need = pending && pending.ok ? pending : null;

  // 领出：出最小单张（无 2/王优先）
  if (!need) {
    for (const v of vals) {
      if (v <= 14 && m[v] >= 1) return { idx: [idxOf(v)] };
    }
    return { idx: [idxOf(vals[0])] };
  }

  if (need.type === 'single') {
    for (const v of vals) if (v > need.main) return { idx: [idxOf(v)] };
  } else if (need.type === 'pair') {
    for (const v of vals) if (m[v] >= 2 && v > need.main) return { idx: nIdx(hand, v, 2) };
  } else if (need.type === 'triple') {
    for (const v of vals) if (m[v] >= 3 && v > need.main) return { idx: nIdx(hand, v, 3) };
  } else if (need.type === 'triple1') {
    for (const v of vals) {
      if (m[v] >= 3 && v > need.main) {
        const idx = nIdx(hand, v, 3);
        const rest = hand.map((c, i) => ({ c, i })).filter((x) => idx.indexOf(x.i) < 0);
        if (rest.length) return { idx: idx.concat([rest[0].i]) };
      }
    }
  } else if (need.type === 'triple2') {
    for (const v of vals) {
      if (m[v] >= 3 && v > need.main) {
        const idx = nIdx(hand, v, 3);
        const rest = hand.map((c, i) => ({ c, i })).filter((x) => idx.indexOf(x.i) < 0);
        const p = rest.find((x) => m[x.c.v] >= 2);
        if (p) return { idx: idx.concat(nIdx(hand, p.c.v, 2)) };
      }
    }
  } else if (need.type === 'straight') {
    for (let start = 3; start + need.len - 1 <= 14; start++) {
      if (start + need.len - 1 > need.main && hasStraight(hand, start, need.len)) {
        const idx = [];
        for (let v = start; v < start + need.len; v++) idx.push(idxOf(v));
        return { idx: idx };
      }
    }
  } else if (need.type === 'pairrun') {
    const pairs = need.len / 2;
    for (let start = 3; start + pairs - 1 <= 14; start++) {
      if (start + pairs - 1 > need.main && hasPairrun(hand, start, pairs)) {
        const idx = [];
        for (let v = start; v < start + pairs; v++) idx.push(...nIdx(hand, v, 2));
        return { idx: idx };
      }
    }
  }

  // 炸弹 / 火箭兜底（必须真压得过上一手）
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
  return { pass: true };
}

function hasStraight(hand, start, len) {
  const m = countByValue(hand);
  for (let v = start; v < start + len; v++) if (!m[v]) return false;
  return true;
}

function hasPairrun(hand, start, pairs) {
  const m = countByValue(hand);
  for (let v = start; v < start + pairs; v++) if (!m[v] || m[v] < 2) return false;
  return true;
}