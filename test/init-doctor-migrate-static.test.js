const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
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
  assert.equal(first.created.length, 5);
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'README.md')));
  assert.match(fs.readFileSync(path.join(root, '.ganttmd', 'README.md'), 'utf8'), /操作边界/);
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'tasks', 'main.md')));
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'followups.md')));
  assert.ok(fs.existsSync(path.join(root, '.ganttmd', 'runs.md')));

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

test('migrate --apply 只改 config，不改任务/followup/run 内容', () => {
  const root = makeTempProject();
  fs.mkdirSync(path.join(root, '.ganttmd'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), 'project:\n  id: demo\n  name: Demo\n');

  const taskPath = path.join(root, '.ganttmd', 'tasks', 'main.md');
  fs.mkdirSync(path.dirname(taskPath), { recursive: true });
  fs.writeFileSync(
    taskPath,
    '# 主任务\n\n```ganttmd-task\nid: T-1\nstatus: done\nmilestone: M1\ntrack: docs\n```\n'
  );

  const followupsPath = path.join(root, '.ganttmd', 'followups.md');
  fs.writeFileSync(
    followupsPath,
    '# Follow-up\n\n```ganttmd-followup\nid: FU-1\nstatus: open\n```\n'
  );

  const runsPath = path.join(root, '.ganttmd', 'runs.md');
  fs.writeFileSync(
    runsPath,
    '# Runs\n\n```ganttmd-run\nid: R-1\nstatus: open\ncurrent_task: T-1\n```\n'
  );

  const before = {
    task: fs.readFileSync(taskPath, 'utf8'),
    followups: fs.readFileSync(followupsPath, 'utf8'),
    runs: fs.readFileSync(runsPath, 'utf8'),
  };

  const beforeHash = {
    task: crypto.createHash('sha256').update(before.task).digest('hex'),
    followups: crypto.createHash('sha256').update(before.followups).digest('hex'),
    runs: crypto.createHash('sha256').update(before.runs).digest('hex'),
  };

  const applied = applyMigration(root);
  assert.equal(applied.applied, true);

  const after = {
    task: fs.readFileSync(taskPath, 'utf8'),
    followups: fs.readFileSync(followupsPath, 'utf8'),
    runs: fs.readFileSync(runsPath, 'utf8'),
  };

  const afterHash = {
    task: crypto.createHash('sha256').update(after.task).digest('hex'),
    followups: crypto.createHash('sha256').update(after.followups).digest('hex'),
    runs: crypto.createHash('sha256').update(after.runs).digest('hex'),
  };

  assert.equal(beforeHash.task, afterHash.task);
  assert.equal(beforeHash.followups, afterHash.followups);
  assert.equal(beforeHash.runs, afterHash.runs);
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

test('exportStatic 输出目录必须在项目内', () => {
  const root = makeTempProject();
  initProject(root);
  assert.throws(() => exportStatic(root, '../outside-board'), /输出目录必须位于项目内/);
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
