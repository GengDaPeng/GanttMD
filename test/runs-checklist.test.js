const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadProject, validateProject } = require('../src/validator.js');

function createProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-runs-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const targetPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
  }
  return root;
}

test('loader 能解析 runs 和 checklist', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Runs

milestones:
  - id: M1
    name: 第一阶段
`,
    '.ganttmd/tasks/main.md': `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 大任务
status: in_progress
owner: codex
dependencies: []
milestone: M1
track: backend
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
\`\`\`

\`\`\`ganttmd-checklist
task_id: T-1
items:
  - C1 [done] 接口完成 | evidence: commit:abc123
  - C2 [in_progress] 页面联调
\`\`\`
`,
    '.ganttmd/runs.md': `# Runs

\`\`\`ganttmd-run
id: RUN-1
title: 执行批次
status: active
branch: feat/demo
owner: codex
tasks: [T-1]
current_task: T-1
\`\`\`
`,
    'docs/spec.md': '# spec',
  });

  const project = loadProject(root);

  assert.equal(project.runs.length, 1);
  assert.equal(project.runs[0].tasks[0], 'T-1');
  assert.equal(project.checklists.length, 1);
  assert.equal(project.checklists[0].items.length, 2);
  assert.equal(project.checklists[0].items[0].evidence[0], 'commit:abc123');
  assert.equal(validateProject(project).filter((issue) => issue.level === 'warn').length, 0);
});

test('loader 读取项目级 Agent 指令模板', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Template Project
ganttmd:
  agent_command_execution_setup: 主控安排执行
  agent_command_delivery_requirements: PR body 交付
agent_command_templates:
  todo: templates/todo.md
  blocked: templates/blocked.md
`,
    '.ganttmd/agent-command-template.md': '接手 {{task.id}}：{{task.title}}\n\n{{task.acceptance}}\n',
    '.ganttmd/templates/todo.md': 'TODO {{task.id}}\n',
    '.ganttmd/templates/blocked.md': 'BLOCKED {{task.blocked_reason}}\n',
    '.ganttmd/tasks/main.md': `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 模板任务
status: todo
dependencies: []
track: spec
acceptance: [验收一, 验收二]
\`\`\`
`,
  });

  const project = loadProject(root);

  assert.equal(project.config.ganttmd.agent_command_template_text, '接手 {{task.id}}：{{task.title}}\n\n{{task.acceptance}}\n');
  assert.equal(project.config.ganttmd.agent_command_template_path, 'agent-command-template.md');
  assert.equal(project.config.ganttmd.agent_command_execution_setup, '主控安排执行');
  assert.equal(project.config.ganttmd.agent_command_delivery_requirements, 'PR body 交付');
  assert.equal(project.config.ganttmd.agent_command_templates.todo.text, 'TODO {{task.id}}\n');
  assert.equal(project.config.ganttmd.agent_command_templates.todo.path, 'templates/todo.md');
  assert.equal(project.config.ganttmd.agent_command_templates.blocked.text, 'BLOCKED {{task.blocked_reason}}\n');
});

test('校验器能发现 run 和 checklist 的结构问题', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `project:
  name: Broken Runs
`,
    '.ganttmd/tasks/main.md': `# Tasks

\`\`\`ganttmd-task
id: T-1
title: 已完成但清单没收口
status: done
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 已完成
acceptance: [完成]
evidence: [PR#1]
verification: npm test
\`\`\`

\`\`\`ganttmd-task
id: T-2
title: 多 run 冲突
status: in_progress
dependencies: []
track: backend
owner: codex
source_docs: [docs/spec.md]
next_action: 推进
acceptance: [完成]
\`\`\`

\`\`\`ganttmd-checklist
task_id: T-1
items:
  - C1 [todo] 未完成
  - C1 [blocked] 重复且无阻塞原因
\`\`\`
`,
    '.ganttmd/runs.md': `# Runs

\`\`\`ganttmd-run
id: RUN-1
title: 第一个批次
status: active
branch: feat/a
owner: codex
tasks: [T-2, MISSING]
current_task: T-2
\`\`\`

\`\`\`ganttmd-run
id: RUN-2
title: 第二个批次
status: active
branch: feat/b
owner: claude
tasks: [T-2]
current_task: OTHER
\`\`\`
`,
    'docs/spec.md': '# spec',
  });

  const issues = validateProject(loadProject(root));

  assert(issues.some((issue) => issue.id === 'RUN-1' && issue.message.includes('引用不存在任务')));
  assert(issues.some((issue) => issue.id === 'RUN-2' && issue.message.includes('current_task 必须属于 tasks')));
  assert(issues.some((issue) => issue.id === 'RUN-2' && issue.message.includes('多个 active run')));
  assert(issues.some((issue) => issue.id === 'T-1' && issue.message.includes('item id 重复')));
  assert(issues.some((issue) => issue.id === 'T-1' && issue.message.includes('blocked checklist item')));
  assert(issues.some((issue) => issue.id === 'T-1' && issue.message.includes('父任务已 done')));
  assert(issues.some((issue) =>
    issue.level === 'info'
    && issue.id === 'T-1'
    && issue.message.includes('请将 checklist 结果收口')
  ));
});
