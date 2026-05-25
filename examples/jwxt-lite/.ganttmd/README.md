# GanttMD 项目任务状态

本目录是项目任务状态唯一真相源。它只维护任务状态、依赖、阻塞、证据、follow-up 和 worktree 执行记录；需求、设计、接口、测试规范等正式正文仍放在项目原有 docs/ 中，并通过 source_docs 引用。

## 文件说明

- config.yaml：项目、里程碑、视图和校验配置。
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
