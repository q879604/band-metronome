/**
 * 大富翁（简化版）引擎 —— 纯函数。
 * 24 格：起点 / 地产(买+升级) / 机会 / 税 / 监狱(停一轮) / 赌场(有输有赢) /
 *        捡到钱 / 汽车站(前进3格) / 机场(花200随机飞)。
 * 经济：过起点 +400；租金 = ceil(房价×30%/10)×10×(1+等级)；破产前先半价变卖地产。
 * 结束：只剩一人存活，或 60 回合后比总资产。
 */

export const CELL_COUNT = 24;
export const PASS_SALARY = 400;
export const MAX_ROUNDS = 60;
export const AIRPORT_FEE = 200;
export const CASINO_BET = 300;

export const MONEY_OPTIONS = [2000, 5000, 10000, 15000];

const CHANCES = [
  { text: '发奖金 +300', money: 300 },
  { text: '交罚款 -200', money: -200 },
  { text: '捡到钱 +150', money: 150 },
  { text: '意外支出 -100', money: -100 },
  { text: '回到起点 +400', jump: 0 },
  { text: '后退 3 格', back: 3 },
  { text: '补缴税款 -300', money: -300 },
  { text: '投资收益 +250', money: 250 }
];

const LAYOUT = [
  { t: 'start', name: '起点' },
  { t: 'prop', name: '越南', price: 300 },
  { t: 'chance', name: '机会' },
  { t: 'prop', name: '韩国', price: 350 },
  { t: 'tax', name: '税', amount: 200 },
  { t: 'casino', name: '赌场', bet: CASINO_BET },
  { t: 'prop', name: '日本', price: 400 },
  { t: 'road', name: '汽车站', step: 3 },
  { t: 'prop', name: '俄罗斯', price: 450 },
  { t: 'cash', name: '捡到钱' },
  { t: 'prop', name: '德国', price: 500 },
  { t: 'chance', name: '机会' },
  { t: 'jail', name: '监狱' },
  { t: 'prop', name: '法国', price: 550 },
  { t: 'airport', name: '机场' },
  { t: 'prop', name: '西班牙', price: 600 },
  { t: 'casino', name: '赌场', bet: CASINO_BET },
  { t: 'prop', name: '意大利', price: 650 },
  { t: 'cash', name: '捡到钱' },
  { t: 'tax', name: '税', amount: 400 },
  { t: 'prop', name: '美国', price: 700 },
  { t: 'chance', name: '机会' },
  { t: 'prop', name: '白云机场', price: 900 },
  { t: 'prop', name: '阿尔卑斯山', price: 1000 }
];

export const BOARD = LAYOUT;

export function rentOf(cell, level) {
  return Math.ceil((cell.price * 0.3) / 10) * 10 * (level + 1);
}

export function createGame(count, money) {
  const start = money || MONEY_OPTIONS[0];
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push({ money: start, pos: 0, props: [], alive: true, skip: 0 });
  }
  return { players: players, current: 0, round: 1, log: ['开局：每人 ¥' + start] };
}

export function rollDice() {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  return { a: a, b: b, sum: a + b };
}

function pushLog(s, t) {
  s.log.push(t);
  if (s.log.length > 6) s.log.shift();
}

export function move(s, steps) {
  const p = s.players[s.current];
  const from = p.pos;
  p.pos = (p.pos + steps) % CELL_COUNT;
  if (from + steps >= CELL_COUNT) {
    p.money += PASS_SALARY;
    pushLog(s, (s.current + 1) + '号 过起点 +' + PASS_SALARY);
  }
  return { passed: from + steps >= CELL_COUNT, landed: p.pos };
}

function findOwner(s, cellIdx) {
  for (let i = 0; i < s.players.length; i++) {
    const e = s.players[i].props.find((q) => q.i === cellIdx);
    if (e) return { player: i, level: e.level };
  }
  return null;
}

/** 结算落点。depth 用于处理「汽车站→再走 3 格」的连环结算 */
export function settle(s, depth) {
  const d = depth || 0;
  const p = s.players[s.current];
  const cell = BOARD[p.pos];

  if (cell.t === 'prop') {
    const ow = findOwner(s, p.pos);
    if (ow && ow.player === s.current) return { type: 'own', cell: p.pos, name: cell.name, level: ow.level };
    if (ow) {
      const rent = rentOf(cell, ow.level);
      p.money -= rent;
      s.players[ow.player].money += rent;
      pushLog(s, (s.current + 1) + '号 付租 ' + rent + ' 给 ' + (ow.player + 1) + '号');
      return { type: 'rent', amount: rent, owner: ow.player, cell: p.pos, name: cell.name };
    }
    return { type: 'buy', price: cell.price, cell: p.pos, name: cell.name };
  }

  if (cell.t === 'tax') {
    p.money -= cell.amount;
    pushLog(s, (s.current + 1) + '号 缴税 ' + cell.amount);
    return { type: 'tax', amount: cell.amount, name: cell.name };
  }

  if (cell.t === 'jail') {
    p.skip = 1;
    pushLog(s, (s.current + 1) + '号 被关进监狱，暂停一轮');
    return { type: 'jail', name: cell.name };
  }

  if (cell.t === 'casino') {
    pushLog(s, (s.current + 1) + '号 进了赌场');
    return { type: 'casino', bet: cell.bet || CASINO_BET, name: cell.name };
  }

  if (cell.t === 'cash') {
    const amt = (1 + Math.floor(Math.random() * 5)) * 100;
    p.money += amt;
    pushLog(s, (s.current + 1) + '号 捡到钱 +' + amt);
    return { type: 'cash', amount: amt, name: cell.name };
  }

  if (cell.t === 'airport') {
    p.money -= AIRPORT_FEE;
    const to = Math.floor(Math.random() * CELL_COUNT);
    p.pos = to;
    pushLog(s, (s.current + 1) + '号 花 ' + AIRPORT_FEE + ' 从机场飞到「' + BOARD[to].name + '」');
    const out = { type: 'airport', fee: AIRPORT_FEE, to: to, toName: BOARD[to].name };
    if (d < 2) out.inner = settle(s, d + 1);
    return out;
  }

  if (cell.t === 'road') {
    const step = cell.step || 3;
    move(s, step);
    pushLog(s, (s.current + 1) + '号 在汽车站搭车前进 ' + step + ' 格 →「' + BOARD[p.pos].name + '」');
    const out = { type: 'road', step: step, to: p.pos, toName: BOARD[p.pos].name };
    if (d < 2) out.inner = settle(s, d + 1);
    return out;
  }

  if (cell.t === 'chance') {
    const card = CHANCES[Math.floor(Math.random() * CHANCES.length)];
    if (card.money != null) {
      p.money += card.money;
      pushLog(s, card.text);
      return { type: 'chance', card: card };
    }
    if (card.jump != null) {
      p.pos = card.jump;
      p.money += PASS_SALARY;
      pushLog(s, card.text);
      return { type: 'chance', card: card, landed: p.pos };
    }
    if (card.back != null) {
      p.pos = Math.max(0, p.pos - card.back);
      pushLog(s, card.text);
      return { type: 'chance', card: card, landed: p.pos };
    }
  }

  return { type: 'info', name: cell.name };
}

/** 赌场：押 bet，赢翻倍拿走，输掉本金（45% 胜率，心跳感） */
export function casinoPlay(s, gamble) {
  const p = s.players[s.current];
  if (!gamble) {
    pushLog(s, (s.current + 1) + '号 没敢下注');
    return { ok: true, played: false };
  }
  const bet = CASINO_BET;
  if (p.money < bet) return { ok: false, msg: '钱不够下注 ¥' + bet };
  const win = Math.random() < 0.45;
  if (win) {
    p.money += bet;
    pushLog(s, (s.current + 1) + '号 赌赢了 +' + bet);
  } else {
    p.money -= bet;
    pushLog(s, (s.current + 1) + '号 赌输了 -' + bet);
  }
  return { ok: true, played: true, win: win, amount: bet };
}

export function buyProp(s, cellIdx) {
  const p = s.players[s.current];
  const cell = BOARD[cellIdx];
  p.money -= cell.price;
  p.props.push({ i: cellIdx, level: 0 });
  pushLog(s, (s.current + 1) + '号 买入 ' + cell.name);
}

export function upgradeProp(s, cellIdx) {
  const p = s.players[s.current];
  const e = p.props.find((q) => q.i === cellIdx);
  if (!e || e.level >= 2) return { ok: false, msg: '不能再升级' };
  const cost = BOARD[cellIdx].price;
  if (p.money < cost) return { ok: false, msg: '钱不够升级' };
  p.money -= cost;
  e.level++;
  pushLog(s, (s.current + 1) + '号 升级 ' + BOARD[cellIdx].name + ' Lv' + (e.level + 1));
  return { ok: true, cost: cost, level: e.level };
}

export function checkBankrupt(s) {
  const p = s.players[s.current];
  if (p.money < 0 && p.props.length) {
    while (p.money < 0 && p.props.length) {
      const e = p.props.pop();
      p.money += Math.floor(BOARD[e.i].price / 2);
      pushLog(s, (s.current + 1) + '号 变卖 ' + BOARD[e.i].name + ' 抵债');
    }
  }
  if (p.money < 0) {
    p.alive = false;
    pushLog(s, (s.current + 1) + '号 破产出局');
    return true;
  }
  return false;
}

export function endTurn(s) {
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    s.current = (s.current + 1) % n;
    if (s.current === 0) s.round++;
    const p = s.players[s.current];
    if (!p.alive) continue;
    if (p.skip > 0) {
      p.skip--;
      pushLog(s, (s.current + 1) + '号 监狱中，暂停一回合');
      continue;
    }
    return { done: false, round: s.round };
  }
  return { done: true, round: s.round };
}

export function aliveCount(s) {
  let c = 0;
  let last = -1;
  for (let i = 0; i < s.players.length; i++) {
    if (s.players[i].alive) {
      c++;
      last = i;
    }
  }
  return { count: c, last: last };
}

export function wealthOf(p) {
  let w = Math.max(0, p.money);
  for (const e of p.props) w += BOARD[e.i].price;
  return w;
}

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
}