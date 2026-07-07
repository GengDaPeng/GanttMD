const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { planArchive, applyArchive } = require('../src/archiver.js');

function createProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-arch-'));
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

const NOW = new Date('2026-07-07T00:00:00Z');

function doneTask(id, completed) {
  return `\`\`\`ganttmd-task
id: ${id}
title: ${id}
status: done
track: backend
completed_date: ${completed}
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`;
}

test('未配置 auto_archive_after_days 时不归档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'project:\n  name: X\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01'),
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.configured, false);
  assert.equal(plan.changes.length, 0);
});

test('超阈值 done 任务进入归档计划，apply 后写入 archived_at 并备份', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01') + '\n' + doneTask('B', '2026-07-06'),
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.configured, true);
  // A 超阈值应归档；B 关闭 1 天 < 3 天不归档
  assert.deepEqual(plan.changes.map((c) => c.taskIds).flat(), ['A']);

  const before = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  const result = applyArchive(root, { now: NOW });
  assert.equal(result.applied, true);
  const after = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  assert.ok(after.indexOf('archived_at: 2026-07-07') !== -1);
  assert.ok(after.indexOf('archived_reason: 自动归档：关闭超 3 天') !== -1);
  assert.ok(after.indexOf('id: B') !== -1 && after.split('archived_at:').length === 2); // 只归档 A
  // 备份保留原文
  assert.ok(fs.existsSync(result.backupRoot));
  const backupFile = path.join(result.backupRoot, 'tasks', 'main.md');
  assert.equal(fs.readFileSync(backupFile, 'utf8'), before);
});

test('planArchive 是 dry-run，不写文件', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01'),
  });
  const before = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  planArchive(root, { now: NOW });
  assert.equal(fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8'), before);
});

test('已有 archived_at 的任务不重复归档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': `\`\`\`ganttmd-task
id: A
title: A
status: done
track: backend
completed_date: 2026-06-01
archived_at: 2026-06-05
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`,
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.changes.length, 0);
});
