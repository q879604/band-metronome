import fs from 'fs';

let fail = 0;
function edit(file, pairs, name) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (t.indexOf(a) < 0) {
      console.log('✗ ' + name + ' 未命中: ' + a.slice(0, 50));
      fail++;
    } else {
      t = t.split(a).join(b);
      console.log('✓ ' + name);
    }
  }
  fs.writeFileSync(file, t);
}

// ============ 引擎：createGame(count)，5~8 人 ============
edit('src/common/werewolf.js', [[
  "export function createGame() {\n  const roles = shuffle(ROLE_ORDER);\n  const players = roles.map((r, i) => ({\n    id: i,\n    role: r,\n    alive: true\n  }));",
  "export function createGame(count) {\n  count = count || 6;\n  const wolves = count >= 7 ? 2 : 1;\n  const roles = [];\n  for (let i = 0; i < wolves; i++) roles.push('wolf');\n  roles.push('seer');\n  roles.push('witch');\n  while (roles.length < count) roles.push('villager');\n  const players = shuffle(roles).map((r, i) => ({\n    id: i,\n    role: r,\n    alive: true\n  }));"
]], '引擎 createGame(count)');

// ============ 页面 ============
// 1) 常量 ROWS 2 → 3（8 人也要放得下）
edit('src/pages/werewolf/werewolf.ux', [[
  "  const COLS = 3;\n  const ROWS = 2;",
  "  const COLS = 3;\n  const ROWS = 3;"
]], 'ROWS=3');

// 2) CSS：人数选择器样式
edit('src/pages/werewolf/werewolf.ux', [[
  "  .step {\n    font-size: 18px;",
  "  .countbox {\n    height: 56px;\n    flex-direction: row;\n    align-items: center;\n    justify-content: space-between;\n    background-color: rgba(255, 255, 255, 0.94);\n    border-radius: 14px;\n    padding-left: 10px;\n    padding-right: 10px;\n    margin-bottom: 10px;\n  }\n\n  .cbtn {\n    width: 52px;\n    height: 40px;\n    border-radius: 12px;\n    background-color: #17331d;\n    justify-content: center;\n    align-items: center;\n  }\n\n  .ctext {\n    font-size: 22px;\n    font-weight: bold;\n    color: #ffffff;\n  }\n\n  .cnum {\n    font-size: 24px;\n    font-weight: bold;\n    color: #17331d;\n  }\n\n  .step {\n    font-size: 18px;"
]], '人数选择 CSS');

// 3) 菜单模板：加人数选择
edit('src/pages/werewolf/werewolf.ux', [[
  "      <div class=\"list\" style=\"width: {{ listW }}px;\">\n        <div class=\"card\" onclick=\"startGame\">\n          <text class=\"card-text\">开始游戏（6 人）</text>\n          <text class=\"card-arrow\">&gt;</text>\n        </div>\n        <div class=\"card\" onclick=\"goRules\">\n          <text class=\"card-text\">玩法说明</text>\n          <text class=\"card-arrow\">&gt;</text>\n        </div>\n      </div>\n      <text class=\"hint\">角色：1 狼人 · 1 预言家 · 1 女巫 · 3 平民</text>\n      <text class=\"hint\">同一块表依次传阅看身份，夜晚由主持人操作</text>",
  "      <div class=\"countbox\" style=\"width: {{ listW }}px;\">\n        <div class=\"cbtn\" onclick=\"minus\">\n          <text class=\"ctext\">－</text>\n        </div>\n        <text class=\"cnum\">{{ playerCount }} 人</text>\n        <div class=\"cbtn\" onclick=\"plus\">\n          <text class=\"ctext\">＋</text>\n        </div>\n      </div>\n      <div class=\"list\" style=\"width: {{ listW }}px;\">\n        <div class=\"card\" onclick=\"startGame\">\n          <text class=\"card-text\">开始游戏（{{ playerCount }} 人）</text>\n          <text class=\"card-arrow\">&gt;</text>\n        </div>\n        <div class=\"card\" onclick=\"goRules\">\n          <text class=\"card-text\">玩法说明</text>\n          <text class=\"card-arrow\">&gt;</text>\n        </div>\n      </div>\n      <text class=\"hint\">5 ~ 8 人：狼人 1~2 · 预言家 · 女巫 · 其余平民</text>\n      <text class=\"hint\">同一块表依次传阅看身份，夜晚由主持人操作</text>"
]], '菜单模板');

// 4) JS：playerCount 字段
edit('src/pages/werewolf/werewolf.ux', [[
  "      stage: 'menu', // menu | roles | night | day | over\n      game: null,\n      listW: 320,",
  "      stage: 'menu', // menu | roles | night | day | over\n      game: null,\n      playerCount: 6,\n      listW: 320,"
]], 'playerCount 字段');

// 5) startGame 传人数
edit('src/pages/werewolf/werewolf.ux', [[
  "    startGame() {\n      this.game = createGame();",
  "    startGame() {\n      this.game = createGame(this.playerCount);"
]], 'startGame(count)');

// 6) 人数加减
edit('src/pages/werewolf/werewolf.ux', [[
  "    peekRole() {",
  "    minus() {\n      if (this.playerCount > 5) this.playerCount--;\n    },\n\n    plus() {\n      if (this.playerCount < 8) this.playerCount++;\n    },\n\n    peekRole() {"
]], 'minus/plus');

// 7) 传阅轮数按人数
edit('src/pages/werewolf/werewolf.ux', [[
  "      if (this.holder >= 6) {",
  "      if (this.holder >= this.playerCount) {"
]], 'nextHolder 上界');
edit('src/pages/werewolf/werewolf.ux', [[
  "      this.nextLabel = this.holder >= 6 ? '进入夜晚' : '下一位';",
  "      this.nextLabel = this.holder >= this.playerCount ? '进入夜晚' : '下一位';"
]], 'nextLabel 上界');

// 8) chips 循环与点击按人数
edit('src/pages/werewolf/werewolf.ux', [[
  "      for (let i = 0; i < 6; i++) {",
  "      for (let i = 0; i < this.playerCount; i++) {"
]], 'chips 循环');
edit('src/pages/werewolf/werewolf.ux', [[
  "      if (id < 0 || id > 5) return;",
  "      if (id < 0 || id >= this.playerCount) return;"
]], 'tapChip 上界');

console.log(fail === 0 ? 'werewolf 补丁全部命中' : '失败 ' + fail + ' 处');