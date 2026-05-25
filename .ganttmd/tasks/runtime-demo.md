# GanttMD 本项目运行态演示任务

本文件只用于验证主分支任务、运行批次和任务清单在本地看板中的展示效果。

### MAIN-DEMO-01 主分支安装命令说明收口

```ganttmd-task
id: MAIN-DEMO-01
title: 主分支安装命令说明收口
status: in_progress
owner: codex
dependencies: []
milestone: M2
track: docs
domain: ganttmd_runtime
priority: P1
source_docs: [README.md]
next_action: 对齐 start / stop / status / validate 的使用说明，确认普通项目能按安装式入口启动看板
acceptance: [README 写清本地启动入口, 文档说明 validate 的项目路径参数, 页面可看到当前任务清单]
evidence: []
updated_at: 2026-05-25
```

```ganttmd-checklist
task_id: MAIN-DEMO-01
items:
  - C1 [done] 梳理 start / stop / status 命令入口 | evidence: bin/ganttmd.js
  - C2 [in_progress] 补齐 README 使用说明
  - C3 [todo] 复核最小接入清单里的命令示例
```

### MAIN-DEMO-02 主分支服务状态测试

```ganttmd-task
id: MAIN-DEMO-02
title: 主分支服务状态测试
status: todo
dependencies: [MAIN-DEMO-01]
milestone: M2
track: quality
domain: ganttmd_runtime
priority: P2
source_docs: [README.md]
next_action: 用本地看板确认主分支任务、运行批次和 checklist 都能被读取
acceptance: [执行视角能看到 MAIN-DEMO-02, MAIN-DEMO-01 抽屉能展开任务清单, runtime API 返回主分支 checklist items]
evidence: []
updated_at: 2026-05-25
```
