const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadProject } = require('../src/project-loader.js');
const { buildRuntimeState } = require('../src/runtime-state.js');
const { claimRun, releaseRun } = require('../src/run-manager.js');
const { runtimeRunsForRoot } = require('../src/runtime-store.js');

const cliPath = path.join(__dirname, '..', 'bin', 'ganttmd.js');

function createProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-run-manager-'));
  fs.mkdirSync(path.join(root, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:
  id: demo
  name: Demo
`);
  fs.writeFileSync(path.join(root, '.ganttmd', 'tasks', 'main.md'), `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 自动绑定运行态
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
  fs.writeFileSync(path.join(root, '.ganttmd', 'runs.md'), '# Runs\n\n');
  return root;
}

function createStorePath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-runtime-')), 'runtime.jsonl');
}

test('claimRun 写入本地 runtime store，不修改 runs.md，并能被 runtime-state 映射成分支承接任务', () => {
  const mainRoot = createProject();
  const wtRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-run-wt-'));
  fs.cpSync(path.join(mainRoot, '.ganttmd'), path.join(wtRoot, '.ganttmd'), { recursive: true });
  fs.cpSync(path.join(mainRoot, 'docs'), path.join(wtRoot, 'docs'), { recursive: true });
  const storePath = createStorePath();

  const beforeRunsMd = fs.readFileSync(path.join(wtRoot, '.ganttmd', 'runs.md'), 'utf8');
  const result = claimRun(wtRoot, {
    taskId: 'T-1',
    branch: 'feat/demo',
    owner: 'codex',
    now: '2026-06-14',
    runtimeStorePath: storePath,
  });

  assert.equal(result.run.id, 'RUN-T-1');
  assert.equal(result.created, true);
  assert.equal(fs.readFileSync(path.join(wtRoot, '.ganttmd', 'runs.md'), 'utf8'), beforeRunsMd);
  assert.equal(loadProject(wtRoot).runs.length, 0);
  assert.equal(runtimeRunsForRoot(wtRoot, { storePath })[0].status, 'active');

  const state = buildRuntimeState(mainRoot, {
    runtimeStorePath: storePath,
    worktrees: [{
      root: wtRoot,
      branch: 'feat/demo',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });
  assert.deepEqual(state.worktreeProjects[0].tasks.map((task) => task.id), ['T-1']);
  assert.equal(state.worktreeProjects[0].tasks[0].status, 'active');
});

test('claimRun 对同一 run 追加更新事件，runtime store 回放后只保留最新状态', () => {
  const root = createProject();
  const storePath = createStorePath();

  claimRun(root, {
    taskId: 'T-1',
    branch: 'feat/demo',
    owner: 'codex',
    now: '2026-06-14',
    runtimeStorePath: storePath,
  });
  const result = claimRun(root, {
    taskId: 'T-1',
    branch: 'feat/demo',
    owner: 'claude',
    title: '接续运行态',
    now: '2026-06-15',
    runtimeStorePath: storePath,
  });

  assert.equal(result.created, false);
  const runs = runtimeRunsForRoot(root, { storePath });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].owner, 'claude');
  assert.equal(runs[0].title, '接续运行态');
  assert.equal(runs[0].updated_at, '2026-06-15');
});

test('releaseRun 支持 active -> review -> merged，并保留交付证据', () => {
  const root = createProject();
  const storePath = createStorePath();
  claimRun(root, {
    taskId: 'T-1',
    branch: 'feat/demo',
    owner: 'codex',
    now: '2026-06-14',
    runtimeStorePath: storePath,
  });

  releaseRun(root, {
    branch: 'feat/demo',
    status: 'review',
    now: '2026-06-15',
    runtimeStorePath: storePath,
  });
  const result = releaseRun(root, {
    branch: 'feat/demo',
    status: 'merged',
    pr: 'PR#1',
    mergeCommit: 'abc123',
    now: '2026-06-16',
    runtimeStorePath: storePath,
  });

  assert.equal(result.run.status, 'merged');
  const runs = runtimeRunsForRoot(root, { storePath });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, 'merged');
  assert.equal(runs[0].pr, 'PR#1');
  assert.equal(runs[0].merge_commit, 'abc123');
  assert.equal(runs[0].ended_at, '2026-06-16');
});

test('claimRun 默认拒绝引用不存在的任务，避免写入坏运行态', () => {
  const root = createProject();
  const storePath = createStorePath();

  assert.throws(() => claimRun(root, {
    taskId: 'MISSING',
    branch: 'feat/demo',
    owner: 'codex',
    runtimeStorePath: storePath,
  }), /任务不存在/);
});

test('CLI run claim/release 写入 runtime store', () => {
  const root = createProject();
  const storePath = createStorePath();
  const env = { ...process.env, GANTTMD_RUNTIME_STORE: storePath };

  const claim = spawnSync(process.execPath, [
    cliPath,
    'run',
    'claim',
    'T-1',
    root,
    '--branch',
    'feat/demo',
    '--owner',
    'codex',
    '--date',
    '2026-06-14',
  ], { encoding: 'utf8', env });
  assert.equal(claim.status, 0, claim.stderr || claim.stdout);
  assert.match(claim.stdout, /已登记运行态/);

  const release = spawnSync(process.execPath, [
    cliPath,
    'run',
    'release',
    root,
    '--branch',
    'feat/demo',
    '--status',
    'review',
    '--date',
    '2026-06-15',
  ], { encoding: 'utf8', env });
  assert.equal(release.status, 0, release.stderr || release.stdout);
  assert.match(release.stdout, /已更新运行态/);

  const runs = runtimeRunsForRoot(root, { storePath });
  assert.equal(runs[0].status, 'review');
  assert.equal(runs[0].ended_at, '2026-06-15');
  assert.equal(loadProject(root).runs.length, 0);
});
