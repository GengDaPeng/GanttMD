const assert = require('node:assert/strict');
const test = require('node:test');

const Rules = require('../tools/ganttmd/rules.js');

test('共享规则模块导出完整接口', () => {
  const required = [
    'TASK_STATUSES', 'TASK_KINDS', 'FOLLOWUP_STATUSES', 'FOLLOWUP_KINDS', 'ENGINEERING_TRACKS',
    'DEFAULT_REVIEW_STALE_DAYS', 'DEFAULT_ARCHIVE_AFTER_DAYS',
    'parseDate', 'daysBetween',
    'checkTask', 'checkFollowup', 'defaultContext',
  ];
  for (const k of required) assert.ok(k in Rules, `missing export: ${k}`);
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
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'validator.js'), 'utf8');
  assert.ok(src.includes("require('../tools/ganttmd/rules.js')"), 'validator.js 必须 require 共享规则模块');
  assert.ok(src.includes('Rules.checkTask'), 'validator.js 必须调用 Rules.checkTask');
  assert.ok(src.includes('Rules.checkFollowup'), 'validator.js 必须调用 Rules.checkFollowup');

  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'tools', 'ganttmd', 'index.html'), 'utf8');
  assert.ok(html.includes('<script src="rules.js"></script>'), 'index.html 必须加载 rules.js');
  assert.ok(html.includes('Rules.checkTask'), 'index.html 必须调用 Rules.checkTask');
  assert.ok(html.includes('Rules.checkFollowup'), 'index.html 必须调用 Rules.checkFollowup');
});
