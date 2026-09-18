// 把沙盒里的仓库树（/workspace/repo）整棵推到 GitHub，可选打 tag 触发 Release 工作流。
// 用法：GITHUB_TOKEN=xxx node tools/push-api.mjs [tag]
import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'q879604';
const REPO = 'band-metronome';
const ROOT = process.env.PUSH_ROOT || '/workspace/repo';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'rikkahub-agent',
  'Content-Type': 'application/json'
};
const TAG = process.argv[2] || '';
const MESSAGE = process.env.PUSH_MSG || '节拍器：震动节拍 + 最低亮度常亮 + 连点5次恢复亮度';

function walk(dir, base) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist' || e.name === 'build') continue;
    const rel = base ? base + '/' + e.name : e.name;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, rel));
    else out.push({ rel, p });
  }
  return out;
}

async function req(method, url, body, allowFail) {
  const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  let j = {};
  try {
    j = await r.json();
  } catch (e) {
    j = {};
  }
  if (!r.ok && !allowFail) {
    console.error('HTTP ' + r.status + ' ' + method + ' ' + url + ' :: ' + JSON.stringify(j).slice(0, 300));
    process.exit(1);
  }
  return { ok: r.ok, status: r.status, body: j };
}

const repoInfo = await req('GET', `https://api.github.com/repos/${OWNER}/${REPO}`);
const BR = repoInfo.body.default_branch || 'master';
console.log('默认分支 ' + BR);

let refRes = await req('GET', `${API}/git/ref/heads/${BR}`, null, true);
if (!refRes.ok) {
  console.log('仓库为空 → 先落一次初始 commit');
  await req('PUT', `${API}/contents/README.md`, {
    message: 'init',
    content: Buffer.from('# 腕上节拍器\n\n占位，随后整体覆盖。\n').toString('base64')
  });
  refRes = await req('GET', `${API}/git/ref/heads/${BR}`);
}
const parentSha = refRes.body.object.sha;
console.log('父提交 ' + parentSha.slice(0, 7));

const files = walk(ROOT, '');
console.log('待提交文件 ' + files.length + ' 个');
const tree = [];
for (const f of files) {
  const j = await req('POST', `${API}/git/blobs`, {
    content: fs.readFileSync(f.p).toString('base64'),
    encoding: 'base64'
  });
  tree.push({ path: f.rel, mode: '100644', type: 'blob', sha: j.body.sha });
  console.log('  ' + f.rel + '  ' + j.body.sha.slice(0, 7) + '  ' + fs.statSync(f.p).size + 'B');
}

const treeRes = await req('POST', `${API}/git/trees`, { tree });
const commitRes = await req('POST', `${API}/git/commits`, {
  message: MESSAGE,
  tree: treeRes.body.sha,
  parents: [parentSha]
});
await req('PATCH', `${API}/git/refs/heads/${BR}`, { sha: commitRes.body.sha, force: true });
console.log(BR + ' → ' + commitRes.body.sha.slice(0, 7));

if (TAG) {
  const tagRes = await req('POST', `${API}/git/refs`, { ref: `refs/tags/${TAG}`, sha: commitRes.body.sha }, true);
  console.log(tagRes.ok ? 'tag ' + TAG + ' 已创建（触发 Release 工作流）' : 'tag: HTTP ' + tagRes.status);
}