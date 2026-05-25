const assert = require('node:assert/strict');
const test = require('node:test');

const Rules = require('../src/rules.js');

test('共享规则模块导出完整接口', () => {
  const required = [
    'TASK_STATUSES', 'TASK_KINDS', 'FOLLOWUP_STATUSES', 'FOLLOWUP_KINDS',
    'TASK_TRACKS', 'TRACK_ALIASES', 'ENGINEERING_TRACKS',
    'DEFAULT_REVIEW_STALE_DAYS', 'DEFAULT_ARCHIVE_AFTER_DAYS',
    'parseDate', 'daysBetween', 'normalizeTrack',
    'checkTask', 'checkFollowup', 'defaultContext',
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

test('checkTask 命中 review 超期与 owner/agent 冲突等关键规则', () => {
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
  assert.ok(issues.some(i => i.text.includes('owner 与 agent 不一致')));
  assert.ok(issues.some(i => i.text.includes('review 状态超过')));
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

test('页面和 CLI 通过同一份规则模块（loadProject 应等价于直接 checkTask）', () => {
  // 防止有人偷偷在 validator.js 里复制规则逻辑而不调用 rules.js
  const validator = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'validator.js'), 'utf8');
  assert.ok(validator.includes("require('./rules.js')"), 'validate.js 必须 require 同目录的 rules.js');
  assert.ok(validator.includes('Rules.checkTask'), 'validate.js 必须调用 Rules.checkTask');
  assert.ok(validator.includes('Rules.checkFollowup'), 'validate.js 必须调用 Rules.checkFollowup');

  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'examples', 'minimal', '.ganttmd', 'index.html'), 'utf8');
  assert.ok(html.includes('<script src="rules.js"></script>'), 'index.html 必须加载 rules.js');
  assert.ok(html.includes('Rules.checkTask'), 'index.html 必须调用 Rules.checkTask');
  assert.ok(html.includes('Rules.checkFollowup'), 'index.html 必须调用 Rules.checkFollowup');
});
