# 最小任务集

## M1 最小闭环

### MIN-001 建立任务看板入口

```ganttmd-task
id: MIN-001
title: 建立任务看板入口
kind: task
status: done
dependencies: []
milestone: M1
track: docs
domain: ganttmd
priority: P0
source_docs: [source-docs/product.md]
next_action: 确认 GanttMD 页面、规则和样例入口可被项目成员找到
acceptance: [README 写清入口, AGENTS 写清代理规则, 页面能读取任务目录]
evidence: [README.md, AGENTS.md]
verification: npm run validate -- examples/minimal
review_status: passed
completed_date: 2026-05-23
```


### MIN-002 补齐任务校验规则

```ganttmd-task
id: MIN-002
title: 补齐任务校验规则
kind: harness
status: in_progress
dependencies: [MIN-001]
milestone: M1
track: quality
domain: ganttmd
priority: P1
owner: project-control
source_docs: [source-docs/tech.md]
next_action: 检查 validator 能发现缺证据、缺来源、非法状态和 follow-up 来源缺失
acceptance: [validator 可运行, 样例数据无 warning, 规则说明能被 Agent 理解]
evidence: []
updated_at: 2026-05-23
```

```ganttmd-checklist
task_id: MIN-002
items:
  - C1 [done] validator 可运行 | evidence: npm run validate -- examples/minimal
  - C2 [in_progress] runs 和 checklist 规则接入源码
  - C3 [todo] 更新安装式 CLI 文档
```

### MIN-003 展示被依赖阻塞任务

```ganttmd-task
id: MIN-003
title: 展示被依赖阻塞任务
kind: task
status: todo
dependencies: [MIN-002]
milestone: M1
track: frontend
domain: ganttmd
priority: P1
source_docs: [source-docs/product.md]
next_action: 在页面确认未完成前置依赖会让任务进入被阻塞展示
acceptance: [卡片显示阻塞来源, 查看依赖能定位上游任务, Agent 指令不建议直接领取]
evidence: []
updated_at: 2026-05-23
```

### MIN-004 等待复核任务样例

```ganttmd-task
id: MIN-004
title: 等待复核任务样例
kind: review
status: review
dependencies: [MIN-001]
milestone: M1
track: docs
domain: ganttmd
priority: P2
source_docs: [source-docs/product.md]
next_action: 由项目主控确认文档说明是否足够清晰
acceptance: [复核结论已填写, 必要 follow-up 已登记]
evidence: [source-docs/product.md]
review_status: pending
updated_at: 2026-05-23
```

## M2 后续增强

### MIN-005 取消的旧方案

```ganttmd-task
id: MIN-005
title: 取消的旧方案
kind: ad_hoc
status: cancelled
dependencies: []
milestone: M2
track: ops
domain: ganttmd
priority: P3
source_docs: [source-docs/tech.md]
next_action: 已取消，不进入执行队列
acceptance: [取消原因明确]
evidence: []
resolution: 已改为手动选择目录方案
closed_at: 2026-05-23
```
