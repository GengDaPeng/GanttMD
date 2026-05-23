# Follow-up 清单

## 待清理事项

```ganttmd-followup
id: FUP-MIN-001
title: 判断是否需要保存上次选择目录
kind: followup
status: open
source_type: discussion
source_task: MIN-003
created_by: codex
created_at: 2026-05-23
reason: 页面刷新后需要重新选择目录，真实项目频繁刷新时体验较差
suggestion: 暂不自动写入文件系统；后续评估本地微服务或浏览器权限方案
severity: medium
```

```ganttmd-followup
id: FUP-MIN-002
title: 延后自动归档命令
kind: deferred
status: accepted
source_type: task
source_task: MIN-002
created_by: codex
created_at: 2026-05-23
accepted_by: project-control
accepted_at: 2026-05-23
next_review_at: 2026-06-15
decision: 先由 validator 提示可归档，暂不自动移动文件
reason: 自动写文件需要更强的可回滚设计
suggestion: 等真实项目关闭任务超过 30 天后再设计 ganttmd archive
severity: low
```
