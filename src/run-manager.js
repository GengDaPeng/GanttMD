const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { loadProject } = require('./project-loader.js');
const { RUN_STATUSES } = require('./rules.js');
const { appendRuntimeEvent, runtimeRunsForRoot, runtimeStorePath } = require('./runtime-store.js');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeIdPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'RUN';
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferBranch(projectRoot, options = {}) {
  if (options.branch) return options.branch;
  const exec = options.execFileSync || execFileSync;
  try {
    const branch = exec('git', ['branch', '--show-current'], { cwd: projectRoot, encoding: 'utf8' }).trim();
    if (branch) return branch;
  } catch {
    // Detached or non-Git projects must pass --branch explicitly.
  }
  return '';
}

function findClaimRun(runs, options) {
  if (options.id) return runs.find((run) => run.id === options.id);
  if (options.branch) return runs.find((run) => run.branch === options.branch && run.status === 'active');
  return runs.find((run) => run.status === 'active' && run.tasks.includes(options.taskId));
}

function findReleaseRun(runs, options) {
  const releasable = (run) => run.status === 'active' || run.status === 'review';
  if (options.id) return runs.find((run) => run.id === options.id && releasable(run));
  if (options.branch) return runs.find((run) => run.branch === options.branch && releasable(run));
  if (options.taskId) return runs.find((run) => releasable(run) && run.tasks.includes(options.taskId));
  return null;
}

function assertTaskExists(project, taskId) {
  if (project.taskFileCount === 0) return null;
  const task = project.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error('任务不存在，拒绝写入运行态：' + taskId);
  return task;
}

function claimRun(projectRoot = process.cwd(), options = {}) {
  if (!options.taskId) throw new Error('缺少 taskId');
  const root = path.resolve(projectRoot);
  const branch = inferBranch(root, options);
  if (!branch) throw new Error('缺少 branch；非 Git 分支或 detached worktree 请显式传 --branch');

  const project = loadProject(root);
  const task = assertTaskExists(project, options.taskId);
  const runs = runtimeRunsForRoot(root, { storePath: options.runtimeStorePath });
  const existing = findClaimRun(runs, { ...options, branch });
  const now = options.now || today();
  const tasks = unique([...(existing?.tasks || []), options.taskId, options.currentTask]);
  const run = {
    ...(existing || {}),
    id: options.id || existing?.id || `RUN-${sanitizeIdPart(options.taskId)}`,
    title: options.title || existing?.title || task?.title || `${options.taskId} 运行态`,
    status: 'active',
    branch,
    owner: options.owner || options.agent || existing?.owner || process.env.USER || '',
    agent: options.agent || existing?.agent || '',
    tasks,
    current_task: options.currentTask || options.taskId,
    started_at: existing?.started_at || now,
    updated_at: now,
    intent: options.intent || existing?.intent || '',
    note: options.note || existing?.note || '',
    source: 'runtime',
  };

  const write = appendRuntimeEvent({
    type: 'run_claimed',
    project_root: root,
    run_id: run.id,
    title: run.title,
    branch: run.branch,
    owner: run.owner,
    agent: run.agent,
    tasks: run.tasks,
    current_task: run.current_task,
    started_at: run.started_at,
    updated_at: run.updated_at,
    event_date: now,
    intent: run.intent,
    note: run.note,
  }, { storePath: options.runtimeStorePath });

  return { run, created: !existing, storePath: write.storePath };
}

function releaseRun(projectRoot = process.cwd(), options = {}) {
  const root = path.resolve(projectRoot);
  const status = options.status || 'review';
  if (!RUN_STATUSES.includes(status)) throw new Error('run status 非法：' + status);
  if (status === 'active') throw new Error('release 不能把 run 设为 active');

  const runs = runtimeRunsForRoot(root, { storePath: options.runtimeStorePath });
  const existing = findReleaseRun(runs, options);
  if (!existing) throw new Error('未找到可收口的 active/review run');

  const now = options.now || today();
  const run = {
    ...existing,
    status,
    updated_at: now,
    ended_at: options.endedAt || now,
    pr: options.pr || existing.pr || '',
    merge_commit: options.mergeCommit || existing.merge_commit || '',
    note: options.note || existing.note || '',
  };

  const write = appendRuntimeEvent({
    type: 'run_released',
    project_root: root,
    run_id: run.id,
    branch: run.branch,
    tasks: run.tasks,
    current_task: run.current_task,
    status: run.status,
    updated_at: run.updated_at,
    ended_at: run.ended_at,
    pr: run.pr,
    merge_commit: run.merge_commit,
    event_date: now,
    note: run.note,
  }, { storePath: options.runtimeStorePath });

  return { run, created: false, storePath: write.storePath };
}

module.exports = {
  claimRun,
  findClaimRun,
  findReleaseRun,
  inferBranch,
  releaseRun,
  runtimeStorePath,
};
