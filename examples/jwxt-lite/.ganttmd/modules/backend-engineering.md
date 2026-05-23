# 工程跑道与安全到校纵切

本文件按系统总调度视角抽取后端工程、前端工程和安全到校纵切任务。已完成的工程跑道任务保留为依赖证据，当前执行重心放在 `S-FE-02` 和工程质量门余量。

### S-BE-01 后端工程骨架专项设计

```ganttmd-task
id: S-BE-01
title: 后端工程骨架专项设计
status: done
dependencies: []
milestone: M2
track: backend
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 复核后端工程骨架专项是否足以支撑业务 API、worker、Prisma、本地启动和 CI 跑道
acceptance: [NestJS api 和 worker 入口明确, Prisma PostgreSQL Redis BullMQ MinIO 跑道明确, 本地启动测试和 CI 插槽明确]
evidence: [PR#3, commit:c27a508]
verification: 文档评审通过 + 后续 S-BE-03 实现验证
review_status: passed
updated_at: 2026-05-10
```

### S-BE-02 数据库迁移与发布规范专项

```ganttmd-task
id: S-BE-02
title: 数据库迁移与发布规范专项
status: done
dependencies: [S-BE-01]
milestone: M2
track: backend
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 复核 Prisma 和 PostgreSQL 迁移规范是否足以支撑后续业务对象落地
acceptance: [schema 组织和 migration 命名明确, 发布回滚 seed 和数据修复规则明确, AI 生成迁移审查规则明确]
evidence: [PR#7]
verification: 规范文档评审通过
review_status: passed
updated_at: 2026-05-11
```

### S-BE-03 创建后端工程基础结构

```ganttmd-task
id: S-BE-03
title: 创建后端工程基础结构
status: done
dependencies: [S-BE-01]
milestone: M2
track: backend
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 保持后端基础结构作为后续业务 API 的工程输入
acceptance: [后端目录和包管理可用, api 和 worker 启动入口可用, 健康检查和最小测试入口可运行]
evidence: [PR#20, commit:e11e16e]
verification: pnpm test:e2e + 本地 api/worker 启动验证
review_status: passed
updated_at: 2026-05-13
```

### S-BE-04 建立 Prisma 与数据库迁移跑道

```ganttmd-task
id: S-BE-04
title: 建立 Prisma 与数据库迁移跑道
status: done
dependencies: [S-BE-02]
milestone: M2
track: backend
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 保持 Prisma 跑道作为安全到校和后续业务对象落地输入
acceptance: [Prisma schema 和首个 migration 可用, seed 入口可用, 集成测试跑道可用]
evidence: [PR#23, commit:faa93a4, commit:3cbd3a2]
verification: pnpm prisma migrate dev + 集成测试通过
review_status: passed
updated_at: 2026-05-14
```

### S-BE-05 建立 Redis / BullMQ / MinIO 本地依赖

```ganttmd-task
id: S-BE-05
title: 建立 Redis / BullMQ / MinIO 本地依赖
status: done
dependencies: [S-BE-03]
milestone: M2
track: infra
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 保持本地依赖健康检查作为后续队列、对象存储和安全到校纵切输入
acceptance: [Redis BullMQ MinIO 可本地启动, 后端能连接依赖, 健康检查能暴露依赖状态]
evidence: [PR#22, commit:58549e8]
verification: docker compose up + /health 接口验证
review_status: passed
updated_at: 2026-05-14
```

### S-BE-06 建立本地一键启动与基础 CI

```ganttmd-task
id: S-BE-06
title: 建立本地一键启动与基础 CI
status: done
dependencies: [S-BE-03, S-BE-04, S-BE-05]
milestone: M2
track: infra
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 保持本地启动、运行时锁和 CI 基础检查作为后续业务实现的固定入口
acceptance: [本地开发命令可启动必要服务, CI 覆盖 install generate validate test build, 运行时锁和依赖健康检查可复用]
evidence: [PR#24, commit:a7f8693]
verification: GitHub Actions CI 全绿 + 本地 pnpm dev 启动验证
review_status: passed
updated_at: 2026-05-16
```

### S-QA-13 测试规范骨架与定稿

```ganttmd-task
id: S-QA-13
title: 测试规范骨架与定稿
status: review
dependencies: [S-BE-03, S-BE-04, S-BE-05, S-BE-06]
milestone: M2
track: quality_gate
module: crosscutting
priority: P1
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 等待项目主控复核测试分层规则，复核通过后转 done；如复核要求补充前端测试细则则退回 in_progress
acceptance: [测试分层规则覆盖后端前端契约和业务 API, AI 生成测试的审查要求明确, 后续随实现补齐项有清单]
downstream_constraints: [S-FE-02 前端闭环依赖本任务的测试分层规则来编写前端测试]
evidence: [commit:13e1a14, commit:2cc205a]
verification: 后端测试跑通 + 前端测试细则待复核
review_status: pending
updated_at: 2026-05-22
```

当前状态：骨架与后端工程跑道回填已完成，前端、契约和后续业务 API 测试细则随实现继续补齐。

### S-QA-14 本地开发环境规范骨架与定稿

```ganttmd-task
id: S-QA-14
title: 本地开发环境规范骨架与定稿
status: in_progress
dependencies: [S-BE-05, S-BE-06]
milestone: M2
track: quality_gate
module: crosscutting
priority: P1
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 继续补齐多 worktree 隔离、IDE 细则和安全到校纵切下的本地运行经验
acceptance: [多 worktree 并行开发规则明确, 本地依赖和运行时锁规则可复用, 安全到校纵切经验回填规范]
evidence: [commit:13e1a14, commit:2cc205a, PR#24]
updated_at: 2026-05-21
```

当前状态：单环境一键启动、运行时锁、依赖健康检查和 CI 入口已回填，多 worktree 复杂隔离与后续 IDE 细则继续随工程实践补齐。

### S-QA-03 安全到校纵切实施方案

```ganttmd-task
id: S-QA-03
title: 安全到校纵切实施方案
status: done
dependencies: [S-ATT-01, S-BE-06]
milestone: M5
track: quality_gate
module: safety_attendance
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 复核安全到校纵切实施方案的完成证据，并确认其足以支撑后端和前端最小闭环
acceptance: [纵切方案覆盖登录配置主数据权限和设备事件链路, 异常关闭和审计展示有明确验收路径, 后续后端前端任务能引用该方案继续推进]
evidence: [PR#25, commit:279fce5]
verification: 方案评审会议通过 + 后端 S-BE-09 实现验证
review_status: passed
updated_at: 2026-05-19
```

### S-BE-09 安全到校后端 API 最小闭环

```ganttmd-task
id: S-BE-09
title: 安全到校后端 API 最小闭环
status: done
dependencies: [S-QA-03, S-BE-06]
milestone: M5
track: backend
module: safety_attendance
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 复核安全到校后端 API 最小闭环是否足以作为前端页面最小闭环输入
acceptance: [ATT-ARR-01~11 controller service DTO 已落地, ATT 错误码注册到错误码 registry, e2e 覆盖设备事件到异常关闭和审批回写核心链路]
downstream_constraints: [S-FE-02 前端直接消费本任务的 API 返回格式和错误码, S-STAT-01 统计模块依赖本任务的事实记录结构]
evidence: [PR#27, commit:e5b5411]
verification: pnpm test:e2e ATT-ARR 全部通过 + 错误码 registry 校验通过
review_status: passed
updated_at: 2026-05-22
```

### S-FE-02 安全到校前端页面最小闭环

```ganttmd-task
id: S-FE-02
title: 安全到校前端页面最小闭环
status: todo
dependencies: [S-BE-09, S-QA-13, S-QA-14]
milestone: M5
track: frontend
module: safety_attendance
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 完成安全到校工作台、状态列表、异常详情、关闭表单和模拟设备入口的前端最小闭环
acceptance: [工作台能展示安全到校关键状态, 异常详情和关闭表单可走通, 模拟设备入口能触发最小演示链路]
downstream_constraints: [S-STAT-01 统计视图将复用本任务的前端组件和页面结构]
evidence: []
```

主控判断：这是当前最明确的 M5 下一步。但它是否必须等待 `S-QA-13 / S-QA-14` 完全定稿，需要项目负责人裁决；若只是前端最小闭环，可考虑降低这两个依赖强度。
