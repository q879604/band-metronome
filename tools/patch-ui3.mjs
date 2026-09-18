import fs from 'fs';

let fail = 0;
function edit(file, pairs, name) {
  let t = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (t.indexOf(a) < 0) {
      console.log('✗ ' + name + ' 未命中: ' + a.slice(0, 60).replace(/\n/g, '\\n'));
      fail++;
    } else {
      t = t.split(a).join(b);
    }
  }
  fs.writeFileSync(file, t);
  console.log('· ' + name);
}

edit('src/pages/gomoku/gomoku.ux', [
  ['.sbtn {\n    width: 76px;\n    height: 34px;\n    border-radius: 15px;', '.sbtn {\n    width: 88px;\n    height: 42px;\n    border-radius: 21px;'],
  ['      // 竖向居中（胶囊屏剩余空间多）\n      const slack = h - (wy + wh + rows + 6);\n      let shift = 0;\n      if (slack > 20) shift = Math.floor((slack - 20) / 2);\n      this.padY = wy + wh + 4 + shift;\n      this.pad2Y = this.padY + PAD_H;',
   '      // 从底部锚定两行按钮，保证永远在屏内\n      this.pad2Y = h - PAD_H - 8;\n      this.padY = this.pad2Y - PAD_H - 6;\n      // 棋盘视口高度 = 顶部到按钮之间\n      this.wh = Math.max(120, this.padY - wy - 10);']
], 'gomoku 布局/按钮');

edit('src/pages/monopoly/monopoly.ux', [
  ["      diceText: '',\n      pendingBuy: null,\n      opsY: 372", "      diceText: '',\n      pendingBuy: null,\n      opsY: 372,\n      logY: 340,\n      ccs: 44"]
], 'monopoly 新字段');

console.log(fail === 0 ? '全部命中' : '失败 ' + fail + ' 处');