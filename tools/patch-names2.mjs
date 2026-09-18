import fs from 'fs';
let fail = 0;
function edit(file, pairs, name) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [a, b, tag] of pairs) {
    const parts = t.split(a);
    if (parts.length !== 2) { console.log(' ' + name + '/' + tag + ' 命中' + (parts.length - 1)); fail++; continue; }
    t = parts[0] + b + parts[1];
    console.log('✓ ' + name + '/' + tag);
  }
  fs.writeFileSync(file, t);
}

// 五子棋：双人模式显示名字+颜色胶囊
edit('src/pages/gomoku/gomoku.ux', [
  ["} from '../../common/gomoku-ai';", "} from '../../common/gomoku-ai';\n  import { defaultNames, colorOf } from '../../common/setup';", 'import'],
  ['      title: \'五子棋\',\n      statusText: \'\',', '      title: \'五子棋\',\n      statusText: \'\',\n      names: [],\n      colors: [],\n      nowName: \'\',\n      nowCls: \'nowchip pc-r\',', 'state'],
  ['    startPvp() {\n      this.mode = \'pvp\';', '    startPvp() {\n      this.mode = \'pvp\';\n      this.names = defaultNames(2);\n      this.colors = [colorOf(0), colorOf(1)];', 'startPvp'],
  ['    startAi() {\n      this.mode = \'ai\';', '    startAi() {\n      this.mode = \'ai\';\n      this.names = [\'你\', \'AI\'];\n      this.colors = [colorOf(0), colorOf(1)];', 'startAi'],
  ['      else this.statusText = this.turn === BLACK ? \'轮到 黑方 落子\' : \'轮到 白方 落子\';',
   '      else this.statusText = \'轮到 \' + (this.names[this.turn - 1] || (this.turn === BLACK ? \'黑方\' : \'白方\')) + \' 落子\';\n      this.nowName =\n        this.mode === \'ai\'\n          ? (this.turn === WHITE ? \'AI 思考中\' : \'你（黑棋）\')\n          : (this.names[this.turn - 1] || (this.turn === BLACK ? \'黑方\' : \'白方\')) +\n            (this.turn === BLACK ? \' 执黑\' : \' 执白\');\n      this.nowCls = \'nowchip \' + (this.colors[this.turn - 1] || \'pc-r\');', '文案'],
  ['        <text class="header-title">{{ title }}</text>', '        <text class="header-title">{{ title }}</text>', 'skip'],
  ['      <div class="status">\n        <text class="status-text">{{ statusText }}</text>\n      </div>',
   '      <text class="nowchip {{ nowCls }}">{{ nowName }}</text>\n      <div class="status">\n        <text class="status-text">{{ statusText }}</text>\n      </div>', '模板']
], 'gomoku.ux');

// 狼人杀：交接文案与结算带上名字
edit('src/pages/werewolf/werewolf.ux', [
  ["} from '../../common/werewolf';", "} from '../../common/werewolf';\n  import { defaultNames } from '../../common/setup';", 'import'],
  ['      over: false,\n      overText: \'\',\n\n      c0:', '      over: false,\n      overText: \'\',\n      names: [],\n\n      c0:', 'state'],
  ['      this.game = createGame(this.playerCount);', '      this.game = createGame(this.playerCount);\n      this.names = defaultNames(this.playerCount);', 'startGame'],
  ['      this.holderText = \'第 1 位玩家\';', '      this.holderText = \'第 1 位玩家（\' + this.nm(0) + \'）\';', 'holderText'],
  ['      this.holderText = \'第 \' + this.holder + \' 位玩家\';', '      this.holderText = \'第 \' + this.holder + \' 位玩家（\' + this.nm(this.holder - 1) + \'）\';', 'holderText2'],
  ['    peekRole() {', '    nm(i) {\n      return this.names[i] || (i + 1) + \'号\';\n    },\n\n    peekRole() {', 'nm()'],
  ['          this[\'c\' + k + \'t\'] = (k + 1) + \'号\' + (p.alive ? \' ♥\' + p.hp : \' 亡\');',
   '          this[\'c\' + k + \'t\'] = this.nm(k) + (p.alive ? \' ♥\' + p.hp : \' 亡\');', '格子文案'],
  ['        this.voteHint = this.voting ? (this.voter + 1) + \'号 投票（不能投自己）\' : \'点「进入夜晚」继续\';',
   '        this.voteHint = this.voting ? this.nm(this.voter) + \' 投票（不能投自己）\' : \'点「进入夜晚」继续\';', '投票提示']
], 'werewolf.ux');

// 谁是卧底：传阅/讨论文案带名字
edit('src/pages/whois/whois.ux', [
  ["  import device from '@system.device';", "  import device from '@system.device';\n  import { defaultNames } from '../../common/setup';", 'import'],
  ['      pair: null,\n      spyIndex: -1,', '      pair: null,\n      names: [],\n      spyIndex: -1,', 'state'],
  ['    startGame() {\n      const pick = PAIRS[Math.floor(Math.random() * PAIRS.length)];',
   '    startGame() {\n      this.names = defaultNames(this.playerCount);\n      const pick = PAIRS[Math.floor(Math.random() * PAIRS.length)];', 'startGame'],
  ['      this.holderText = \'第 1 位玩家\';', '      this.holderText = \'第 1 位玩家（\' + this.nm(0) + \'）\';', 'holder1'],
  ['      this.holderText = \'第 \' + this.holder + \' 位玩家\';', '      this.holderText = \'第 \' + this.holder + \' 位玩家（\' + this.nm(this.holder - 1) + \'）\';', 'holder2'],
  ['    minus() {', '    nm(i) {\n      return this.names[i] || (i + 1) + \'号\';\n    },\n\n    minus() {', 'nm()'],
  ['      this.answerLine1 = \'卧底是 \' + (this.spyIndex + 1) + \' 号\';',
   '      this.answerLine1 = \'卧底是 \' + (this.spyIndex + 1) + \' 号（\' + this.nm(this.spyIndex) + \'）\';', '答案文案'],
  ['      this.orderText = this.order.join(\' → \');', '      this.orderText = this.order.map((n) => this.nm(n - 1)).join(\' → \');', '发言顺序']
], 'whois.ux');

console.log(fail === 0 ? '第二批名字补丁完成' : '失败 ' + fail + ' 处');
