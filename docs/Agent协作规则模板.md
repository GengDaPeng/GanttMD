# Agent 协作规则模板

本模板可复制到使用方项目的 `AGENTS.md`。请按项目实际目录、分支策略和团队职责调整。

## GanttMD 入口

- 任务状态数据位于 `.ganttmd/`。
- 工作前先读取 `.ganttmd/config.yaml`，再读取与本次任务相关的 `.ganttmd/tasks/*.md`、`.ganttmd/followups.md` 和当前任务的 `source_docs`。
- 字段和状态规则以 `ganttmd validate`、`ganttmd doctor` 和项目内 `.ganttmd/` 为准。

## 推荐职责分工

如果项目有多个 Agent 或多人同时修改任务状态，建议指定一个任务分发 Agent 或看板维护者负责 `.ganttmd/` 的结构性维护：

- 创建、拆分、取消和关闭任务。
- 调整依赖、里程碑、主线和领域。
- 清理、接受、关闭或转换 follow-up。
- 定期运行 `ganttmd validate`，修复看板结构问题。

其他执行 Agent 建议只做当前任务范围内的更新：

- 领取已存在任务。
- 更新当前任务的 `status`、`owner` / `agent`、`evidence`、`verification`、`review_status`。
- 维护当前任务的 `ganttmd-checklist`。
- 追加 `status: open` 的 follow-up。

这样可以避免多个 Agent 同时改任务结构，导致看板和项目状态分叉。

## 执行规则

- 不要凭空编造任务、来源文档、依赖或完成证据。
- 不要修改与当前任务无关的任务状态。
- 执行任务前必须读取任务列出的 `source_docs`。
- 依赖未完成时，不要直接领取下游任务；先推进前置任务或登记 follow-up。
- “后续再做 / 暂不处理 / 本轮不修”等未闭环事项必须登记到 `.ganttmd/followups.md`。
- 多分支并行时，可用 `.ganttmd/runs.md` 记录任务批次、分支和当前任务。
- 大范围重排任务文件前，应先得到维护者确认。

## 提交前检查

在提交 `.ganttmd/` 改动前运行：

```bash
ganttmd validate
ganttmd doctor
```

如果从 GanttMD 仓库根目录校验内置样例，使用：

```bash
npm run validate -- examples/minimal
```
