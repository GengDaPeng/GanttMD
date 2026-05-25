# 执行批次

```ganttmd-run
id: RUN-001
title: 编辑器体验批次
status: active
branch: feature/editor
owner: frontend-dev
tasks: [FE-002, FE-003, FE-004]
current_task: FE-002
started_at: 2026-05-25
updated_at: 2026-05-25
note: 先完成编辑器，再接离线提示和命令面板评估
```

```ganttmd-run
id: RUN-002
title: 同步 API 批次
status: active
branch: feature/sync-api
owner: backend-dev
tasks: [BE-002, BE-003, BE-004]
current_task: BE-002
started_at: 2026-05-25
updated_at: 2026-05-25
note: 同步 API 稳定后再推进分享链接和审计日志
```

```ganttmd-run
id: RUN-003
title: 文档复核批次
status: review
branch: docs/user-guide
owner: docs-writer
tasks: [DOC-002]
current_task: DOC-002
started_at: 2026-05-25
updated_at: 2026-05-25
note: 用户指南等待产品和支持同事复核
```
