const TOKEN = process.env.GITHUB_TOKEN;
const API = 'https://api.github.com/repos/q879604/watchboard-vela';
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'agent' };

async function j(url) {
  const r = await fetch(url, { headers: H });
  return r.ok ? r.json() : {};
}

const deadline = Date.now() + 260000;
let runs = [];
while (Date.now() < deadline) {
  const res = await j(`${API}/actions/runs?per_page=6`);
  runs = (res.workflow_runs || []).filter(r => r.name === 'CI' || r.name === 'Release');
  const line = runs.map(r => r.name + '(' + r.head_branch + ')=' + r.status + (r.conclusion ? '/' + r.conclusion : '')).join('  ');
  console.log(new Date().toISOString().slice(11, 19) + '  ' + line);
  const done = runs.length && runs.every(r => r.status === 'completed');
  if (done) break;
  await new Promise(s => setTimeout(s, 15000));
}

console.log('\n=== 结果 ===');
for (const r of runs) {
  console.log(r.name + ' [' + r.head_branch + '] → ' + r.status + ' / ' + r.conclusion + '   run_id=' + r.id);
}

for (const r of runs) {
  if (r.conclusion === 'success') continue;
  const jobs = await j(`${API}/actions/runs/${r.id}/jobs`);
  for (const job of jobs.jobs || []) {
    console.log('\n--- ' + r.name + ' / ' + job.name + ' 各步骤 ---');
    for (const st of job.steps || []) console.log('   ' + st.number + ' ' + st.name + ' => ' + st.conclusion);
    const failed = (job.steps || []).filter(s => s.conclusion === 'failure').map(s => s.name);
    if (!failed.length) continue;
    console.log('   失败步骤: ' + failed.join(','));
    const lr = await fetch(`${API}/actions/jobs/${job.id}/logs`, { headers: H });
    if (!lr.ok) { console.log('   (日志 HTTP ' + lr.status + ')'); continue; }
    const text = await lr.text();
    const lines = text.split('\n');
    const hits = lines.filter(l => /error|Error|ERR!|failed|Failure|✖|Unknown|Unexpected|unsupported|Cannot|not found/i.test(l));
    console.log('   日志命中 ' + hits.length + ' 行，尾部 45 行：');
    console.log(hits.slice(-45).map(s => '   ' + s.trim().slice(0, 220)).join('\n'));
  }
}
