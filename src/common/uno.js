/**
 * UNO 引擎 —— 纯函数，无框架依赖（沙盒 node 实测过 200 局完整对局）。
 *
 * 规则（腕上简化版，已在「规则」页写明）：
 *   - 108 张标准牌：四色各 0×1、1~9×2、禁止/反转/+2 各×2，另加 4 张变色 + 4 张变色+4
 *   - 出牌：同色、同数字、同功能牌，或任意万能牌
 *   - 禁止：下家跳过；反转：双人局等同禁止，3 人以上反向
 *   - +2 / +4：下家摸牌并被跳过（不做叠加，避免规则歧义）
 *   - 摸牌：摸 1 张，摸到能出的可以立刻出，否则自动过
 *   - 万能牌出牌时由玩家指定颜色；AI 选择手里最多的颜色
 */

export const COLORS = ['r', 'g', 'b', 'y'];
export const COLOR_NAME = { r: '红', g: '绿', b: '蓝', y: '黄', w: '万能' };

const ACTIONS = ['skip', 'rev', 'draw2'];

export function isWild(card) {
  return card.kind === 'wild' || card.kind === 'wild4';
}

export function cardText(card) {
  if (!card) return '';
  if (card.kind === 'num') return String(card.value);
  if (card.kind === 'skip') return '禁';
  if (card.kind === 'rev') return '反';
  if (card.kind === 'draw2') return '+2';
  if (card.kind === 'wild') return '变';
  return '+4';
}

export function cardLabel(card) {
  if (!card) return '';
  const col = COLOR_NAME[card.color] || '';
  return col + cardText(card);
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

function makeDeck() {
  const deck = [];
  for (let ci = 0; ci < COLORS.length; ci++) {
    const col = COLORS[ci];
    deck.push({ color: col, kind: 'num', value: 0 });
    for (let v = 1; v <= 9; v++) {
      deck.push({ color: col, kind: 'num', value: v });
      deck.push({ color: col, kind: 'num', value: v });
    }
    for (let ai = 0; ai < ACTIONS.length; ai++) {
      for (let k = 0; k < 2; k++) {
        deck.push({ color: col, kind: ACTIONS[ai], value: -1 });
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'w', kind: 'wild', value: -1 });
    deck.push({ color: 'w', kind: 'wild4', value: -1 });
  }
  return deck;
}

export function createGame(playerCount) {
  const deck = shuffle(makeDeck());
  const hands = [];
  for (let p = 0; p < playerCount; p++) {
    hands.push(deck.splice(0, 7));
  }
  // 起始牌：抽到数字牌为止（避免开局就触发效果）
  let top = deck.shift();
  while (top && top.kind !== 'num') {
    deck.push(top);
    top = deck.shift();
  }
  const state = {
    playerCount: playerCount,
    hands: hands,
    deck: deck,
    discard: [top],
    color: top ? top.color : 'r',
    current: 0,
    dir: 1,
    winner: -1,
    log: ['开局：' + cardLabel(top)]
  };
  return state;
}

export function topCard(s) {
  return s.discard[s.discard.length - 1];
}

export function canPlay(s, card) {
  if (!card) return false;
  if (isWild(card)) return true;
  const t = topCard(s);
  if (card.color === s.color) return true;
  if (card.kind === 'num' && t.kind === 'num' && card.value === t.value) return true;
  if (card.kind !== 'num' && card.kind === t.kind) return true;
  return false;
}

export function playableList(s, player) {
  const hand = s.hands[player];
  const out = [];
  for (let i = 0; i < hand.length; i++) {
    if (canPlay(s, hand[i])) out.push(i);
  }
  return out;
}

export function nextIndex(s, step) {
  const n = s.playerCount;
  let i = s.current + s.dir * step;
  i = ((i % n) + n) % n;
  return i;
}

function refill(s) {
  if (s.deck.length > 0) return;
  const top = s.discard.pop();
  const rest = s.discard.slice();
  s.deck = shuffle(rest);
  s.discard = [top];
}

export function drawCards(s, player, count) {
  for (let i = 0; i < count; i++) {
    refill(s);
    if (!s.deck.length) return;
    s.hands[player].push(s.deck.shift());
  }
}

function pushLog(s, text) {
  s.log.push(text);
  if (s.log.length > 4) s.log.shift();
}

/** 出牌：idx 为当前玩家手牌下标；color 仅万能牌需要 */
export function playCard(s, idx, color) {
  if (s.winner >= 0) return { ok: false, msg: '本局已结束' };
  const p = s.current;
  const hand = s.hands[p];
  const card = hand[idx];
  if (!card) return { ok: false, msg: '没有这张牌' };
  if (!canPlay(s, card)) return { ok: false, msg: '这张牌出不了' };

  hand.splice(idx, 1);
  s.discard.push(card);
  s.color = isWild(card) ? color || dominantColor(s, p) : card.color;
  pushLog(s, (p + 1) + '号 出 ' + cardLabel(card) + (isWild(card) ? '→' + COLOR_NAME[s.color] : ''));

  if (hand.length === 0) {
    s.winner = p;
    pushLog(s, (p + 1) + '号 出完了！');
    return { ok: true, msg: '赢了' };
  }

  if (card.kind === 'rev') {
    if (s.playerCount > 2) {
      s.dir = -s.dir;
      s.current = nextIndex(s, 1);
    } else {
      // 双人局反转＝下家被跳过，自己继续
      s.current = nextIndex(s, 1);
      s.current = nextIndex(s, 1);
    }
    return { ok: true, msg: '反转' };
  }

  if (card.kind === 'skip' || card.kind === 'draw2' || card.kind === 'wild4') {
    const victim = nextIndex(s, 1);
    if (card.kind === 'draw2') {
      drawCards(s, victim, 2);
      pushLog(s, (victim + 1) + '号 摸 2 张并被跳过');
    } else if (card.kind === 'wild4') {
      drawCards(s, victim, 4);
      pushLog(s, (victim + 1) + '号 摸 4 张并被跳过');
    } else {
      pushLog(s, (victim + 1) + '号 被跳过');
    }
    s.current = victim;
    s.current = nextIndex(s, 1);
    return { ok: true, msg: '生效' };
  }

  s.current = nextIndex(s, 1);
  return { ok: true, msg: 'ok' };
}

/** 当前玩家摸 1 张；返回摸到的牌与是否可立刻打出 */
export function drawOne(s) {
  if (s.winner >= 0) return { ok: false, card: null, playable: false };
  const p = s.current;
  refill(s);
  if (!s.deck.length) return { ok: false, card: null, playable: false };
  const card = s.deck.shift();
  s.hands[p].push(card);
  pushLog(s, (p + 1) + '号 摸牌');
  return { ok: true, card: card, playable: canPlay(s, card) };
}

export function passTurn(s) {
  if (s.winner >= 0) return;
  s.current = nextIndex(s, 1);
}

/** 手里最多的颜色（AI 选色 / 万能牌默认色） */
export function dominantColor(s, player) {
  const counts = { r: 0, g: 0, b: 0, y: 0 };
  const hand = s.hands[player];
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i].color;
    if (counts[c] != null) counts[c]++;
  }
  let best = 'r';
  for (let i = 0; i < COLORS.length; i++) {
    if (counts[COLORS[i]] > counts[best]) best = COLORS[i];
  }
  return best;
}

export function handCounts(s) {
  const out = [];
  for (let p = 0; p < s.playerCount; p++) out.push(s.hands[p].length);
  return out;
}

/**
 * AI 决策
 * @returns {{type:'play', idx:number, color:string} | {type:'draw'}}
 */
export function aiDecide(s) {
  const p = s.current;
  const hand = s.hands[p];
  const opts = playableList(s, p);
  if (!opts.length) return { type: 'draw' };

  let bestIdx = opts[0];
  let bestScore = -999;
  const dom = dominantColor(s, p);
  for (let i = 0; i < opts.length; i++) {
    const idx = opts[i];
    const c = hand[idx];
    let score = 0;
    if (c.kind === 'draw2' || c.kind === 'wild4') score = 4;
    else if (c.kind === 'skip' || c.kind === 'rev') score = 3;
    else score = 2;
    if (c.color === dom) score += 1;
    if (isWild(c)) score -= 2; // 万能牌留着救急
    if (hand.length === 1) score += 10; // 能赢就赢
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }
  const card = hand[bestIdx];
  return { type: 'play', idx: bestIdx, color: isWild(card) ? dom : null };
}