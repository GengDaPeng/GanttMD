const fs = require('node:fs');
const path = require('node:path');

const LEGACY_README_CONTENT = `# GanttMD 项目任务状态

本目录是项目任务状态唯一真相源。它只维护任务状态、依赖、阻塞、证据、follow-up 和 worktree 执行记录；需求、设计、接口、测试规范等正式正文仍放在项目原有 docs/ 中，并通过 source_docs 引用。

## 文件说明

- config.yaml：项目、里程碑、视图、校验和 agent_command 复制指令模板配置。
- tasks/*.md：正式任务、状态、依赖、证据链和验收摘要。
- followups.md：后续事项、用户裁决、延期复核、外部等待和风险项。
- runs.md：worktree/分支领取任务、执行批次和当前运行态。
- README.md：本目录的操作边界说明。

## 操作边界

项目主控可以：

- 创建、拆分和调整正式任务。
- 调整依赖、里程碑、主线和领域。
- 接受、关闭、拒绝或转化 follow-up。
- 归档或恢复任务。
- 清理已收口 checklist。

普通 Agent 可以：

- 领取主分支已有任务。
- 更新当前任务的 status、owner/agent、evidence、verification、review_status。
- 维护当前任务内的 checklist。
- 追加 status: open 的 follow-up。

worktree/分支只能：

- 通过 runs.md 记录领取和执行批次。
- 维护当前任务内的 checklist。
- 追加 status: open 的 follow-up。

不得：

- 在分支创建新的顶层 ganttmd-task。
- 私自关闭、接受、拒绝或转化 follow-up。
- 私自归档或恢复任务。
- 删除未收口 checklist。
- 修改与当前任务无关的任务状态。

## checklist 收口

checklist 是执行过程记录，不是长期任务事实。

父任务进入 done 或 cancelled 后，项目主控必须把 checklist 结果收口到：

- evidence
- verification
- follow-up
- 新正式任务

然后删除 checklist。ganttmd validate 会对已关闭任务仍保留 checklist 的情况给出提示。
`;

const README_CONTENT = `# GanttMD 项目任务状态

本目录是项目任务状态唯一真相源。它只维护任务状态、依赖、阻塞、证据、follow-up 和 worktree 执行记录；需求、设计、接口、测试规范等正式正文仍放在项目原有 docs/ 中，并通过 source_docs 引用。

## 文件说明

- config.yaml：项目、里程碑、视图、校验和 agent_command 复制指令模板配置。
- tasks/*.md：正式任务、状态、依赖、证据链和验收摘要。
- followups.md：后续事项、用户裁决、延期复核、外部等待和风险项。
- runs.md：运行态记录，不是长期任务正文；默认不要手工维护，项目启用 CLI 或自动化流程时应优先通过受控写入口更新。
- README.md：本目录的操作边界说明。

## 操作边界

项目主控可以：

- 创建、拆分和调整正式任务。
- 调整依赖、里程碑、主线和领域。
- 接受、关闭、拒绝或转化 follow-up。
- 归档或恢复任务。
- 清理已收口 checklist。

普通 Agent 可以：

- 领取主分支已有任务。
- 更新当前任务的 status、owner/agent、evidence、verification、review_status。
- 维护当前任务内的 checklist。
- 追加 status: open 的 follow-up。

worktree/分支只能：

- 通过 CLI 或受控自动化写入 runs.md，记录领取和执行批次。
- 维护当前任务内的 checklist。
- 追加 status: open 的 follow-up。

不得：

- 在分支创建新的顶层 ganttmd-task。
- 私自关闭、接受、拒绝或转化 follow-up。
- 私自归档或恢复任务。
- 删除未收口 checklist。
- 修改与当前任务无关的任务状态。

## checklist 收口

checklist 是执行过程记录，不是长期任务事实。

父任务进入 done 或 cancelled 后，项目主控必须把 checklist 结果收口到：

- evidence
- verification
- follow-up
- 新正式任务

然后删除 checklist。ganttmd validate 会对已关闭任务仍保留 checklist 的情况给出提示。
`;

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

  writeIfMissing(path.join(ganttRoot, 'README.md'), README_CONTENT, created);

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
  LEGACY_README_CONTENT,
  README_CONTENT,
  initProject,
};
