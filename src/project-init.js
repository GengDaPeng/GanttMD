const fs = require('node:fs');
const path = require('node:path');

function writeIfMissing(filePath, content, created) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  created.push(filePath);
  return true;
}

function initProject(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const ganttRoot = path.join(root, '.ganttmd');
  const created = [];

  writeIfMissing(path.join(ganttRoot, 'config.yaml'), `ganttmd:
  schema_version: 1
project:
  id: ${path.basename(root)}
  name: ${path.basename(root)}

views:
  default: execution

milestones:
  - id: M1
    name: 第一阶段
    status: in_progress
`, created);

  writeIfMissing(path.join(ganttRoot, 'tasks', 'main.md'), `# 主任务

## M1 第一阶段

\`\`\`ganttmd-task
id: T-001
title: 初始化 GanttMD 任务状态
status: todo
milestone: M1
track: docs
source_docs: [PR#init]
next_action: 把这个样例任务替换为项目真实任务
acceptance: [项目至少登记一个真实任务]
\`\`\`

`, created);

  writeIfMissing(path.join(ganttRoot, 'followups.md'), `# Follow-up

`, created);

  writeIfMissing(path.join(ganttRoot, 'runs.md'), `# 执行批次

`, created);

  return { root, ganttRoot, created };
}

module.exports = {
  initProject,
};
