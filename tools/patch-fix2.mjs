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

// 1) 大富翁：资金行改成 setrow（与真人/电脑行同构）
edit('src/pages/monopoly/monopoly.ux', [
  ['      <div class="countbox" style="width: {{ listW }}px;">\n        <div class="cbtn" onclick="moneyPrev">',
   '      <div class="setrow" style="width: {{ listW }}px;">\n        <div class="{{ c0 }}" onclick="moneyPrev">', '资金行-开'],
  ['        <text class="cnum">资金 ¥{{ money }}</text>\n        <div class="cbtn" onclick="moneyNext">',
   '        <text class="setlabel">资金 ¥{{ money }}</text>\n        <div class="{{ c1 }}" onclick="moneyNext">', '资金行-文'],
  ['      <div class="tile {{ $item.cls }}" for="{{ cells }}" tid="i">\n              <text class="tname">{{ $item.name }}</text>\n              <text class="tsub">{{ $item.sub }}</text>\n              <text class="tdot {{ $item.dotCls }}">{{ $item.dotText }}</text>',
   '      <div class="tile {{ $item.cls }}" for="{{ cells }}" tid="i">\n              <text class="tname">{{ $item.name }}</text>\n              <text class="tsub">{{ $item.sub }}</text>\n              <text class="tdot {{ $item.dotCls }}">{{ $item.dotText }}</text>', 'skip-tile']
], 'monopoly 资金行');

// 2) 分页按钮：◀ ▶ 改成「上页 / 下页」
for (const f of ['src/pages/uno/uno.ux', 'src/pages/doudizhu/doudizhu.ux', 'src/pages/sgs/sgs.ux']) {
  let t = fs.readFileSync(f, 'utf8');
  const before = t;
  t = t.split('<text class="bt">◀</text>').join('<text class="bt">上页</text>');
  t = t.split('<text class="bt">▶</text>').join('<text class="bt">下页</text>');
  if (t !== before) { fs.writeFileSync(f, t); console.log('✓ ' + f + ' 分页按钮改文字'); }
  else console.log('- ' + f + ' 无分页字形');
}

// 3) 全局字形净化：把可疑符号换成安全文字
const SUS = [
  ['◀', '－'], ['▶', '＋'], ['♥', ''], ['💀', '亡'], ['♠', ''], ['♣', ''], ['♦', ''], ['★', ''], ['☆', ''],
  ['→', '到'], ['←', ''], ['↑', ''], ['↓', '']
];
function clean(file) {
  let t = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [a, b] of SUS) {
    if (t.indexOf(a) >= 0) { n += t.split(a).length - 1; t = t.split(a).join(b); }
  }
  if (n) { fs.writeFileSync(file, t); console.log('✓ ' + file + ' 净化 ' + n + ' 处可疑字形'); }
  return n;
}
const files = ['src/app.ux', 'src/pages/home/home.ux', 'src/pages/gomoku/gomoku.ux', 'src/pages/uno/uno.ux',
  'src/pages/monopoly/monopoly.ux', 'src/pages/werewolf/werewolf.ux', 'src/pages/whois/whois.ux',
  'src/pages/poker/poker.ux', 'src/pages/doudizhu/doudizhu.ux', 'src/pages/liar/liar.ux',
  'src/pages/sgs/sgs.ux', 'src/pages/rules/rules.ux', 'src/pages/about/about.ux'];
let total = 0;
for (const f of files) total += clean(f);
console.log('共净化 ' + total + ' 处');
console.log(fail <= 1 ? '字形/布局修复完成' : '失败 ' + fail + ' 处');
