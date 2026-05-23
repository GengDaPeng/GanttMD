# Agent 协作规则

本样例使用 GanttMD 跟踪任务状态。

开始工作前读取：

```text
.ganttmd/config.yaml
.ganttmd/tasks/*.md
.ganttmd/followups.md
当前任务的 source_docs
```

提交 `.ganttmd/` 改动前运行：

```bash
npm run validate -- examples/minimal
```
