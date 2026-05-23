const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadProject, validateProject } = require('../src/validator');

function createProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }
  return root;
}

test('校验器能发现缺失依赖、完成缺证据、PR follow-up 缺来源', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Broken Project
`,
    '.ganttmd/modules/main.md': `# 主任务

\`\`\`ganttmd-task
id: A
title: 已完成但没有证据
status: done
dependencies: []
track: backend
next_action: 已完成
acceptance: [完成]
evidence: []
\`\`\`

\`\`\`ganttmd-task
id: B
title: 依赖不存在
status: todo
dependencies: [NOPE]
track: frontend
next_action: 等待依赖
acceptance: [完成]
evidence: []
\`\`\`
`,
    '.ganttmd/followups.md': `# Follow-up

\`\`\`ganttmd-followup
id: FUP-1
title: PR 尾项
kind: followup
status: open
source_type: pr_review
created_by: codex
created_at: 2026-05-23
reason: 评审提出可延后事项
suggestion: 补充验证
severity: medium
\`\`\`
`,
  });

  const project = loadProject(root);
  const issues = validateProject(project);

  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'A' && issue.message.includes('evidence')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'B' && issue.message.includes('依赖指向不存在任务')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'FUP-1' && issue.message.includes('source_pr')));
});

test('已转任务的 deferred follow-up 不再要求 next_review_at', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Converted Followup
`,
    '.ganttmd/modules/main.md': '',
    '.ganttmd/followups.md': `# Follow-up

\`\`\`ganttmd-followup
id: FUP-2
title: 已转正式任务
kind: deferred
status: converted
source_type: pr_review
source_pr: PR#24
source_rr: RR-004
created_by: codex
created_at: 2026-05-23
reason: 可延后事项
suggestion: 转正式任务
severity: low
resolution: 已转为正式任务 S-BE-08
converted_task: S-BE-08
\`\`\`
`,
  });

  const project = loadProject(root);
  const issues = validateProject(project);

  assert(!issues.some((issue) => issue.level === 'warn' && issue.id === 'FUP-2' && issue.field === 'next_review_at'));
});

test('校验器能发现任务缺主线、未知里程碑和不存在的来源文档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Source Docs

milestones:
  - id: M1
    name: 第一阶段
`,
    '.ganttmd/modules/main.md': `# 主任务

\`\`\`ganttmd-task
id: C
title: 来源文档不存在
status: todo
dependencies: []
milestone: M9
source_docs: [docs/not-found.md §16]
next_action: 补文档
acceptance: [完成]
\`\`\`
`,
  });

  const project = loadProject(root);
  const issues = validateProject(project);

  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'C' && issue.message.includes('未知里程碑')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'C' && issue.message.includes('缺少 track')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'C' && issue.message.includes('来源文档不存在')));
});

test('校验器能发现可下沉的协作规则问题', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Workflow Rules

milestones:
  - id: M1
    name: 第一阶段
`,
    '.ganttmd/modules/main.md': `# 主任务

\`\`\`ganttmd-task
id: D
title: 长期待复核任务
kind: random
status: review
dependencies: []
milestone: M1
track: backend
owner: claude
agent: codex
source_docs: []
next_action: 等待复核
acceptance: [完成]
evidence: [PR#1]
review_status: pending
updated_at: 2026-05-01
\`\`\`

\`\`\`ganttmd-task
id: E
title: 已领取但没有负责人
status: in_progress
dependencies: []
milestone: M1
track: frontend
source_docs: [docs/existing.md]
next_action: 继续推进
acceptance: [完成]
updated_at: 2026-05-22
\`\`\`
`,
    'docs/existing.md': '# exists',
    '.ganttmd/followups.md': `# Follow-up

\`\`\`ganttmd-followup
id: FUP-3
title: 超期复核事项
kind: deferred
status: accepted
source_type: task
source_task: D
created_by: codex
created_at: 2026-05-01
accepted_by: project-control
accepted_at: 2026-05-02
next_review_at: 2026-05-10
decision: 等待下次清理
reason: 暂缓处理
suggestion: 到期复核
severity: medium
\`\`\`
`,
  });

  const project = loadProject(root);
  const issues = validateProject(project, { now: new Date('2026-05-23T00:00:00Z') });

  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'D' && issue.message.includes('kind 非法')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'D' && issue.message.includes('review 状态超过')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'D' && issue.message.includes('owner 与 agent 不一致')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'D' && issue.message.includes('source_docs')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'E' && issue.message.includes('in_progress 任务缺少 owner/agent')));
  assert(issues.some((issue) => issue.level === 'warn' && issue.id === 'FUP-3' && issue.message.includes('超过 next_review_at')));
});

test('校验器能提示长期完成或取消任务可归档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Archive Candidates

milestones:
  - id: M1
    name: 第一阶段
`,
    '.ganttmd/modules/main.md': `# 主任务

\`\`\`ganttmd-task
id: F
title: 已完成很久的任务
status: done
dependencies: []
milestone: M1
track: backend
source_docs: [docs/existing.md]
next_action: 已完成
acceptance: [完成]
evidence: [PR#1]
verification: pnpm test
review_status: passed
completed_date: 2026-05-01
\`\`\`

\`\`\`ganttmd-task
id: G
title: 已取消很久的任务
status: cancelled
dependencies: []
milestone: M1
track: spec
source_docs: [docs/existing.md]
next_action: 已取消
acceptance: [取消]
resolution: 已合并到其他任务
closed_at: 2026-05-02
\`\`\`
`,
    'docs/existing.md': '# exists',
  });

  const project = loadProject(root);
  const issues = validateProject(project, {
    now: new Date('2026-06-15T00:00:00Z'),
    archiveAfterDays: 30,
  });

  assert(issues.some((issue) => issue.level === 'info' && issue.id === 'F' && issue.message.includes('可归档')));
  assert(issues.some((issue) => issue.level === 'info' && issue.id === 'G' && issue.message.includes('可归档')));
});
