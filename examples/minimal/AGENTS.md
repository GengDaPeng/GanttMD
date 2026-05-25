# Agent 协作规则

本样例使用 GanttMD 跟踪 Acme Notes 的任务状态。

开始工作前读取：

```text
.ganttmd/config.yaml
与本次任务相关的 .ganttmd/tasks/*.md
相关的 .ganttmd/followups.md 条目
相关的 .ganttmd/runs.md 条目
当前任务的 source_docs
```

本样例建议由一个任务分发 Agent 维护看板结构；执行 Agent 只更新当前任务、补充证据，并追加 `status: open` 的 follow-up。

从 GanttMD 仓库根目录校验这个内置样例：

```bash
npm run validate -- examples/minimal
```
