import fs from 'fs';
const F = 'src/common/sgs.js';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
function rep(a, b, name) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('✗ ' + name + ' 命中 ' + (parts.length - 1)); fail++; return; }
  s = parts[0] + b + parts[1];
  console.log('✓ ' + name);
}
// 1) createGame 支持全人类座位
rep("export function createGame(count) {", "export function createGame(count, allHuman) {", 'createGame 签名');
rep("    pending: null, // {type:'shan'|'tao'|'juedou', who}", "    allHuman: !!allHuman, // 同表多人：所有座位都由真人操作\n    pending: null, // {type:'shan'|'tao'|'juedou', who}", 'allHuman 字段');
// 2) 濒死：全人类模式下任意座位都要挂起决策
rep("      if (pid === 0) {\n        s.pending = { type: 'tao', who: 0 };\n        return;\n      }", "      if (s.allHuman || pid === 0) {\n        s.pending = { type: 'tao', who: pid };\n        return;\n      }", '濒死挂起');
// 3) 出杀：全人类模式下被指定的座位都要出闪
rep("    if (target === 0) {\n      if (hasCard(t.hand, 'shan')) {\n        s.pending = { type: 'shan', who: 0, from: pid };\n        pushEvent(s, (pid + 1) + '号 对你出杀');\n        return { ok: true, msg: '请出闪' };\n      }\n      damage(s, 0, 1);\n      return { ok: true, msg: '杀中' };\n    }",
  "    if (s.allHuman || target === 0) {\n      if (hasCard(t.hand, 'shan')) {\n        s.pending = { type: 'shan', who: target, from: pid };\n        pushEvent(s, (pid + 1) + '号 对 ' + (target + 1) + '号 出杀');\n        return { ok: true, msg: '请出闪' };\n      }\n      damage(s, target, 1);\n      return { ok: true, msg: '杀中' };\n    }", '出杀挂起');
// 4) 决斗：轮到任意真人时挂起
rep("    if (cur === 0) {\n      s.pending = { type: 'juedou', who: 0 };\n      return;\n    }", "    if (s.allHuman || cur === 0) {\n      s.pending = { type: 'juedou', who: cur };\n      return;\n    }", '决斗挂起');
// 5) respond 支持任意座位
rep("export function respond(s, action) {\n  const pend = s.pending;\n  if (!pend || pend.who !== 0) return;", "export function respond(s, action) {\n  const pend = s.pending;\n  if (!pend) return;\n  const who = pend.who;", 'respond 任意座位');
rep("    if (action) {\n      discardFrom(s, s.players[0].hand, 'shan');\n      pushEvent(s, '你出闪躲过');\n    } else {\n      damage(s, 0, 1);\n    }", "    if (action) {\n      discardFrom(s, s.players[who].hand, 'shan');\n      pushEvent(s, (who + 1) + '号 出闪');\n    } else {\n      damage(s, who, 1);\n    }", 'respond 出闪');
rep("    if (action) {\n      discardFrom(s, s.players[0].hand, 'tao');\n      s.players[0].hp = 1;\n      pushEvent(s, '你吃桃救回');\n    } else {\n      die(s, 0);\n    }", "    if (action) {\n      discardFrom(s, s.players[who].hand, 'tao');\n      s.players[who].hp = 1;\n      pushEvent(s, (who + 1) + '号 吃桃救回');\n    } else {\n      die(s, who);\n    }", 'respond 吃桃');
rep("    if (action) {\n      discardFrom(s, s.players[0].hand, 'sha');\n      s.duel.index = 1 - s.duel.index;\n      stepDuel(s);\n    } else {\n      damage(s, 0, 1);", "    if (action) {\n      discardFrom(s, s.players[who].hand, 'sha');\n      s.duel.index = 1 - s.duel.index;\n      stepDuel(s);\n    } else {\n      damage(s, who, 1);", 'respond 决斗');
fs.writeFileSync(F, s);
console.log(fail === 0 ? 'sgs 引擎同表补丁完成' : '失败 ' + fail + ' 处');
