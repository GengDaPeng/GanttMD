const fs = require('node:fs');
const path = require('node:path');

const { buildRuntimeState } = require('./runtime-state.js');

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function renderStaticHtml(state) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const injection = `<script>window.GANTTMD_STATIC_STATE=${escapeScriptJson(state)};</script>\n`;
  return html.replace('<script>', `${injection}<script>`);
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
