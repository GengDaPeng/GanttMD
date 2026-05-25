const fs = require('node:fs');
const path = require('node:path');

const { buildRuntimeState } = require('./runtime-state.js');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStaticHtml(state) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GanttMD Static</title>
<style>
body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f5f6f8;color:#1f2937}
header{background:#fff;border-bottom:1px solid #e5e7eb;padding:18px 24px}
main{padding:20px 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.muted{color:#6b7280}
pre{background:#111827;color:#e5e7eb;padding:12px;border-radius:8px;overflow:auto}
</style>
</head>
<body>
<header>
  <h1>GanttMD Static</h1>
  <div class="muted">${escapeHtml(state.source.root)}</div>
</header>
<main>
  <section class="grid">
    <div class="card"><strong>${state.main.taskCount}</strong><div class="muted">任务</div></div>
    <div class="card"><strong>${state.main.runCount}</strong><div class="muted">执行批次</div></div>
    <div class="card"><strong>${state.main.checklistCount}</strong><div class="muted">Checklist</div></div>
    <div class="card"><strong>${state.health.filter(i => i.level === 'warn').length}</strong><div class="muted">Warning</div></div>
  </section>
  <h2>任务</h2>
  <div class="grid">${state.tasks.map(task => `<div class="card"><strong>${escapeHtml(task.id)}</strong><div>${escapeHtml(task.title || '')}</div><div class="muted">${escapeHtml(task.status || '')}</div></div>`).join('')}</div>
  <h2>原始状态</h2>
  <pre>${escapeHtml(JSON.stringify(state, null, 2))}</pre>
</main>
</body>
</html>
`;
}

function exportStatic(projectRoot = process.cwd(), outDir = '.ganttmd-dist') {
  const state = buildRuntimeState(projectRoot, { worktrees: [] });
  const targetDir = path.resolve(projectRoot, outDir);
  fs.mkdirSync(targetDir, { recursive: true });
  const indexPath = path.join(targetDir, 'index.html');
  fs.writeFileSync(indexPath, renderStaticHtml(state));
  return { outDir: targetDir, indexPath };
}

module.exports = {
  exportStatic,
  renderStaticHtml,
};
