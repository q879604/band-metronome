// 一次性对 gomoku/uno/whois 三个页面打 UI/交互补丁（每处必须恰好命中 1 次）
import fs from 'fs';

const R = '/workspace/repo/src/pages/';
const patches = [
  // ---------- gomoku.ux ----------
  { f: R + 'gomoku/gomoku.ux', n: '头部常量', re: /HEADER_H = 38;/, to: 'HEADER_H = 46;' },
  { f: R + 'gomoku/gomoku.ux', n: '状态条高', re: /STATUS_H = 24;/, to: 'STATUS_H = 26;' },
  { f: R + 'gomoku/gomoku.ux', n: '瞄准条高', re: /AIM_H = 22;/, to: 'AIM_H = 24;' },
  { f: R + 'gomoku/gomoku.ux', n: '按钮行高', re: /PAD_H = 34;/, to: 'PAD_H = 36;' },
  { f: R + 'gomoku/gomoku.ux', n: 'dbtn 尺寸', re: /width: 52px;\n    height: 30px;\n    border-radius: 15px;/, to: 'width: 60px;\n    height: 34px;\n    border-radius: 17px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'dbtn-main 宽', re: /width: 64px;/, to: 'width: 68px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'sbtn 尺寸', re: /width: 70px;\n    height: 30px;/, to: 'width: 76px;\n    height: 34px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'dtext 字号', re: /font-size: 15px;/, to: 'font-size: 16px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'stext 字号', re: /font-size: 14px;/, to: 'font-size: 15px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'status 字号', re: /font-size: 16px;/, to: 'font-size: 17px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'aim 字号', re: /font-size: 13px;/, to: 'font-size: 14px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'pad 高', re: /\.pad \{\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 30px;/, to: '.pad {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 34px;' },
  { f: R + 'gomoku/gomoku.ux', n: 'pad2 高', re: /\.pad2 \{\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 30px;/, to: '.pad2 {\n    position: absolute;\n    left: 0;\n    width: 100%;\n    height: 34px;' },
  { f: R + 'gomoku/gomoku.ux', n: '拖动渲染节流', re: /this\.px -= dx;\n      this\.py -= dy;\n      this\.clampPan\(\);\n      this\.render\(\);\n    \},/, to: 'this.px -= dx;\n      this.py -= dy;\n      this.clampPan();\n      this.renderThrottled();\n    },' },
  { f: R + 'gomoku/gomoku.ux', n: 'touchend 收尾渲染', re: /if \(this\.drag\) \{\n        this\.drag = false;\n        return;\n      \}/, to: 'if (this.drag) {\n        this.drag = false;\n        this.render();\n        return;\n      }' },
  { f: R + 'gomoku/gomoku.ux', n: 'onHide 清理定时器', re: /onHide\(\) \{\n\s*this\.clearAi\(\);\n\s*\},/, to: 'onHide() {\n      this.clearAi();\n      this.clearRenderTimer();\n    },' },
  { f: R + 'gomoku/gomoku.ux', n: 'onDestroy 清理定时器', re: /onDestroy\(\) \{\n\s*this\.clearAi\(\);\n\s*\},/, to: 'onDestroy() {\n      this.clearAi();\n      this.clearRenderTimer();\n    },' },
  { f: R + 'gomoku/gomoku.ux', n: '插入 onBackPress/节流方法', re: /    \/\* ---------------- 手势：拖动平移 \+ 点按瞄准 ---------------- \*\//, to: `    onBackPress() {
      // 对局中拦截系统返回（右滑返回手势同样走返回管线），防误退
      return this.phase === 'play';
    },

    renderThrottled() {
      const now = Date.now();
      if (!this.__lastRender || now - this.__lastRender >= 30) {
        this.__lastRender = now;
        this.render();
        return;
      }
      if (this.__renderTimer) return;
      const wait = 30 - (now - this.__lastRender);
      this.__renderTimer = setTimeout(() => {
        this.__renderTimer = null;
        this.__lastRender = Date.now();
        this.render();
      }, wait);
    },

    clearRenderTimer() {
      if (this.__renderTimer) {
        clearTimeout(this.__renderTimer);
        this.__renderTimer = null;
      }
    },

    /* ---------------- 手势：拖动平移 + 点按瞄准 ---------------- */` },
  { f: R + 'gomoku/gomoku.ux', n: 'aimText 去重更新', re: /this\.aimText =\n        '瞄准 ' \+ \(this\.aim\.r \+ 1\) \+ '行' \+ \(this\.aim\.c \+ 1\) \+ '列' \+ \(occ \? ' · 已有子' : ' · 再点一次落子'\);/, to: `const t =
        '瞄准 ' + (this.aim.r + 1) + '行' + (this.aim.c + 1) + '列' + (occ ? ' · 已有子' : ' · 再点一次落子');
      if (this.aimText !== t) this.aimText = t;` },

  // ---------- uno.ux ----------
  { f: R + 'uno/uno.ux', n: 'uno 头部常量', re: /HEADER_H = 38;/, to: 'HEADER_H = 46;' },
  { f: R + 'uno/uno.ux', n: 'uno 状态高', re: /STATUS_H = 24;/, to: 'STATUS_H = 26;' },
  { f: R + 'uno/uno.ux', n: 'uno 桌面高', re: /TABLE_H = 76;/, to: 'TABLE_H = 82;' },
  { f: R + 'uno/uno.ux', n: 'uno 提示高', re: /TIP_H = 22;/, to: 'TIP_H = 24;' },
  { f: R + 'uno/uno.ux', n: 'uno onBackPress', re: /onDestroy\(\) \{\n\s*this\.clearAi\(\);\n\s*\},/, to: `onDestroy() {
      this.clearAi();
    },

    onBackPress() {
      // 对局中拦截系统返回（防右滑误退），用左上角按钮退出
      return this.phase === 'play';
    },` },
  { f: R + 'uno/uno.ux', n: 'uno 按钮尺寸', re: /\.btn \{\n    width: 70px;\n    height: 30px;/, to: '.btn {\n    width: 76px;\n    height: 34px;' },
  { f: R + 'uno/uno.ux', n: 'uno 按钮字号', re: /\.bt \{\n    font-size: 15px;/, to: '.bt {\n    font-size: 16px;' },

  // ---------- whois.ux ----------
  { f: R + 'whois/whois.ux', n: 'whois onBackPress', re: /minus\(\) \{\n\s*if \(this\.playerCount > 4\) this\.playerCount--;\n\s*\},/, to: `onBackPress() {
      // 发词 / 讨论进行中拦截系统右滑返回，防止误退
      return this.phase !== 'setup';
    },

    minus() {
      if (this.playerCount > 4) this.playerCount--;
    },` }
];

let fail = 0;
for (const p of patches) {
  let s = fs.readFileSync(p.f, 'utf8');
  const m = s.match(p.re);
  if (!m || m.length !== 1) {
    console.log('✗ ' + p.n + '  命中 ' + (m ? m.length : 0) + ' 次');
    fail++;
    continue;
  }
  s = s.replace(p.re, p.to);
  fs.writeFileSync(p.f, s);
  console.log('✓ ' + p.n);
}
console.log(fail === 0 ? '\n全部补丁成功' : '\n失败 ' + fail + ' 项');