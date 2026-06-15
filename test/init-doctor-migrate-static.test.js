const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { doctorProject } = require('../src/doctor.js');
const { applyMigration, planMigration } = require('../src/migrator.js');
const { initProject } = require('../src/project-init.js');
const { exportStatic } = require('../src/static-export.js');

const cliPath = path.join(__dirname, '..', 'bin', 'ganttmd.js');

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-project-'));
}

function writeTask(projectRoot, content) {
  const filePath = path.join(projectRoot, '.ganttmd', 'tasks', 'main.md');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

test('initProject 创建最小 .ganttmd，但不覆盖已有文件', () => {
  const root = makeTempProject();
  const first = initProject(root);
  assert.equal(first.created.length, 4);
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'README.md')));
  assert.match(fs.readFileSync(path.join(root, '.ganttmd', 'README.md'), 'utf8'), /操作边界/);
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'tasks', 'main.md')));
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'followups.md')));
  assert.equal(fs.existsSync(path.join(root, '.ganttmd', 'runs.md')), false);

  const taskPath = path.join(root, '.ganttmd', 'tasks', 'main.md');
  fs.writeFileSync(taskPath, '# 用户自己的任务\n');
  const second = initProject(root);
  assert.equal(second.created.length, 0);
  assert.equal(fs.readFileSync(taskPath, 'utf8'), '# 用户自己的任务\n');
});

test('doctorProject 报告 schema 缺失，并接受当前 schema', () => {
  const root = makeTempProject();
  fs.mkdirSync(path.join(root, '.ganttmd'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:\n  id: demo\n  name: Demo\n`);

  const missing = doctorProject(root);
  assert.equal(missing.projectSchemaVersion, 0);
  assert.ok(missing.doctorIssues.some((issue) => issue.message.includes('schema_version')));

  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `ganttmd:\n  schema_version: 1\nproject:\n  id: demo\n  name: Demo\n`);
  const current = doctorProject(root);
  assert.equal(current.projectSchemaVersion, 1);
  assert.equal(current.doctorIssues.length, 0);
});

test('migrate dry-run 只生成计划，apply 写入 schema 并保留备份', () => {
  const root = makeTempProject();
  fs.mkdirSync(path.join(root, '.ganttmd'), { recursive: true });
  const configPath = path.join(root, '.ganttmd', 'config.yaml');
  const original = `project:\n  id: demo\n  name: Demo\n`;
  fs.writeFileSync(configPath, original);

  const plan = planMigration(root);
  assert.equal(plan.changes.length, 1);
  assert.equal(fs.readFileSync(configPath, 'utf8'), original);

  const applied = applyMigration(root);
  assert.equal(applied.applied, true);
  assert.ok(fs.existsSync(path.join(applied.backupRoot, 'config.yaml')));
  assert.equal(fs.readFileSync(path.join(applied.backupRoot, 'config.yaml'), 'utf8'), original);
  assert.match(fs.readFileSync(configPath, 'utf8'), /ganttmd:\n  schema_version: 1/);
});

test('exportStatic 生成可直接打开的静态看板', () => {
  const root = makeTempProject();
  initProject(root);
  writeTask(root, `# 主任务

\`\`\`ganttmd-task
id: T-001
title: 样例任务
status: done
milestone: M1
track: demo
verification: npm test
closed_at: 2026-05-24
\`\`\`
`);

  const result = exportStatic(root, 'dist-board');
  const html = fs.readFileSync(result.indexPath, 'utf8');
  assert.match(html, /GanttMD Local/);
  assert.match(html, /GANTTMD_STATIC_STATE/);
  assert.match(html, /T-001/);
  assert.match(html, /样例任务/);
});

test('CLI 暴露 init、doctor、migrate、static 命令', () => {
  const root = makeTempProject();

  const initResult = spawnSync(process.execPath, [cliPath, 'init', root], { encoding: 'utf8' });
  assert.equal(initResult.status, 0, initResult.stderr || initResult.stdout);
  assert.match(initResult.stdout, /GanttMD 初始化/);

  const doctorResult = spawnSync(process.execPath, [cliPath, 'doctor', root, '--json'], { encoding: 'utf8' });
  assert.equal(doctorResult.status, 0, doctorResult.stderr || doctorResult.stdout);
  assert.equal(JSON.parse(doctorResult.stdout).projectSchemaVersion, 1);

  const migrateResult = spawnSync(process.execPath, [cliPath, 'migrate', root, '--json'], { encoding: 'utf8' });
  assert.equal(migrateResult.status, 0, migrateResult.stderr || migrateResult.stdout);
  assert.equal(JSON.parse(migrateResult.stdout).changes.length, 0);

  const staticResult = spawnSync(process.execPath, [cliPath, 'static', root, '--out', 'board'], { encoding: 'utf8' });
  assert.equal(staticResult.status, 0, staticResult.stderr || staticResult.stdout);
  assert.ok(fs.existsSync(path.join(root, 'board', 'index.html')));
});
