# 执行批次

```ganttmd-run
id: RUN-JWXT-001
title: 考勤规格与跨域分流收口
status: active
branch: codex/attendance-spec-closure
owner: project-control
tasks: [S-ATT-02, S-MOD-06, S-STAT-01]
current_task: S-MOD-06
started_at: 2026-05-24
updated_at: 2026-05-24
note: 一个 worktree 连续推进考勤字段、跨域对端确认和统计审计主规格启动前置收口
```

```ganttmd-run
id: RUN-JWXT-002
title: 本地工程规范收口
status: active
branch: codex/local-dev-standards
owner: project-control
tasks: [S-QA-14]
current_task: S-QA-14
started_at: 2026-05-24
updated_at: 2026-05-24
note: 补齐多 worktree 隔离和本地运行经验，服务后续安装式 GanttMD 接入
```

```ganttmd-run
id: RUN-GMD-MAIN-DEMO
title: GanttMD 主分支运行态演示
status: active
branch: main
owner: codex
tasks: [MAIN-DEMO-01, MAIN-DEMO-02]
current_task: MAIN-DEMO-01
started_at: 2026-05-25
updated_at: 2026-05-25
note: 用于验证主分支任务和任务清单能在本地看板中展示
```
