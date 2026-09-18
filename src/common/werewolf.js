/**
 * 狼人杀（简化版）引擎 —— 纯函数，6 人同表传阅式。
 * 角色：1 狼人 / 1 预言家 / 1 女巫 / 3 平民（无猎人/守卫/警长）。
 *
 * 流程：身份传阅 → 夜晚(狼人→预言家→女巫) → 天亮公布死讯 → 讨论 → 投票 → 循环。
 * 胜负：狼人全灭 = 好人胜；狼人数 ≥ 存活好人 = 狼胜。
 */

export const ROLE_LABELS = {
  wolf: '狼人',
  seer: '预言家',
  witch: '女巫',
  villager: '平民'
};

export const ROLE_ORDER = ['wolf', 'seer', 'witch', 'villager', 'villager', 'villager'];

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

export function wolfIdxOf(s) {
  return s.players.findIndex((p) => p.role === 'wolf');
}

export function seerIdxOf(s) {
  return s.players.findIndex((p) => p.role === 'seer');
}

export function createGame(count) {
  count = count || 6;
  const wolves = count >= 7 ? 2 : 1;
  const roles = [];
  for (let i = 0; i < wolves; i++) roles.push('wolf');
  roles.push('seer');
  roles.push('witch');
  while (roles.length < count) roles.push('villager');
  const players = shuffle(roles).map((r, i) => ({
    id: i,
    role: r,
    alive: true
  }));
  return {
    players: players,
    round: 1,
    phase: 'roles', // roles | night | day | over
    nightStep: 'wolf', // wolf | seer | witch
    wolfTarget: -1, // 狼人刀的人（晚上生效）
    witchSave: false, // 今晚是否用了解药
    witchPoison: false, // 今晚是否用了毒药
    poisonTarget: -1,
    witchHasSave: true,
    witchHasPoison: true,
    seerResult: '',
    nightResult: '',
    dayDeaths: [],
    votes: [],
    log: [],
    winner: ''
  };
}

export function aliveList(s) {
  return s.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
}

export function aliveCountOf(s, role) {
  return s.players.filter((p) => p.alive && p.role === role).length;
}

/** 狼人出刀（只能选存活且非狼人） */
export function nightWolf(s, target) {
  const t = s.players[target];
  if (!t || !t.alive) return { ok: false, msg: '目标无效' };
  if (t.role === 'wolf') return { ok: false, msg: '不能刀自己' };
  s.wolfTarget = target;
  s.nightResult = '狼人已选定目标';
  return { ok: true };
}

/** 预言家验人（选存活、非自己；验狼人当然允许） */
export function nightSeer(s, target) {
  const t = s.players[target];
  if (!t || !t.alive) return { ok: false, msg: '目标无效' };
  if (target === seerIdxOf(s)) return { ok: false, msg: '不能验自己' };
  s.seerResult = (target + 1) + '号 是 ' + ROLE_LABELS[t.role];
  s.nightResult = '预言家已完成查验';
  return { ok: true };
}

/**
 * 女巫行动：
 *   nightWitch(s, 'save')           用解药救狼刀的人
 *   nightWitch(s, 'poison', target) 用毒药毒 target
 *   nightWitch(s, 'skip')           跳过
 */
export function nightWitch(s, action, target) {
  if (action === 'save') {
    if (!s.witchHasSave) return { ok: false, msg: '解药用过了' };
    if (s.wolfTarget < 0) return { ok: false, msg: '今晚没人被杀' };
    s.witchHasSave = false;
    s.witchSave = true;
    s.nightResult = '女巫使用了解药';
    return { ok: true };
  }
  if (action === 'poison') {
    if (!s.witchHasPoison) return { ok: false, msg: '毒药用过了' };
    const t = s.players[target];
    if (!t || !t.alive) return { ok: false, msg: '目标无效' };
    if (t.role === 'witch') return { ok: false, msg: '不能毒自己' };
    s.witchHasPoison = false;
    s.witchPoison = true;
    s.poisonTarget = target;
    s.nightResult = '女巫使用了毒药';
    return { ok: true };
  }
  s.nightResult = '女巫选择跳过';
  return { ok: true };
}

/** 天亮结算：狼刀(除非被救) + 毒药，返回死者 id 列表 */
export function resolveNight(s) {
  const deaths = [];
  if (s.wolfTarget >= 0 && !s.witchSave) deaths.push(s.wolfTarget);
  if (s.witchPoison && s.poisonTarget >= 0) deaths.push(s.poisonTarget);
  const set = [];
  for (const d of deaths) if (d >= 0 && set.indexOf(d) < 0) set.push(d);
  for (const d of set) if (s.players[d].alive) s.players[d].alive = false;
  s.dayDeaths = set;
  s.wolfTarget = -1;
  s.witchSave = false;
  s.witchPoison = false;
  s.poisonTarget = -1;
  s.round++;
  return set;
}

/** 白天投票：最高票者出局（平票无人出局） */
export function resolveVote(s, votes) {
  const counts = {};
  for (const v of votes) {
    if (!v || v.to < 0) continue;
    counts[v.to] = (counts[v.to] || 0) + 1;
  }
  let maxN = 0;
  let dead = -1;
  let tie = false;
  for (const k in counts) {
    if (counts[k] > maxN) {
      maxN = counts[k];
      dead = Number(k);
      tie = false;
    } else if (counts[k] === maxN) {
      tie = true;
    }
  }
  if (dead >= 0 && !tie && s.players[dead].alive) {
    s.players[dead].alive = false;
    return dead;
  }
  return -1;
}

/** 胜负判定：'good' | 'wolf' | '' */
export function checkEnd(s) {
  const wolves = aliveCountOf(s, 'wolf');
  if (wolves === 0) {
    s.winner = 'good';
    return 'good';
  }
  const good = s.players.filter((p) => p.alive && p.role !== 'wolf').length;
  if (wolves >= good) {
    s.winner = 'wolf';
    return 'wolf';
  }
  return '';
}