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

/* ================= 五子棋：按钮放大 + 底部锚定 + 拖动更顺 ================= */
edit('src/pages/gomoku/gomoku.ux', [
  ['  const PAD_H = 36;', '  const PAD_H = 42;'],
  ['.dbtn {\n    width: 60px;\n    height: 34px;\n    border-radius: 17px;', '.dbtn {\n    width: 70px;\n    height: 42px;\n    border-radius: 21px;'],
  ['.dbtn-main {\n    width: 68px;', '.dbtn-main {\n    width: 78px;'],
  ['.sbtn {\n    width: 76px;\n    height: 34px;\n    border-radius: 17px;', '.sbtn {\n    width: 88px;\n    height: 42px;\n    border-radius: 21px;'],
  ['.dtext {\n    font-size: 16px;', '.dtext {\n    font-size: 18px;'],
  ['.stext {\n    font-size: 15px;', '.stext {\n    font-size: 17px;'],
  ['.pad {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 34px;', '.pad {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 42px;'],
  ['.pad2 {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 34px;', '.pad2 {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 42px;'],
  ['      let by = HEADER_H + STATUS_H + AIM_H + 2;\n      let opsY = by + bs + 6;\n      let ops2Y = opsY + ROW_H + 4;\n\n      // 竖向剩余空间较多时（胶囊屏）整体居中\n      const extra = Math.floor((h - (ops2Y + ROW_H)) / 2) - 2;\n      if (extra > 0) {\n        by += extra;\n        opsY += extra;\n        ops2Y += extra;\n      }',
   '      // 从底部锚定：保证两行按钮永远在屏内\n      const ops2Y = h - PAD_H - 8;\n      const opsY = ops2Y - PAD_H - 6;\n      const by = Math.max(HEADER_H + STATUS_H + AIM_H + 2, opsY - bs - 10);'],
  ['if (!this.__lastRender || now - this.__lastRender >= 30) {', 'if (!this.__lastRender || now - this.__lastRender >= 40) {'],
  ['      const wait = 30 - (now - this.__lastRender);', '      const wait = 40 - (now - this.__lastRender);'],
  ['      if (Math.abs(p.x - this.downX) + Math.abs(p.y - this.downY) <= 10) return;', '      if (Math.abs(p.x - this.downX) + Math.abs(p.y - this.downY) <= 14) return;'],
  ['      this.px -= dx;\n      this.py -= dy;\n      this.clampPan();', '      if (!dx && !dy) return;\n      this.px -= dx;\n      this.py -= dy;\n      this.clampPan();']
], 'gomoku.ux');

/* ================= 大富翁：按钮放大 + 底部锚定 + 格子留缝 ================= */
edit('src/pages/monopoly/monopoly.ux', [
  ['.btn {\n    width: 76px;\n    height: 34px;\n    border-radius: 17px;', '.btn {\n    width: 92px;\n    height: 46px;\n    border-radius: 23px;'],
  ['.bt {\n    font-size: 16px;', '.bt {\n    font-size: 18px;'],
  ['.ops {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 34px;', '.ops {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 46px;'],
  ['.log {\n    position: absolute;\n    left: 10px;\n    top: 398px;\n    width: 316px;\n    font-size: 13px;', '.log {\n    position: absolute;\n    left: 10px;\n    top: 0;\n    width: 316px;\n    font-size: 14px;'],
  ['      <text class="log">{{ logLine }}</text>', '      <text class="log" style="top: {{ logY }}px;">{{ logLine }}</text>'],
  ['          style="left: {{ $item.x }}px; top: {{ $item.y }}px; width: {{ cs }}px; height: {{ cs }}px;"', '          style="left: {{ $item.x }}px; top: {{ $item.y }}px; width: {{ ccs }}px; height: {{ ccs }}px;"'],
  ['              opsY: 372', '              opsY: 372,\n      logY: 340,\n      ccs: 44'],
  ['      const bs = Math.min(w - 36, 304);\n      const bx = Math.floor((w - bs) / 2);\n      const cs = Math.max(28, Math.floor(bs / 6));\n      let by = HEADER_H + 6;\n      const opsY = by + bs + 14;\n      // 胶囊屏竖向居中\n      const slack = h - (opsY + 40);\n      if (slack > 20) by += Math.floor((slack - 20) / 2);\n\n      this.bs = bs;',
   '      const bs = Math.min(w - 24, 316);\n      const bx = Math.floor((w - bs) / 2);\n      const cs = Math.max(28, Math.floor(bs / 6));\n      const opsY = h - 46 - 10;\n      const by = HEADER_H + 6;\n\n      this.logY = opsY - 26;\n      this.ccs = Math.max(20, cs - 8);\n      this.bs = bs;'],
  ['      const half = Math.floor(cs / 2);', '      const half = Math.floor(this.ccs / 2);']
], 'monopoly.ux');

/* ================= 谁是卧底：人数选择器放大 ================= */
edit('src/pages/whois/whois.ux', [
  ['.countbox {\n    height: 58px;', '.countbox {\n    height: 68px;'],
  ['.cbtn {\n    width: 52px;\n    height: 40px;\n    border-radius: 12px;', '.cbtn {\n    width: 64px;\n    height: 52px;\n    border-radius: 14px;'],
  ['.ctext {\n    font-size: 22px;', '.ctext {\n    font-size: 28px;'],
  ['.cnum {\n    font-size: 28px;', '.cnum {\n    font-size: 32px;'],
  ['.step {\n    font-size: 17px;', '.step {\n    font-size: 19px;'],
  ['.bigword {\n    font-size: 38px;', '.bigword {\n    font-size: 46px;']
], 'whois.ux');

console.log(fail === 0 ? '全部命中' : '失败 ' + fail + ' 处');