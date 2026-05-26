const assert = require('node:assert/strict');
const test = require('node:test');

const Rules = require('../src/rules.js');

test('共享规则模块导出完整接口', () => {
  const required = [
    'TASK_STATUSES', 'TASK_KINDS', 'FOLLOWUP_STATUSES', 'FOLLOWUP_KINDS',
    'RUN_STATUSES', 'CHECKLIST_STATUSES', 'REVIEW_STATUSES',
    'TASK_TRACKS', 'TRACK_ALIASES', 'ENGINEERING_TRACKS',
    'DEFAULT_REVIEW_STALE_DAYS', 'DEFAULT_ARCHIVE_AFTER_DAYS',
    'parseDate', 'daysBetween', 'normalizeTrack',
    'checkTask', 'checkFollowup', 'checkRun', 'checkChecklist', 'defaultContext',
  ];
  for (const k of required) assert.ok(k in Rules, `missing export: ${k}`);
});

test('quality_gate 作为旧 track 别名兼容为 quality', () => {
  assert.equal(Rules.normalizeTrack('quality_gate'), 'quality');
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
  });
  const task = {
    id: 'LEGACY-TRACK',
    title: '旧质量门任务',
    status: 'todo',
    kind: 'task',
    track: 'quality_gate',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    next_action: '迁移命名',
    acceptance: ['完成'],
    evidence: [],
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some(i => i.level === 'info' && i.text.includes('旧别名')));
  assert.equal(issues.filter(i => i.level === 'warn').length, 0);
});

test('checkTask 对完整合法任务返回 0 issue', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
  });
  const task = {
    id: 'OK-1',
    title: '完整任务',
    status: 'todo',
    kind: 'task',
    track: 'backend',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    next_action: '动手',
    acceptance: ['完成'],
    evidence: [],
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  assert.equal(Rules.checkTask(task, ctx).length, 0);
});

test('checkTask 命中 review 超期，但 owner/agent 可表达负责人和执行者', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
  });
  const task = {
    id: 'BAD',
    title: '问题任务',
    status: 'review',
    kind: 'task',
    track: 'frontend',
    milestone: 'M1',
    owner: 'alice',
    agent: 'bob',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    review_status: 'pending',
    updated_at: '2026-05-01',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.equal(issues.filter(i => i.text.includes('owner 与 agent 不一致')).length, 0);
  assert.ok(issues.some(i => i.text.includes('review 状态超过')));
});

test('checkTask 拦截非法 review_status，PR 返修不使用 must_fix', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
  });
  const task = {
    id: 'REVIEW-BAD',
    title: '非法复核状态',
    status: 'review',
    kind: 'task',
    track: 'docs',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    review_status: 'must_fix',
    updated_at: '2026-05-23',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some(i => i.level === 'warn' && i.field === 'review_status' && i.text.includes('review_status 非法')));
});

test('checkTask 允许项目显式扩展 review_status 枚举', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
    reviewStatuses: ['pending', 'passed', 'deferred', 'must_fix'],
  });
  const task = {
    id: 'REVIEW-CUSTOM',
    title: '自定义复核状态',
    status: 'review',
    kind: 'task',
    track: 'docs',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    review_status: 'must_fix',
    updated_at: '2026-05-23',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.equal(issues.filter(i => i.field === 'review_status').length, 0);
});

test('checkTask 拦截 done 任务携带未通过的 review_status', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
  });
  const task = {
    id: 'DONE-PENDING',
    title: '完成但仍待复核',
    status: 'done',
    kind: 'task',
    track: 'docs',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    review_status: 'pending',
    completed_date: '2026-05-23',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some(i => i.level === 'warn' && i.field === 'review_status' && i.text.includes('done 任务如果填写 review_status')));
});

test('checkTask 拦截 review 任务提前标记 passed', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
  });
  const task = {
    id: 'REVIEW-PASSED',
    title: '复核中但已通过',
    status: 'review',
    kind: 'task',
    track: 'docs',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    review_status: 'passed',
    updated_at: '2026-05-23',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some(i => i.level === 'warn' && i.field === 'review_status' && i.text.includes('review 任务不能使用 review_status: passed')));
});

test('checkTask 不强制 done 任务必须填写 review_status', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
    sourceDocExists: null,
  });
  const task = {
    id: 'DONE-NO-REVIEW',
    title: '无需复核字段的完成任务',
    status: 'done',
    kind: 'task',
    track: 'docs',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['commit:abc'],
    completed_date: '2026-05-23',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.equal(issues.filter(i => i.field === 'review_status').length, 0);
});

test('checkTask 默认 7 天后提示终态任务可归档', () => {
  assert.equal(Rules.DEFAULT_ARCHIVE_AFTER_DAYS, 7);
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
  });
  const task = {
    id: 'ARCHIVE-DONE',
    title: '已完成任务',
    status: 'done',
    track: 'backend',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    verification: 'npm test',
    completed_date: '2026-05-15',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some(i => i.level === 'info' && i.text.includes('可归档')));
});

test('checkTask 对已归档任务不再提示可归档', () => {
  const ctx = Rules.defaultContext({
    now: new Date('2026-05-23T00:00:00Z'),
    milestoneIds: new Set(['M1']),
  });
  const task = {
    id: 'ARCHIVED-DONE',
    title: '已归档任务',
    status: 'done',
    track: 'backend',
    milestone: 'M1',
    dependencies: [],
    source_docs: ['docs/spec.md'],
    evidence: ['PR#1'],
    verification: 'npm test',
    completed_date: '2026-05-01',
    archived_at: '2026-05-10',
    archived_reason: 'done_over_7_days',
    _openDeps: [],
    _missingDeps: [],
    _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.equal(issues.filter(i => i.text.includes('可归档')).length, 0);
});

test('checkFollowup 对合法 follow-up 返回 0 issue', () => {
  const ctx = Rules.defaultContext({ now: new Date('2026-05-23T00:00:00Z') });
  const f = {
    id: 'FUP-OK',
    title: '合法',
    kind: 'followup',
    status: 'open',
    source_type: 'pr_review',
    source_pr: 'PR#1',
    source_rr: 'RR-1',
    created_by: 'codex',
    created_at: '2026-05-22',
    reason: '理由',
    suggestion: '建议',
    severity: 'medium',
  };
  assert.equal(Rules.checkFollowup(f, ctx).length, 0);
});

test('checkFollowup 允许 PR review 来源用 source_comment 替代 source_rr', () => {
  const ctx = Rules.defaultContext({ now: new Date('2026-05-23T00:00:00Z') });
  const followup = {
    id: 'FUP-PR',
    title: 'PR 评论尾项',
    kind: 'followup',
    status: 'open',
    source_type: 'pr_review',
    source_pr: 'PR#12',
    source_comment: 'https://github.com/org/repo/pull/12#discussion_r1',
    created_by: 'codex',
    created_at: '2026-05-23',
    reason: '评审提出可后续处理的事项',
    suggestion: '后续转正式任务',
    severity: 'medium',
  };
  const issues = Rules.checkFollowup(followup, ctx);
  assert.equal(issues.filter(i => i.field === 'source_pr').length, 0);
});

test('CLI 和本地服务通过同一份规则模块生成健康检查', () => {
  // 防止有人偷偷在 validator.js 里复制规则逻辑而不调用 rules.js
  const validator = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'validator.js'), 'utf8');
  assert.ok(validator.includes("require('./rules.js')"), 'validator.js 必须 require src/rules.js');
  assert.ok(validator.includes('Rules.checkTask'), 'validator.js 必须调用 Rules.checkTask');
  assert.ok(validator.includes('Rules.checkFollowup'), 'validator.js 必须调用 Rules.checkFollowup');

  const runtimeState = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'runtime-state.js'), 'utf8');
  assert.ok(runtimeState.includes("require('./validator.js')"), 'runtime-state.js 必须复用 validator.js');
  assert.ok(runtimeState.includes('validateProject'), 'runtime-state.js 必须通过 validator.js 生成健康检查');
});
