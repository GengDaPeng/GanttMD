# 后端工程主线

本文件从 `source-docs/00-项目总控执行待办.md` 和 `source-docs/00-项目总控看板.md` 抽取少量任务，用于验证 GanttMD 的模块文件 + YAML fenced block 格式。

### S-BE-01 后端工程骨架专项设计

```ganttmd-task
id: S-BE-01
title: 后端工程骨架专项设计
status: done
dependencies: []
milestone: M2
source: source-docs/00-项目总控执行待办.md
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 继续补齐前端、契约和业务 API 测试细则，并把规则回填到测试规范文档
acceptance: [测试分层规则覆盖后端前端契约和业务 API, 明确 AI 生成测试的审查要求, 在规范中标出后续随实现补齐的清单]
owner: 待确认
evidence: []
```

完成标准：明确后端目录、NestJS 模块分层、`api / worker` 入口、Prisma / PostgreSQL、Redis / BullMQ、MinIO、本地启动、测试和 CI 插槽。

### S-BE-02 数据库迁移与发布规范专项

```ganttmd-task
id: S-BE-02
title: 数据库迁移与发布规范专项
status: done
dependencies: [S-BE-01]
milestone: M2
source: source-docs/00-项目总控执行待办.md
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 基于后端 API 和测试规范，完成安全到校工作台、列表、异常关闭和模拟设备入口的前端最小闭环
acceptance: [工作台能展示安全到校关键状态, 异常详情和关闭表单可走通, 模拟设备入口能触发最小演示链路]
evidence: []
```

完成标准：明确 Prisma / PostgreSQL 接入边界、schema 组织、migration 命名、发布、回滚、seed 和 AI 生成迁移审查规则。

### S-BE-03 创建后端工程基础结构

```ganttmd-task
id: S-BE-03
title: 创建后端工程基础结构
status: done
dependencies: [S-BE-01]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

完成标准：后端目录、包管理、`api / worker` 启动入口、基础配置、健康检查端点和最小测试入口可运行。

### S-BE-04 建立 Prisma 与数据库迁移跑道

```ganttmd-task
id: S-BE-04
title: 建立 Prisma 与数据库迁移跑道
status: done
dependencies: [S-BE-02]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

完成标准：Prisma schema、首个 migration、seed 入口和集成测试跑道可用。

### S-BE-05 建立 Redis / BullMQ / MinIO 本地依赖

```ganttmd-task
id: S-BE-05
title: 建立 Redis / BullMQ / MinIO 本地依赖
status: done
dependencies: [S-BE-03]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

完成标准：Redis、BullMQ、MinIO 本地依赖可启动，后端能连接并通过健康检查暴露依赖状态。

### S-BE-06 建立本地一键启动与基础 CI

```ganttmd-task
id: S-BE-06
title: 建立本地一键启动与基础 CI
status: done
dependencies: [S-BE-03, S-BE-04, S-BE-05]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

完成标准：本地开发命令可启动必要服务，CI 覆盖基础 install / generate / validate / test / build 检查入口。

### S-QA-13 测试规范骨架与定稿

```ganttmd-task
id: S-QA-13
title: 测试规范骨架与定稿
status: in_progress
dependencies: [S-BE-03, S-BE-04, S-BE-05, S-BE-06]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

当前状态：骨架与后端工程跑道回填已完成，前端、契约和后续业务 API 测试细则随实现继续补齐。

### S-QA-14 本地开发环境规范骨架与定稿

```ganttmd-task
id: S-QA-14
title: 本地开发环境规范骨架与定稿
status: in_progress
dependencies: [S-BE-05, S-BE-06]
milestone: M2
source: source-docs/00-项目总控执行待办.md
```

当前状态：单环境一键启动、运行时锁、依赖健康检查和 CI 入口已回填，多 worktree 复杂隔离与后续 IDE 细则继续随工程实践补齐。

### S-FE-02 安全到校前端页面最小闭环

```ganttmd-task
id: S-FE-02
title: 安全到校前端页面最小闭环
status: todo
dependencies: [S-BE-09, S-QA-13, S-QA-14]
milestone: M5
source: source-docs/00-项目总控执行待办.md
```

目标页面：工作台、状态列表、异常详情、关闭表单和模拟设备入口。
