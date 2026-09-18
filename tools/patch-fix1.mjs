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

// 1) 遮罩改纯黑（交接时不能透看到牌）
edit('src/common/theme.css', [[
  '.overlay {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.8);',
  '.overlay {\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  background-color: #000000;'
]], 'theme.css');

// 2) 大富翁：设置行改成与座位行同构（－ ＋），并修 boardwrap 高度
edit('src/pages/monopoly/monopoly.ux', [
  ['  .boardwrap {\n    position: relative;\n    width: 100%;\n    height: 100%;\n  }',
   '  .boardwrap {\n    position: relative;\n    width: 100%;\n    flex-grow: 1;\n  }\n\n  .setrow {\n    width: 100%;\n    height: 58px;\n    flex-direction: row;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 8px;\n  }\n\n  .setlabel {\n    flex-grow: 1;\n    font-size: 20px;\n    font-weight: bold;\n    color: #ffffff;\n    text-align: center;\n  }', 'boardwrap+setrow 样式'],
  ['      <div class="countbox" style="width: {{ listW }}px;">\n        <div class="cbtn" onclick="moneyPrev">\n          <text class="ctext"></text>\n        </div>\n        <text class="cnum">资金 ¥{{ money }}</text>\n        <div class="cbtn" onclick="moneyNext">\n          <text class="ctext">▶</text>\n        </div>\n      </div>',
   '      <div class="setrow" style="width: {{ listW }}px;">\n        <div class="{{ c0 }}" onclick="moneyPrev">\n          <text class="ctext">－</text>\n        </div>\n        <text class="setlabel">资金 ¥{{ money }}</text>\n        <div class="{{ c1 }}" onclick="moneyNext">\n          <text class="ctext">＋</text>\n        </div>\n      </div>', '资金行'],
  ['      <div class="countbox" style="width: {{ listW }}px;">\n        <div class="cbtn" onclick="humanPrev">\n          <text class="ctext">◀</text>\n        </div>\n        <text class="cnum">真人 {{ humans }} 人</text>\n        <div class="cbtn" onclick="humanNext">\n          <text class="ctext">▶</text>\n        </div>\n      </div>',
   '      <div class="setrow" style="width: {{ listW }}px;">\n        <div class="{{ c0 }}" onclick="humanPrev">\n          <text class="ctext">－</text>\n        </div>\n        <text class="setlabel">真人 {{ humans }} 人</text>\n        <div class="{{ c1 }}" onclick="humanNext">\n          <text class="ctext">＋</text>\n        </div>\n      </div>', '真人行'],
  ['      <div class="countbox" style="width: {{ listW }}px;">\n        <div class="cbtn" onclick="aiPrev">\n          <text class="ctext">◀</text>\n        </div>\n        <text class="cnum">电脑 {{ ai }} 人</text>\n        <div class="cbtn" onclick="aiNext">\n          <text class="ctext">▶</text>\n        </div>\n      </div>',
   '      <div class="setrow" style="width: {{ listW }}px;">\n        <div class="{{ c0 }}" onclick="aiPrev">\n          <text class="ctext">－</text>\n        </div>\n        <text class="setlabel">电脑 {{ ai }} 人</text>\n        <div class="{{ c1 }}" onclick="aiNext">\n          <text class="ctext">＋</text>\n        </div>\n      </div>', '电脑行'],
  ['          <text class="ctext">◀</text>', '          <text class="ctext">－</text>', '座位行 ◀→－']
], 'monopoly.ux');
// 座位行的 ▶ 也换掉（逐个替换）
{
  const F = 'src/pages/monopoly/monopoly.ux';
  let t = fs.readFileSync(F, 'utf8');
  const n = t.split('<text class="ctext">▶</text>').length - 1;
  t = t.split('<text class="ctext">▶</text>').join('<text class="ctext">＋</text>');
  fs.writeFileSync(F, t);
  console.log('✓ monopoly 座位行 ▶→＋ ×' + n);
}

// 3) 三国杀：修交接遮罩死循环
edit('src/pages/sgs/sgs.ux', [[
  `    revealHand() {
      this.cover = false;
      this.sel = [];
      this.page = 0;
      this.renderHand();
      const g = this.game;
      if (g && g.pending) this.showResp();
      else this.afterTurn();
    },`,
  `    revealHand() {
      // 只是「当前这位玩家接过表」：只负责取消遮罩并刷新，**不能**再调 afterTurn（会把遮罩又打开）
      const g = this.game;
      if (!g) return;
      this.cover = false;
      this.sel = [];
      this.page = 0;
      if (g.pending) {
        this.showResp();
        return;
      }
      this.renderAll();
    },`
]], 'sgs 交接修复');

console.log(fail === 0 ? '修复完成' : '失败 ' + fail + ' 处');
