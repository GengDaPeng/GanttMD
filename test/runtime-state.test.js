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
  assert.equal(state.checklists[0].items.length, 2);
  assert.equal(state.checklists[0].items[0].id, 'C1');
  assert.equal(state.checklists[0].items[0].evidence[0], 'commit:abc123');
  assert.equal(state.worktreeProjects[0].tasks[0].id, 'T-1');
  assert.equal(state.worktreeProjects[0].checklistSummary[0].items.length, 2);
  assert.equal(state.conflicts.length, 1);
  assert.equal(state.conflicts[0].taskId, 'T-1');
});

function writeBaseProject(root) {
  fs.mkdirSync(path.join(root, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:
  id: demo
  name: Demo
`);
  fs.writeFileSync(path.join(root, '.ganttmd', 'tasks', 'main.md'), `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 默认分支任务
status: todo
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
evidence: []
\`\`\`
`);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'spec.md'), '# spec');
}

function writeWorktreeConfig(root) {
  fs.mkdirSync(path.join(root, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:
  id: demo
  name: Demo
`);
}

test('worktree 只登记默认分支任务的 run 和 checklist 时不产生权限告警', () => {
  const mainRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-main-'));
  const wtRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-wt-'));
  writeBaseProject(mainRoot);
  writeWorktreeConfig(wtRoot);
  fs.writeFileSync(path.join(wtRoot, '.ganttmd', 'runs.md'), `# Runs

\`\`\`ganttmd-run
id: RUN-1
status: active
tasks: [T-1]
current_task: T-1
agent: codex
\`\`\`
`);
  fs.writeFileSync(path.join(wtRoot, '.ganttmd', 'tasks', 'checklist.md'), `# Checklist

\`\`\`ganttmd-checklist
task_id: T-1
items:
  - C1 [in_progress] 分支执行中
\`\`\`
`);

  const state = buildRuntimeState(mainRoot, {
    worktrees: [{
      root: wtRoot,
      branch: 'codex/demo',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });

  assert.equal(state.worktreeProjects[0].checklistSummary[0].taskId, 'T-1');
  assert.equal(state.health.some((issue) => issue.message.includes('worktree 不得')), false);
});

test('worktree 复制主分支任务文件时只把 run 或 checklist 引用的任务标为分支承接', () => {
  const mainRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-main-'));
  const wtRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-wt-'));
  writeBaseProject(mainRoot);
  fs.writeFileSync(path.join(mainRoot, '.ganttmd', 'tasks', 'extra.md'), `# Extra

\`\`\`ganttmd-task
id: T-2
title: 未领取任务
status: todo
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 等待领取
acceptance: [完成]
evidence: []
\`\`\`
`);
  fs.cpSync(path.join(mainRoot, '.ganttmd'), path.join(wtRoot, '.ganttmd'), { recursive: true });
  fs.mkdirSync(path.join(wtRoot, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(wtRoot, 'docs', 'spec.md'), '# spec');
  fs.writeFileSync(path.join(wtRoot, '.ganttmd', 'runs.md'), `# Runs

\`\`\`ganttmd-run
id: RUN-1
title: 只领取一个任务
status: active
branch: codex/demo
owner: codex
tasks: [T-1]
current_task: T-1
\`\`\`
`);

  const state = buildRuntimeState(mainRoot, {
    worktrees: [{
      root: wtRoot,
      branch: 'codex/demo',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });

  assert.deepEqual(state.worktreeProjects[0].tasks.map((task) => task.id), ['T-1']);
});

test('worktree 创建顶层任务或关闭 follow-up 时产生权限告警', () => {
  const mainRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-main-'));
  const wtRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-wt-'));
  writeBaseProject(mainRoot);
  writeWorktreeConfig(wtRoot);
  fs.writeFileSync(path.join(wtRoot, '.ganttmd', 'tasks', 'branch.md'), `# Branch Tasks

\`\`\`ganttmd-task
id: WT-1
title: 分支私自新增任务
status: todo
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
evidence: []
\`\`\`
`);
  fs.writeFileSync(path.join(wtRoot, '.ganttmd', 'followups.md'), `# Follow-up

\`\`\`ganttmd-followup
id: FUP-1
title: 分支关闭事项
status: accepted
kind: followup
source_type: task
source_task: T-1
next_action: 维护者复核
\`\`\`
`);

  const state = buildRuntimeState(mainRoot, {
    worktrees: [{
      root: wtRoot,
      branch: 'codex/demo',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });
  const messages = state.health.map((issue) => issue.message);

  assert.ok(messages.some((message) => message.includes('worktree 不得写 ganttmd-task')));
  assert.ok(messages.some((message) => message.includes('worktree follow-up 只能保持 open')));
});

test('runtime-state 不把主项目 worktree 重复计入健康检查', () => {
  const mainRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-main-'));
  writeBaseProject(mainRoot);
  fs.writeFileSync(path.join(mainRoot, '.ganttmd', 'tasks', 'main.md'), `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 默认分支任务
status: done
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
evidence: []
\`\`\`
`);

  const state = buildRuntimeState(mainRoot, {
    worktrees: [{
      root: mainRoot,
      branch: 'main',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });
  const doneEvidenceIssues = state.health.filter((issue) =>
    issue.id === 'T-1' && issue.message.includes('done 任务缺少 evidence')
  );

  assert.equal(doneEvidenceIssues.length, 1);
});
