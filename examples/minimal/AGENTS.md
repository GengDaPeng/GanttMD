# Agent 协作规则

本样例使用 GanttMD 跟踪任务状态。

开始工作前读取：

```text
.ganttmd/config.yaml
与本次任务相关的 .ganttmd/tasks/*.md
相关的 .ganttmd/followups.md 条目
当前任务的 source_docs
```

真实项目接入 GanttMD 后，在该项目根目录提交 `.ganttmd/` 改动前运行：

```bash
npm run validate -- .
```

如果从 GanttMD 仓库根目录校验这个内置样例，使用：

```bash
npm run validate -- examples/minimal
```
