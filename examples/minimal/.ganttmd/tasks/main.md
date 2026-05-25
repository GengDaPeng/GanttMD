# Acme Notes 样例任务

Acme Notes 是一个虚构的团队笔记产品。本样例只用于展示 GanttMD 的数据格式、视图和校验能力。

## M1 产品骨架

### SPEC-001 明确笔记 MVP 范围

```ganttmd-task
id: SPEC-001
title: 明确笔记 MVP 范围
kind: task
status: done
dependencies: []
milestone: M1
track: spec
domain: product
priority: P0
source_docs: [source-docs/product.md]
next_action: 已完成 MVP 范围说明
acceptance: [核心用户路径明确, 非目标能力已列出, 后续任务可引用范围边界]
evidence: [source-docs/product.md]
review_status: passed
completed_date: 2026-05-25
```

### DOC-001 建立项目说明入口

```ganttmd-task
id: DOC-001
title: 建立项目说明入口
kind: task
status: done
dependencies: [SPEC-001]
milestone: M1
track: docs
domain: onboarding
priority: P1
source_docs: [source-docs/product.md]
next_action: 已完成 README 和样例说明
acceptance: [README 说明项目用途, 示例文档可被新贡献者找到, 校验命令写清楚]
evidence: [README.md, examples/minimal/README.md]
review_status: passed
completed_date: 2026-05-25
```

### FE-001 搭建应用外壳

```ganttmd-task
id: FE-001
title: 搭建应用外壳
kind: task
status: done
dependencies: [SPEC-001]
milestone: M1
track: frontend
domain: app-shell
priority: P0
source_docs: [source-docs/product.md, source-docs/architecture.md]
next_action: 已完成导航、空状态和基础布局
acceptance: [有主导航, 有空状态, 移动端布局不溢出]
evidence: [web/index.html]
verification: npm test
review_status: passed
completed_date: 2026-05-25
```

### BE-001 搭建笔记 API 骨架

```ganttmd-task
id: BE-001
title: 搭建笔记 API 骨架
kind: task
status: done
dependencies: [SPEC-001]
milestone: M1
track: backend
domain: notes-api
priority: P0
source_docs: [source-docs/architecture.md]
next_action: 已完成 API 路由和最小数据模型
acceptance: [有 notes 列表接口, 有 notes 保存接口, 错误返回结构一致]
evidence: [source-docs/architecture.md]
verification: npm test
review_status: passed
completed_date: 2026-05-25
```

### INFRA-001 配置基础 CI

```ganttmd-task
id: INFRA-001
title: 配置基础 CI
kind: harness
status: done
dependencies: [DOC-001]
milestone: M1
track: infra
domain: ci
priority: P1
source_docs: [source-docs/qa.md]
next_action: 已完成测试与样例校验入口
acceptance: [CI 可安装依赖, 单测可运行, 样例数据可校验]
evidence: [.github/workflows/ci.yml]
verification: npm test && npm run validate -- examples/minimal
review_status: passed
completed_date: 2026-05-25
```

## M2 协作编辑

### FE-002 实现 Markdown 编辑器

```ganttmd-task
id: FE-002
title: 实现 Markdown 编辑器
kind: task
status: in_progress
dependencies: [FE-001]
milestone: M2
track: frontend
domain: editor
priority: P0
owner: frontend-dev
source_docs: [source-docs/product.md, source-docs/architecture.md]
next_action: 完成编辑器工具栏、自动保存提示和草稿状态
acceptance: [支持标题和正文编辑, 自动保存状态可见, 键盘操作不破坏输入]
evidence: []
updated_at: 2026-05-25
downstream_constraints: [不要改变 note 数据结构, 保持移动端布局稳定]
```

```ganttmd-checklist
task_id: FE-002
items:
  - C1 [done] 完成编辑器基础输入 | evidence: web/index.html
  - C2 [in_progress] 补齐自动保存状态
  - C3 [todo] 验证移动端布局
  - C4 [todo] 更新用户指南截图说明
```

### BE-002 实现同步 API

```ganttmd-task
id: BE-002
title: 实现同步 API
kind: task
status: in_progress
dependencies: [BE-001]
milestone: M2
track: backend
domain: sync
priority: P0
owner: backend-dev
source_docs: [source-docs/architecture.md]
next_action: 实现草稿保存、版本号校验和冲突响应
acceptance: [保存接口幂等, 版本冲突返回 409, 错误响应含可读 message]
evidence: []
updated_at: 2026-05-25
downstream_constraints: [保持 409 冲突语义稳定, 不引入外部数据库依赖]
```

```ganttmd-checklist
task_id: BE-002
items:
  - C1 [done] 定义 sync payload | evidence: source-docs/architecture.md
  - C2 [in_progress] 实现版本冲突判断
  - C3 [blocked] 等待 FE-002 确认自动保存字段 | blocker_reason: 前端字段命名尚未稳定
  - C4 [todo] 增加 API 单测
```

### DOC-002 编写用户指南

```ganttmd-task
id: DOC-002
title: 编写用户指南
kind: review
status: review
dependencies: [DOC-001, FE-001]
milestone: M2
track: docs
domain: onboarding
priority: P1
source_docs: [source-docs/product.md]
next_action: 等待产品和支持同事复核是否覆盖首次使用路径
acceptance: [说明创建笔记, 说明编辑笔记, 说明同步状态]
evidence: [examples/minimal/README.md]
review_status: pending
updated_at: 2026-05-25
```

### QA-001 制定回归测试清单

```ganttmd-task
id: QA-001
title: 制定回归测试清单
kind: review
status: review
dependencies: [SPEC-001, INFRA-001]
milestone: M2
track: quality
domain: regression
priority: P1
source_docs: [source-docs/qa.md]
next_action: 复核回归清单是否覆盖编辑、同步、冲突和离线状态
acceptance: [关键路径已列出, 手工验证步骤可执行, 自动化缺口已登记]
evidence: [source-docs/qa.md]
review_status: pending
updated_at: 2026-05-25
```

### FE-003 展示离线提示

```ganttmd-task
id: FE-003
title: 展示离线提示
kind: task
status: todo
dependencies: [FE-002, BE-002]
milestone: M2
track: frontend
domain: resilience
priority: P1
source_docs: [source-docs/product.md, source-docs/architecture.md]
next_action: 等编辑器和同步 API 完成后实现离线横幅和重试按钮
acceptance: [断网时显示提示, 恢复网络后可重试, 不丢失未保存内容]
evidence: []
updated_at: 2026-05-25
```

### BE-003 实现分享链接

```ganttmd-task
id: BE-003
title: 实现分享链接
kind: task
status: todo
dependencies: [BE-002]
milestone: M2
track: backend
domain: sharing
priority: P2
source_docs: [source-docs/product.md, source-docs/architecture.md]
next_action: 在同步 API 稳定后实现只读分享链接
acceptance: [可生成只读链接, 可撤销链接, 未授权访问返回 403]
evidence: []
updated_at: 2026-05-25
```

## M3 发布准备

### QA-002 补齐端到端测试

```ganttmd-task
id: QA-002
title: 补齐端到端测试
kind: harness
status: todo
dependencies: [FE-002, BE-002, QA-001]
milestone: M3
track: quality
domain: e2e
priority: P0
source_docs: [source-docs/qa.md]
next_action: 为创建、编辑、保存冲突和离线恢复补端到端测试
acceptance: [覆盖创建笔记, 覆盖编辑保存, 覆盖冲突提示, 覆盖离线恢复]
evidence: []
updated_at: 2026-05-25
```

### OPS-001 准备发布检查清单

```ganttmd-task
id: OPS-001
title: 准备发布检查清单
kind: task
status: todo
dependencies: [QA-002, INFRA-001, DOC-002]
milestone: M3
track: ops
domain: release
priority: P1
source_docs: [source-docs/qa.md]
next_action: 汇总发布前必须通过的测试、文档和回滚检查
acceptance: [列出发布前检查项, 明确回滚步骤, 明确负责人与截止日期]
evidence: []
updated_at: 2026-05-25
```

### BE-004 增加审计日志

```ganttmd-task
id: BE-004
title: 增加审计日志
kind: task
status: todo
dependencies: [BE-002]
milestone: M3
track: backend
domain: audit
priority: P2
source_docs: [source-docs/architecture.md]
next_action: 为分享链接和笔记修改记录最小审计事件
acceptance: [记录创建分享链接, 记录撤销分享链接, 记录保存冲突]
evidence: []
updated_at: 2026-05-25
```

### FE-004 增加命令面板

```ganttmd-task
id: FE-004
title: 增加命令面板
kind: task
status: todo
dependencies: [FE-002]
milestone: M3
track: frontend
domain: productivity
priority: P3
source_docs: [source-docs/product.md]
next_action: 评估是否需要在首版发布前支持快捷命令
acceptance: [列出候选命令, 确认快捷键不冲突, 与无障碍要求兼容]
evidence: []
updated_at: 2026-05-25
```

## M4 后续增强

### SPEC-002 导入旧笔记格式

```ganttmd-task
id: SPEC-002
title: 导入旧笔记格式
kind: ad_hoc
status: cancelled
dependencies: []
milestone: M4
track: spec
domain: import
priority: P3
source_docs: [source-docs/product.md]
next_action: 已取消，不进入当前路线
acceptance: [取消原因明确, 不阻塞当前版本发布]
evidence: []
resolution: 首版只支持新建笔记，旧格式导入暂不进入路线
closed_at: 2026-05-25
```

### OPS-002 评估托管版部署

```ganttmd-task
id: OPS-002
title: 评估托管版部署
kind: task
status: todo
dependencies: [OPS-001]
milestone: M4
track: ops
domain: hosting
priority: P3
source_docs: [source-docs/architecture.md]
next_action: 发布后评估是否需要托管版部署脚本
acceptance: [列出部署目标, 列出成本和维护风险, 给出是否推进建议]
evidence: []
updated_at: 2026-05-25
```
