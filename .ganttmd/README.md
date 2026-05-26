# Acme Notes 任务状态

本目录是样例项目的任务状态数据。它只维护任务状态、依赖、阻塞、证据、follow-up 和执行批次；需求、架构和质量说明放在 `source-docs/`，并通过 `source_docs` 引用。

## 文件说明

- `config.yaml`：项目、里程碑和视图配置。
- `tasks/*.md`：正式任务、状态、依赖、证据链和验收摘要。
- `followups.md`：后续事项、延期复核、外部等待和风险项。
- `runs.md`：任务批次、分支和当前运行态。
- `README.md`：本目录的操作边界说明。

## 维护建议

多 Agent 协作时，建议由一个任务分发 Agent 或看板维护者统一处理结构性变更：

- 创建、拆分和取消任务。
- 调整依赖、里程碑、主线和领域。
- 接受、关闭、拒绝或转化 follow-up。
- 归档或恢复任务。
- 清理已收口 checklist。

执行 Agent 建议只做当前任务范围内的更新：

- 领取已存在任务。
- 更新当前任务的 `status`、`owner` / `agent`、`evidence` 和 `verification`。
- 完成交付后可写 `status: review` 和 `review_status: pending`；`passed` / `deferred` 由主控或维护者填写。
- 主控把任务改为 `status: done` 时，建议同时填写 `completed_branch` 记录完成分支。
- `status: done` 不强制填写 `review_status`；如果填写，只能是 `passed`。
- 维护当前任务内的 checklist。
- 追加 `status: open` 的 follow-up。

PR 修改意见、requested changes 和返工要求保留在 PR review 或评论中，不写入 `review_status`。

## checklist 收口

checklist 是执行过程记录，不是长期任务事实。

父任务进入 `done` 或 `cancelled` 后，应把 checklist 结果收口到：

- `evidence`
- `verification`
- follow-up
- 新正式任务

然后删除 checklist。`ganttmd validate` 会对已关闭任务仍保留 checklist 的情况给出提示。
