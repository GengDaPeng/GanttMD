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
