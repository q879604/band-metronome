import fs from 'fs';
const F = 'src/pages/monopoly/monopoly.ux';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
function rep(a, b, name) {
  const parts = s.split(a);
  if (parts.length !== 2) { console.log('✗ ' + name + ' 命中 ' + (parts.length - 1)); fail++; return; }
  s = parts[0] + b + parts[1];
  console.log('✓ ' + name);
}

// 1) 导入 casinoPlay
rep("    checkBankrupt,\n    endTurn,", "    checkBankrupt,\n    casinoPlay,\n    endTurn,", '导入 casinoPlay');

// 2) 操作栏加「赌 / 不赌」
rep(`        <div class="btn" onclick="doUpgrade" if="{{ step === 'own' }}">
          <text class="bt">升级</text>
        </div>`,
`        <div class="btn" onclick="doUpgrade" if="{{ step === 'own' }}">
          <text class="bt">升级</text>
        </div>
        <div class="btn btn-main" onclick="doGamble" if="{{ step === 'casino' }}">
          <text class="bt bt-main">下注 300</text>
        </div>
        <div class="btn" onclick="doNoGamble" if="{{ step === 'casino' }}">
          <text class="bt">不赌</text>
        </div>`, '赌场按钮');

// 3) roll() 处理新格子
rep(`      if (ev.type === 'jail') {
        this.step = 'done';
        this.refreshInfo('进了监狱，暂停一轮');
        return;
      }`,
`      if (ev.type === 'casino') {
        this.step = 'casino';
        this.refreshInfo('赌场！下注 ¥' + ev.bet + ' 拼一把？');
        return;
      }
      if (ev.type === 'cash') {
        this.step = 'done';
        this.refreshInfo('捡到钱 +¥' + ev.amount);
        return;
      }
      if (ev.type === 'airport') {
        this.step = 'done';
        this.refreshInfo('机场：花 ¥' + ev.fee + ' 飞到「' + ev.toName + '」' + this.innerText(ev));
        return;
      }
      if (ev.type === 'road') {
        this.step = 'done';
        this.refreshInfo('汽车站：搭车前进 ' + ev.step + ' 格到「' + ev.toName + '」' + this.innerText(ev));
        return;
      }
      if (ev.type === 'jail') {
        this.step = 'done';
        this.refreshInfo('进了监狱，暂停一轮');
        return;
      }`, 'roll 新格子');

// 4) 赌场决策 + 连带结算文案
rep(`    skipBuy() {
      this.step = 'done';
      this.refreshInfo('放弃购买');
    },`,
`    skipBuy() {
      this.step = 'done';
      this.refreshInfo('放弃购买');
    },

    doGamble() {
      const g = this.game;
      const r = casinoPlay(g, true);
      if (!r.ok) {
        this.hint(r.msg);
        return;
      }
      this.step = 'done';
      this.refreshInfo(r.win ? '赌赢了！+' + r.amount : '赌输了 -' + r.amount);
      this.renderBoard();
    },

    doNoGamble() {
      casinoPlay(this.game, false);
      this.step = 'done';
      this.refreshInfo('没敢下注，走人');
    },

    /** 机场/汽车站再次落点的文字 */
    innerText(ev) {
      const in2 = ev.inner;
      if (!in2) return '';
      if (in2.type === 'buy') return ' → 可买「' + in2.name + '」';
      if (in2.type === 'own') return ' → 自己的「' + in2.name + '」';
      if (in2.type === 'rent') return ' → 付租 ¥' + in2.amount;
      if (in2.type === 'tax') return ' → 缴税 ¥' + in2.amount;
      if (in2.type === 'cash') return ' → 又捡到 ¥' + in2.amount;
      if (in2.type === 'casino') return ' → 又到赌场！';
      if (in2.type === 'jail') return ' → 进监狱了';
      if (in2.type === 'chance') return ' → 机会：' + in2.card.text;
      if (in2.type === 'road') return ' → 又在汽车站';
      if (in2.type === 'airport') return ' → 又到机场';
      return '';
    },`, '赌场方法与文案');

// 5) AI 也要处理新格子
rep(`        } else if (ev.type === 'jail') {
          this.refreshInfo(nm + ' 进了监狱');`,
`        } else if (ev.type === 'casino') {
          const gp = g.players[pid];
          let txt = nm + ' 没下注';
          if (gp.money >= ev.bet * 3) {
            const r = casinoPlay(g, true);
            txt = nm + (r.win ? ' 赌赢 +' + r.amount : ' 赌输 -' + r.amount);
          }
          this.refreshInfo(txt);
        } else if (ev.type === 'cash') {
          this.refreshInfo(nm + ' 捡到钱 +' + ev.amount);
        } else if (ev.type === 'airport') {
          this.refreshInfo(nm + ' 从机场飞到「' + ev.toName + '」' + this.innerText(ev));
        } else if (ev.type === 'road') {
          this.refreshInfo(nm + ' 搭车前进到「' + ev.toName + '」' + this.innerText(ev));
        } else if (ev.type === 'jail') {
          this.refreshInfo(nm + ' 进了监狱');`, 'AI 处理新格子');

fs.writeFileSync(F, s);
console.log(fail === 0 ? '大富翁页面彩蛋接线完成' : '失败 ' + fail + ' 处');
