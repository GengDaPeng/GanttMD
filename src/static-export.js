const fs = require('node:fs');
const path = require('node:path');

const { buildRuntimeState } = require('./runtime-state.js');

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function resolveOutputDir(projectRoot, outDir) {
  const projectRootDir = fs.realpathSync(path.resolve(projectRoot));
  const resolved = path.resolve(projectRootDir, outDir);
  const relative = path.relative(projectRootDir, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('输出目录必须位于项目内');
  }

  const parts = relative.split(path.sep).filter(Boolean);
  let current = projectRootDir;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      break;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      const real = fs.realpathSync(current);
      if (!path.relative(projectRootDir, real).startsWith('..')) {
        continue;
      }
      throw new Error('输出目录必须位于项目内');
    }
  }

  return resolved;
}

function renderStaticHtml(state) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const rulesJs = fs.readFileSync(path.join(__dirname, 'rules.js'), 'utf8');
  const injection = `<script>window.GANTTMD_STATIC_STATE=${escapeScriptJson(state)};</script>\n`;
  const rulesInjection = `<script>${rulesJs}</script>\n`;
  return html
    .replace('<script src="/rules.js"></script>', rulesInjection)
    .replace('<script>', `${injection}<script>`);
}

function exportStatic(projectRoot = process.cwd(), outDir = '.ganttmd-dist') {
  const state = buildRuntimeState(projectRoot, { worktrees: [] });
  const targetDir = resolveOutputDir(projectRoot, outDir);
  fs.mkdirSync(targetDir, { recursive: true });
  const indexPath = path.join(targetDir, 'index.html');
  fs.writeFileSync(indexPath, renderStaticHtml(state));
  return { outDir: targetDir, indexPath };
}

module.exports = {
  exportStatic,
  renderStaticHtml,
};
