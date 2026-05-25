const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildRuntimeState } = require('../src/runtime-state.js');

function writeProject(root, taskStatus) {
  fs.mkdirSync(path.join(root, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:
  id: demo
  name: Demo
`);
  fs.writeFileSync(path.join(root, '.ganttmd', 'tasks', 'main.md'), `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 任务
status: ${taskStatus}
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
evidence: []
${taskStatus === 'in_progress' ? 'owner: codex' : ''}
\`\`\`

\`\`\`ganttmd-checklist
task_id: T-1
items:
  - C1 [done] 已完成 | evidence: commit:abc123
  - C2 [todo] 待处理
\`\`\`
`);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'spec.md'), '# spec');
}

test('runtime-state 聚合主项目、worktree 和任务状态冲突', () => {
  const mainRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-main-'));
  const wtRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-wt-'));
  writeProject(mainRoot, 'todo');
  writeProject(wtRoot, 'in_progress');

  const state = buildRuntimeState(mainRoot, {
    worktrees: [{
      root: wtRoot,
      branch: 'feat/demo',
      head: 'abc123',
      isDirty: true,
      hasGanttmd: true,
    }],
  });

  assert.equal(state.main.taskCount, 1);
  assert.equal(state.worktreeProjects.length, 1);
  assert.equal(state.checklists[0].taskId, 'T-1');
  assert.equal(state.checklists[0].done, 1);
  assert.equal(state.conflicts.length, 1);
  assert.equal(state.conflicts[0].taskId, 'T-1');
});
