import fs from 'fs';
let fail = 0;
function edit(file, pairs, name) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [a, b, tag] of pairs) {
    const parts = t.split(a);
    if (parts.length !== 2) { console.log('✗ ' + name + '/' + tag + ' 命中' + (parts.length - 1)); fail++; continue; }
    t = parts[0] + b + parts[1];
    console.log('✓ ' + name + '/' + tag);
  }
  fs.writeFileSync(file, t);
}

// 0) 主题：加一个彩色名字胶囊样式
edit('src/common/theme.css', [[
  '.info {',
  '.nowchip {\n  font-size: 15px;\n  font-weight: bold;\n  color: #ffffff;\n  padding: 2px 12px;\n  border-radius: 11px;\n}\n\n.info {'
]], 'theme.css');

// 1) UNO
edit('src/pages/uno/uno.ux', [
  ["} from '../../common/uno';", "} from '../../common/uno';\n  import { defaultNames, colorOf } from '../../common/setup';", 'import'],
  ['      drewThisTurn: false,', '      drewThisTurn: false,\n      names: [],\n      colors: [],\n      nowName: \'\',\n      nowCls: \'nowchip pc-r\',\n      hist: \'\',', 'state'],
  ['      this.game = createGame(count);', '      this.game = createGame(count);\n      this.names = defaultNames(count);\n      this.colors = [];\n      for (let i = 0; i < count; i++) this.colors.push(colorOf(i));', 'startGame'],
  ['      } else if (s.current === 0) {\n        this.statusText = \'轮到你 · 手里 \' + counts[0] + \' 张\';\n      } else {\n        this.statusText = s.current + 1 + \'号 出牌中…\';\n      }',
   '      } else {\n        this.statusText = \'轮到 \' + (this.names[s.current] || s.current + 1 + \'号\') + \' · 手里 \' + counts[s.current] + \' 张\';\n      }\n      this.nowName = this.names[s.current] || s.current + 1 + \'号\';\n      this.nowCls = \'nowchip \' + (this.colors[s.current] || \'pc-r\');\n      this.hist = s.log.slice(-2).join(\' · \');', '状态文案'],
  ['      <text class="info">{{ statusText }}</text>', '      <text class="nowchip {{ nowCls }}">{{ nowName }}</text>\n      <text class="info">{{ statusText }}</text>\n      <text class="sub">{{ hist }}</text>', '模板']
], 'uno.ux');

// 2) 斗地主
edit('src/pages/doudizhu/doudizhu.ux', [
  ["import { deal, cardText, parsePlay, beats, findPlay } from '../../common/doudizhu';",
   "import { deal, cardText, parsePlay, beats, findPlay } from '../../common/doudizhu';\n  import { defaultNames, colorOf } from '../../common/setup';", 'import'],
  ['      sel: [],\n      page: 0,\n      pagerOn: false,', '      sel: [],\n      page: 0,\n      pagerOn: false,\n      names: [],\n      colors: [],\n      nowName: \'\',\n      nowCls: \'nowchip pc-r\',\n      hist: \'\',', 'state'],
  ['      this.hands = [d.hands[0].slice(), d.hands[1].slice(), d.hands[2].slice()];',
   '      this.hands = [d.hands[0].slice(), d.hands[1].slice(), d.hands[2].slice()];\n      this.names = defaultNames(3);\n      this.colors = [colorOf(0), colorOf(1), colorOf(2)];', 'startGame'],
  ['      this.pendingText = this.pending\n        ? (this.pending.owner + 1) + \'号 出了 \' + TYPE_NAME[this.pending.type] +\n          \'（\' + this.pending.cards.map((c) => cardText(c).slice(1)).join(\' \') + \'）\'\n        : \'新一轮 · 由 \' + (this.cur + 1) + \'号 领出\';',
   '      this.pendingText = this.pending\n        ? this.nm(this.pending.owner) + \' 出了 \' + TYPE_NAME[this.pending.type] +\n          \'（\' + this.pending.cards.map((c) => cardText(c).slice(1)).join(\' \') + \'）\'\n        : \'新一轮 · 由 \' + this.nm(this.cur) + \' 领出\';\n      this.nowName = this.nm(this.cur);\n      this.nowCls = \'nowchip \' + (this.colors[this.cur] || \'pc-r\');\n      this.hist = (this.pending ? \'上一手：\' + TYPE_NAME[this.pending.type] : \'\') ;', '文案'],
  ['    renderHand() {', '    nm(i) {\n      return this.names[i] || (i + 1) + \'号\';\n    },\n\n    renderHand() {', 'nm()'],
  ['      <text class="info">{{ topLine }}</text>', '      <text class="nowchip {{ nowCls }}">{{ nowName }}</text>\n      <text class="info">{{ topLine }}</text>\n      <text class="sub">{{ hist }}</text>', '模板']
], 'doudizhu.ux');

// 3) 骗子酒馆
edit('src/pages/liar/liar.ux', [
  ["} from '../../common/liar';", "} from '../../common/liar';\n  import { defaultNames, colorOf } from '../../common/setup';", 'import'],
  ['      topLine: \'\',\n      midLine: \'\',', '      topLine: \'\',\n      midLine: \'\',\n      names: [],\n      colors: [],\n      nowName: \'\',\n      nowCls: \'nowchip pc-r\',\n      hist: \'\',', 'state'],
  ['      this.game = createGame(this.playerCount);', '      this.game = createGame(this.playerCount);\n      this.names = defaultNames(this.playerCount);\n      this.colors = [];\n      for (let i = 0; i < this.playerCount; i++) this.colors.push(colorOf(i));', 'startGame'],
  ['      this.logLine = g.log[0] || \'\';', '      this.logLine = g.log[0] || \'\';\n      this.nowName = this.nm(g.cur);\n      this.nowCls = \'nowchip \' + (this.colors[g.cur] || \'pc-r\');\n      this.hist = g.log.slice(0, 2).join(\' · \');', '文案'],
  ['    renderHand() {', '    nm(i) {\n      return this.names[i] || (i + 1) + \'号\';\n    },\n\n    renderHand() {', 'nm()'],
  ['      <text class="info">{{ topLine }}</text>', '      <text class="nowchip {{ nowCls }}">{{ nowName }}</text>\n      <text class="info">{{ topLine }}</text>\n      <text class="sub">{{ hist }}</text>', '模板']
], 'liar.ux');

// 4) 三国杀
edit('src/pages/sgs/sgs.ux', [
  ["} from '../../common/sgs';", "} from '../../common/sgs';\n  import { defaultNames, colorOf } from '../../common/setup';", 'import'],
  ['      infoLine: \'\',\n      eventLine: \'\',', '      infoLine: \'\',\n      eventLine: \'\',\n      names: [],\n      colors: [],\n      nowName: \'\',\n      nowCls: \'nowchip pc-r\',\n      hist: \'\',', 'state'],
  ['      this.game = createGame(this.playerCount, this.mode === \'hotseat\');', '      this.game = createGame(this.playerCount, this.mode === \'hotseat\');\n      this.names = defaultNames(this.playerCount);\n      this.colors = [];\n      for (let i = 0; i < this.playerCount; i++) this.colors.push(colorOf(i));', 'startGame'],
  ['      this.infoLine =\n        (this.viewer + 1) + \'号：\' + ROLE_NAME[p.role] + \' · HP \' + p.hp + \' · 手牌 \' + p.hand.length;',
   '      this.infoLine =\n        this.nm(this.viewer) + \'（\' + (this.viewer + 1) + \'号）· \' + ROLE_NAME[p.role] +\n        \' · HP \' + p.hp + \' · 手牌 \' + p.hand.length;\n      this.nowName = this.nm(g.current);\n      this.nowCls = \'nowchip \' + (this.colors[g.current] || \'pc-r\');\n      this.hist = g.events.slice(-2).join(\' · \');', '文案'],
  ['    renderHand() {', '    nm(i) {\n      return this.names[i] || (i + 1) + \'号\';\n    },\n\n    renderHand() {', 'nm()'],
  ['      <text class="info">{{ infoLine }}</text>', '      <text class="nowchip {{ nowCls }}">{{ nowName }}</text>\n      <text class="info">{{ infoLine }}</text>\n      <text class="sub">{{ hist }}</text>', '模板'],
  ['        this.coverText =\n          \'轮到 \' + (g.cur + 1) + \'号 · 目标点数 \' + VALUE_CHARS[g.target] + \' · 把表交给 TA\';', '        this.coverText =\n          \'轮到 \' + (g.cur + 1) + \'号 · 目标点数 \' + VALUE_CHARS[g.target] + \' · 把表交给 TA\';', '占位跳过']
], 'sgs.ux');

console.log(fail === 0 ? '名字/颜色/历史 补丁完成' : '失败 ' + fail + ' 处');
