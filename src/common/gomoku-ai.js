/**
 * 五子棋 AI —— 纯函数实现，不依赖任何框架 API，方便单测与在页面中复用。
 *
 * 棋盘表示：一维数组，长度 n*n，0 = 空，1 = 黑，2 = 白；索引 idx = r * n + c
 *
 * 评分思路（经典「窗口计数」）：
 *   假设在 (r,c) 落子，取四个方向各 5 个含该点的五格窗口；
 *   若窗口内没有对手子/出界，则按窗口内自己子的个数累加 10^k 分。
 *   → 活四 10000、活三 1000、活二 100，双四会自然叠加成 20000，
 *     五连则是 100000（可作胜利阈值，因为不存在五连时最多 4×10000=40000）。
 *   进攻分 × 1.05 + 防守分（对手在该点的分）→ 兼顾连攻与封堵。
 */

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

/** 单点达到该分值即代表「这一点能成五」 */
export const WIN_SCORE = 100000;

const DIRS = [
  [0, 1], // 横
  [1, 0], // 竖
  [1, 1], // 撇
  [1, -1] // 捺
];

const LEVELS = ['easy', 'normal', 'hard'];

export function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function createBoard(n) {
  const board = [];
  for (let i = 0; i < n * n; i++) board.push(EMPTY);
  return board;
}

export function idxOf(n, r, c) {
  return r * n + c;
}

export function isInside(n, r, c) {
  return r >= 0 && c >= 0 && r < n && c < n;
}

/** 取格子：出界返回 -1（当作「被堵」处理） */
export function cellAt(board, n, r, c) {
  if (!isInside(n, r, c)) return -1;
  return board[idxOf(n, r, c)];
}

/** (r,c) 落 player 子后，是否形成五连 */
export function isWin(board, n, r, c, player) {
  for (let d = 0; d < DIRS.length; d++) {
    const dr = DIRS[d][0];
    const dc = DIRS[d][1];
    let count = 1;
    for (let s = 1; s <= 4; s++) {
      if (cellAt(board, n, r + dr * s, c + dc * s) === player) count++;
      else break;
    }
    for (let s = 1; s <= 4; s++) {
      if (cellAt(board, n, r - dr * s, c - dc * s) === player) count++;
      else break;
    }
    if (count >= 5) return true;
  }
  return false;
}

export function isFull(board) {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === EMPTY) return false;
  }
  return true;
}

/** 某点对 player 的价值（window 计数法） */
export function pointScore(board, n, r, c, player) {
  const opp = opponentOf(player);
  let score = 0;
  for (let d = 0; d < DIRS.length; d++) {
    const dr = DIRS[d][0];
    const dc = DIRS[d][1];
    for (let off = -4; off <= 0; off++) {
      let cnt = 0;
      let blocked = false;
      for (let k = 0; k < 5; k++) {
        const rr = r + (off + k) * dr;
        const cc = c + (off + k) * dc;
        const v = rr === r && cc === c ? player : cellAt(board, n, rr, cc);
        if (v === -1 || v === opp) {
          blocked = true;
          break;
        }
        if (v === player) cnt++;
      }
      if (!blocked) score += Math.pow(10, cnt);
    }
  }
  return score;
}

/** 候选点：已有棋子周围 radius 格内的空点（空棋盘返回天元附近） */
export function candidates(board, n, radius, limit) {
  const out = [];
  const seen = {};
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[idxOf(n, r, c)] !== EMPTY) continue;
      let near = false;
      for (let dr = -radius; dr <= radius && !near; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (cellAt(board, n, r + dr, c + dc) !== EMPTY && cellAt(board, n, r + dr, c + dc) !== -1) {
            near = true;
            break;
          }
        }
      }
      if (!near) continue;
      const idx = idxOf(n, r, c);
      if (seen[idx]) continue;
      seen[idx] = true;
      out.push(idx);
    }
  }
  if (typeof limit === 'number' && out.length > limit) {
    // 保留靠近棋盘中心的前 limit 个，降低腕上设备的计算量
    const mid = (n - 1) / 2;
    out.sort((a, b) => {
      const da = Math.abs(Math.floor(a / n) - mid) + Math.abs((a % n) - mid);
      const db = Math.abs(Math.floor(b / n) - mid) + Math.abs((b % n) - mid);
      return da - db;
    });
    return out.slice(0, limit);
  }
  return out;
}

function centerIdx(n) {
  const mid = Math.floor(n / 2);
  return idxOf(n, mid, mid);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** 在候选点里找「落子即五连」的点，没有则返回 -1 */
function findWinMove(board, n, list, player) {
  for (let i = 0; i < list.length; i++) {
    if (pointScore(board, n, Math.floor(list[i] / n), list[i] % n, player) >= WIN_SCORE) {
      return list[i];
    }
  }
  return -1;
}

function rankMoves(board, n, list, player) {
  const opp = opponentOf(player);
  const scored = [];
  for (let i = 0; i < list.length; i++) {
    const r = Math.floor(list[i] / n);
    const c = list[i] % n;
    const mine = pointScore(board, n, r, c, player);
    const theirs = pointScore(board, n, r, c, opp);
    scored.push({ idx: list[i], mine: mine, theirs: theirs, score: mine * 1.05 + theirs });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * 选点
 * @param {number[]} board 棋盘
 * @param {number} n 边长
 * @param {number} player 轮到谁（1 黑 / 2 白）
 * @param {string} level 'easy' | 'normal' | 'hard'
 * @returns {number} 落子索引
 */
export function chooseMove(board, n, player, level) {
  const lv = LEVELS.indexOf(level) >= 0 ? level : 'normal';

  // 空棋盘先占天元
  let stones = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) stones++;
  }
  if (stones === 0) return centerIdx(n);

  const list = candidates(board, n, 2, lv === 'hard' ? 90 : 60);
  // 棋盘已满：无处可下，返回 -1，由调用方判和棋
  if (!list.length) return -1;

  const opp = opponentOf(player);

  // 1) 自己能成五 → 直接赢
  const winNow = findWinMove(board, n, list, player);
  if (winNow >= 0) return winNow;

  // 2) 对手能成五 → 必须封
  const blockNow = findWinMove(board, n, list, opp);
  if (blockNow >= 0) return blockNow;

  const ranked = rankMoves(board, n, list, player);

  if (lv === 'easy') {
    // 新手档：前 6 手里随机，偶尔完全放水
    if (Math.random() < 0.25) return pickRandom(list);
    const top = ranked.slice(0, Math.min(6, ranked.length));
    return pickRandom(top).idx;
  }

  if (lv === 'normal') {
    return ranked[0].idx;
  }

  // 困难档：在最优的前 6 手里做一步预判（我下这里之后，对手最好的回应有多强）
  const shortlist = ranked.slice(0, Math.min(6, ranked.length));
  let bestIdx = shortlist[0].idx;
  let bestVal = -Infinity;
  for (let i = 0; i < shortlist.length; i++) {
    const cand = shortlist[i];
    const next = board.slice();
    next[cand.idx] = player;
    const replyList = candidates(next, n, 2, 40);
    let replyBest = 0;
    if (replyList.length) {
      const replyRanked = rankMoves(next, n, replyList, opp);
      replyBest = replyRanked[0].score;
    }
    const val = cand.score - replyBest * 0.9;
    if (val > bestVal) {
      bestVal = val;
      bestIdx = cand.idx;
    }
  }
  return bestIdx;
}

export const LEVEL_LABELS = {
  easy: '新手',
  normal: '普通',
  hard: '困难'
};

export const LEVEL_ORDER = LEVELS;