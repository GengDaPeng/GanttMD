# GanttMD Markdown Schema 规范

本文档定义 GanttMD 中所有 Markdown 文件的格式规范。

## 文件类型

| 类型 | 路径 | 用途 | 数量 |
|------|------|------|------|
| 项目配置 | `config.yaml` | 项目元信息、里程碑、质量门、Agent 配置 | 1 |
| 任务文件 | `tasks/*.md` | 任务状态真相源，文件只表达维护便利 | 1 个或多个 |
| 旧任务文件 | `modules/*.md` | 兼容旧项目；新项目不推荐 | 0 个或多个 |
| Follow-up 清单 | `followups.md` | Agent 留下的后续事项、PR 审查尾项和主控清理结论 | 1 |
| 里程碑总览 | `milestones/overview.md` | 里程碑路线图和状态 | 1 |
| 时间线数据 | `views/timeline.json` | 解析产物（自动生成） | 1 |

## 1. 任务文件格式

### 文件路径

```
.ganttmd/tasks/{task-file-id}.md
```

`task-file-id` 使用小写英文和连字符，例如：`active`、`backend`、`crosscutting`、`workflow`。

`modules/*.md` 仍可读取，但只是兼容旧项目。新项目应使用 `tasks/*.md`。

### Frontmatter

```yaml
---
task_file: backend                     # 任务文件 ID（可选）
title: 后端任务                         # 文件标题（可选）
owner: backend-agent                   # 负责的 Agent ID（必填）
created: 2026-05-20                    # 创建日期（必填）
updated: 2026-05-22                    # 最后更新日期（必填）
description: 后端主线相关任务           # 文件描述（可选）
---
```

### 文档结构

```markdown
---
task_file: {task-file-id}
title: {文件标题}
owner: {agent-id}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# {文件标题}

## {里程碑 ID} 阶段任务

### Task: {任务 ID}
- title: {任务标题}
- status: {状态}
- priority: {优先级}
- dependencies: [{依赖任务 ID 列表}]
- milestone: {里程碑 ID}
- start_date: {YYYY-MM-DD 或 null}
- due_date: {YYYY-MM-DD 或 null}
- completed_date: {YYYY-MM-DD 或 null}
- estimate: {预估时间，如 3d、1w}
- tags: [{标签列表}]
- blocked_reason: {阻塞原因，仅 status=blocked 时填写}

### Task: {任务 ID}
...
```

### 字段说明

#### 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 任务标题，简洁明了 |
| `kind` | enum | 任务类型：task / bugfix / ad_hoc / review / harness；未填写时按 task 理解 |
| `status` | enum | 任务源状态：todo / in_progress / review / done / cancelled |
| `priority` | enum | 优先级：P0 / P1 / P2 / P3 |
| `dependencies` | array | 前置任务 ID 列表 |
| `milestone` | string | 所属里程碑 ID |
| `track` | string | 工作主线：spec / backend / frontend / infra / quality / docs / ops |
| `domain` | string | 业务域或能力域：student / approval / safety_attendance / notification / auth 等 |

#### 可选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `start_date` | date | 开始日期（status=in_progress 时填写） |
| `due_date` | date | 截止日期 |
| `completed_date` | date | 完成日期（status=done 时填写） |
| `closed_at` | date | 终态关闭日期，适用于 done / cancelled 的统一归档判断 |
| `cancelled_at` | date | 取消日期；如果已填写 closed_at，可不填 |
| `estimate` | string | 预估时间（如 3d、1w、2w） |
| `tags` | array | 标签列表，用于分类和筛选 |
| `blocked_reason` | string | 阻塞原因（仅 status=blocked 时填写） |
| `source_docs` | array | 来源正式文档路径或章节 |
| `next_action` | string | 当前下一步动作 |
| `acceptance` | array | 任务级完成边界摘要 |
| `evidence` | array | 完成证据，如 PR、commit、文档章节、截图 |
| `verification` | string | 测试命令、CI、手工验证或未验证原因 |
| `review_status` | enum | pending / passed / must_fix / deferred |
| `updated_at` | date | 最后更新日期 |
| `owner` | string | 当前责任人或主控角色 |
| `agent` | string | 当前实际执行 Agent |

### 任务 ID 规范

- 格式：`{模块缩写}-{序号}`
- 示例：`S-BE-01`、`S-ATT-02`、`S-PRM-01`
- 规则：
  - 全局唯一
  - 一旦分配，永不重复使用
  - 建议使用模块缩写前缀（如 BE=后端基础设施，ATT=考勤，PRM=权限）

### 状态说明

| 状态 | 进入条件 | 退出条件 | 说明 |
|------|----------|----------|------|
| todo | 任务创建或阻塞解除 | AI Agent 领取 | 等待执行 |
| in_progress | AI Agent 领取 | 完成或阻塞 | 执行中 |
| review | AI Agent 标记完成 | 人确认 | 等待人确认 |
| done | 人或复核通过 | 终态 | 已真实闭环，必须有 evidence |
| cancelled | 主控明确不做 | 终态 | 已取消，必须有取消原因或 resolution |

`blocked` 默认是派生状态：当任务仍有未完成前置依赖，或存在 `blocked_reason` 时，看板可显示为被阻塞。若团队显式写 `status: blocked`，必须填写 `blocked_reason`，否则 health check 应提示异常。

`accepted_deferred` 不属于任务执行状态。延期接受、等待复查、用户裁决等治理决策应写入 `.ganttmd/followups.md`，例如 `kind: deferred` 或 `kind: decision`，并通过 `next_review_at` 复查。

### kind

`kind` 用于表达任务来源或执行形态，不替代 `status`。

| kind | 说明 |
|------|------|
| task | 常规计划内任务；未填写时按 task 理解 |
| bugfix | 缺陷修复 |
| ad_hoc | 计划外临时任务，需要补来源和原因 |
| review | 复核、审查或确认任务 |
| harness | 工具、脚手架、AI 工作流或测试夹具任务 |

非法 `kind` 应由 validator 提示。计划外工作不要只留在聊天里，应登记为 `kind: ad_hoc` 或 `kind: bugfix` 的正式任务，或先进入 follow-up 等待主控转换。

### owner 与 agent

`status: in_progress` 的任务应填写 `owner` 或 `agent`，避免多 Agent 同时接手。

- `owner` 表示责任角色或任务主控。
- `agent` 表示当前实际执行代理。
- 如果两者同时存在且不一致，validator 会提示潜在协作冲突。

### track 与 domain

`track` 和 `domain` 必须拆开：

- `track` 表达工作主线，建议先使用 `spec / backend / frontend / infra / quality / docs / ops`。
- `domain` 表达业务域或能力域，例如 `student / class / teacher / approval / settings / org_permission / safety_attendance / notification / auth`。
- 旧字段 `module` 作为 `domain` 的兼容别名。新任务应写 `domain`。
- 旧主线值 `quality_gate` 作为 `quality` 的兼容别名。新任务应写 `quality`。

示例：

```yaml
id: S-BE-09
title: 安全到校后端 API 最小闭环
track: backend
domain: safety_attendance
```

这样可以同时回答“后端工程主线进展如何”和“安全考勤模块进展如何”。

### evidence 与 verification

`done` 任务必须具备可追溯证据。证据要求按任务类型区分：

| 任务类型 | 必须 evidence | 建议 evidence |
| --- | --- | --- |
| 代码实现 | PR 或 commit | verification / review_status |
| 工程配置 | commit 或配置文件路径 | verification |
| 规格/设计文档 | 正式文档章节 | review_status |
| 调研/裁决 | decision 记录 | source_docs |

health check 至少应提示：

- `done` 无 `evidence`。
- `track: backend / frontend / infra` 的 `done` 任务无 `verification`。
- `review` 无 `review_status`。
- `cancelled` 无取消原因。

### 归档

`done` 和 `cancelled` 不应直接删除。长期关闭任务应归档到历史文件，便于回查和恢复。

当前 validator 只提示可归档，不自动移动文件：

- `done` 优先使用 `completed_date` 判断关闭时间。
- `cancelled` 优先使用 `closed_at` 或 `cancelled_at` 判断关闭时间。
- 默认超过 30 天会提示“可归档”。

未来如提供 `ganttmd archive` 命令，必须采用显式执行方式，不应在 `validate` 中产生写文件副作用。

### 示例：考勤任务文件

```markdown
---
task_file: attendance
title: 考勤任务
owner: backend-agent
created: 2026-05-20
updated: 2026-05-22
---

# 考勤任务

## M2 阶段任务

### Task: S-ATT-01
- title: 考勤系统架构设计
- status: done
- priority: P0
- dependencies: []
- milestone: M2
- start_date: 2026-05-20
- completed_date: 2026-05-24
- estimate: 5d
- tags: [architecture]

### Task: S-ATT-02
- title: 考勤核心数据模型
- status: in_progress
- priority: P0
- dependencies: [S-ATT-01]
- milestone: M3
- start_date: 2026-05-25
- due_date: 2026-05-28
- completed_date: null
- estimate: 3d
- tags: [database]

## M3 阶段任务

### Task: S-ATT-03
- title: 考勤 API 接口
- status: todo
- priority: P1
- dependencies: [S-ATT-02, S-PRM-02]
- milestone: M3
- start_date: null
- due_date: null
- completed_date: null
- estimate: 5d
- tags: [api]

### Task: S-ATT-04
- title: 设备事件处理
- status: blocked
- priority: P1
- dependencies: [S-DEV-01]
- milestone: M3
- start_date: null
- due_date: null
- completed_date: null
- estimate: 3d
- tags: [device]
- blocked_reason: 等待设备集成模块完成 SDK 封装
```

## 2. Follow-up 清单格式

### 文件路径

```
.ganttmd/followups.md
```

Follow-up 清单用于承接 Agent 在实现、审查、总结或 PR 评论中留下的后续事项。没有登记到本文件的 follow-up，不视为进入项目跟踪。

### 文档结构

每个 follow-up 使用一个 fenced code block，语言名固定为 `ganttmd-followup`：

````markdown
### FUP-001 安全到校 queryStatuses 后续优化

```ganttmd-followup
id: FUP-001
title: 安全到校 queryStatuses 后续优化
status: open
source_type: pr_review
source_pr: PR#27
source_rr: RR-003
source_comment: https://example.com/review-comment
source_commit: abcdef1
source_task: S-BE-09
created_by: codex
created_at: 2026-05-22
reason: 当前后端实现使用内存分页，后续应评估 SQL UNION 或日状态投影表替换
suggestion: M5 验收前由项目主控判断是否转正式任务
severity: medium
owner: project-control
target_milestone: M5
resolution:
converted_task:
```
````

### 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Follow-up ID，全局唯一，建议使用 `FUP-001` |
| `title` | string | 后续事项标题 |
| `status` | enum | 状态：open / accepted / converted / done / wontfix |
| `source_type` | enum | 来源类型：pr_review / task / discussion / user / ci |
| `created_by` | string | 登记者 |
| `created_at` | date | 登记日期 |
| `reason` | string | 为什么留下该事项 |
| `suggestion` | string | 建议主控如何处理 |
| `severity` | enum | 严重度：high / medium / low |

### 来源字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `source_task` | string | 来源任务 ID，来自任务执行时填写 |
| `source_pr` | string | 来源 PR，例如 `PR#27` |
| `source_rr` | string | 来源 review record，例如 `RR-003` |
| `source_comment` | string | 来源评论链接或评论 ID |
| `source_commit` | string | 来源提交 hash |

当 `source_type: pr_review` 时，`source_pr` 和 `source_rr` 必填；否则无法从 PR 审查结论追溯到原始 follow-up。

### kind 字段

`kind` 用于区分 follow-up 的治理类型。未填写时默认为普通 follow-up。

| kind | 含义 | 典型字段 |
|------|------|----------|
| `followup` | 普通后续事项 | `reason` / `suggestion` |
| `decision` | 等待用户或主控裁决 | `decision_owner` / `next_review_at` |
| `deferred` | 已接受延期，等待复查 | `accepted_by` / `decision` / `next_review_at` |
| `external_wait` | 等待外部资料或第三方反馈 | `source_comment` / `next_review_at` |
| `risk` | 高风险事项 | `severity: high` / `target_milestone` |

用户裁决项不单独新增真相源，优先写为：

```yaml
kind: decision
decision_owner: user
status: open
```

延期接受项不写入任务 `status`，优先写为：

```yaml
kind: deferred
status: accepted
next_review_at: 2026-06-10
decision: 主控接受延期，M5 验收前复查
```

### 状态说明

| 状态 | 含义 | 必填补充字段 | 设置权限 |
|------|------|--------------|----------|
| `open` | 已登记，等待主控清理 | 无 | 所有 Agent 可新增 |
| `accepted` | 主控确认要处理，但尚未转正式任务 | `accepted_by` / `accepted_at` / `next_review_at` / `decision` | 仅项目主控 |
| `converted` | 已转为 `.ganttmd/tasks/*.md` 正式任务 | `converted_task` / `resolution` | 仅项目主控 |
| `done` | 已处理完成，不需要转正式任务 | `resolution` | 仅项目主控 |
| `wontfix` | 明确不做，保留原因 | `resolution` | 仅项目主控 |

未知 `status` 视为非法数据，看板必须展示为 invalid，不能静默忽略。

### 权限规则

- 普通 Agent 只能追加新的 `status: open` 条目。
- 普通 Agent 如需补充已有 follow-up，只能追加 `comment` 或 `evidence` 子项，不得修改原字段。
- 普通 Agent 不得删除、关闭、合并、转正式任务或修改 `resolution`。
- 项目主控可以清理、关闭、合并、转正式任务、修改状态和填写 `resolution`。

### 转正式任务规则

转正式任务时必须同时更新 follow-up 和任务文件：

```yaml
status: converted
converted_task: S-XXX-01
resolution: 已转为正式任务 S-XXX-01
```

`converted_task` 不应与 `source_task` 表达同一件事；如果来自 PR 审查，应优先用 `source_pr` / `source_rr` 标记来源，再把新建任务写入 `converted_task`。

## 3. 里程碑总览格式

### 文件路径

```
.ganttmd/milestones/overview.md
```

### Frontmatter

```yaml
---
project: 教务系统
updated: 2026-05-22
---
```

### 文档结构

```markdown
---
project: {项目名称}
updated: {YYYY-MM-DD}
---

# 里程碑总览

## 里程碑路线图

| ID | 名称 | 状态 | 开始日期 | 完成日期 | 依赖 | 完成标准 |
|----|------|------|----------|----------|------|----------|
| M0 | {名称} | done | {YYYY-MM-DD} | {YYYY-MM-DD} | — | {标准描述} |
| M1 | {名称} | in_progress | {YYYY-MM-DD} | — | M0 | {标准描述} |
| M2 | {名称} | backlog | — | — | M1 | {标准描述} |

## 当前全局位置

```text
M0 已完成
→ M1 已完成
→ M2 进行中
→ M3 待启动
```

## 里程碑详情

### M0: {名称}

**状态：** done

**完成标准：**
- 标准 1
- 标准 2

**完成日期：** 2026-05-10

**关键产出：**
- 产出 1
- 产出 2

### M1: {名称}
...
```

### 里程碑状态说明

| 状态 | 含义 |
|------|------|
| backlog | 未启动 |
| in_progress | 进行中 |
| done | 已完成 |
| blocked | 被阻塞 |
| cancelled | 已取消 |

## 4. config.yaml 格式

### 文件路径

```
.ganttmd/config.yaml
```

### 完整示例

```yaml
# 项目元信息
project:
  name: 教务系统
  description: 全站教务管理系统
  created: 2026-05-10
  owner: solo-developer
  version: 0.1.0

# V4 视图开关
views:
  enabled: [execution, milestone, module, risk, followup]
  default: execution

# 里程碑定义
milestones:
  - id: M0
    name: 顶层基线与文档治理成型
    status: done
    completed_date: 2026-05-10
    description: 核心文档体系建立

  - id: M1
    name: 核心模块规格首轮收敛
    status: done
    completed_date: 2026-05-14
    description: 核心模块规格完成

  - id: M2
    name: 工程跑道建立
    status: in_progress
    start_date: 2026-05-15
    description: 后端骨架、数据库迁移、CI/CD 建立

  - id: M3
    name: 系统底座最小实现
    status: backlog
    description: 核心模块最小 API 可运行

  - id: M4
    name: 主数据最小闭环
    status: backlog
    description: 学生、班级、教师、归班、责任关系

  - id: M5
    name: 安全到校第一条纵切
    status: backlog
    description: 登录到审计的完整闭环

# 质量门定义
quality_gates:
  - id: QG-01
    name: 后端工程门
    milestone: M2
    criteria: "至少具备后端骨架、迁移发布规范、测试、队列、对象存储、本地启动"
    status: not_passed

  - id: QG-02
    name: 前端工程门
    milestone: M2
    criteria: "路由、菜单权限、API client、错误码消费、页面范式有统一设计"
    status: not_passed

  - id: QG-03
    name: 接口契约门
    milestone: M2
    criteria: "统一响应、错误码分类、异常映射、分页、幂等有硬约束"
    status: not_passed

# Agent 定义
agents:
  - id: backend-agent
    name: 后端开发 Agent
    modules:
      - user-management
      - permission-system
      - attendance-system
      - backend-infrastructure
      - notification-engine

  - id: frontend-agent
    name: 前端开发 Agent
    modules:
      - frontend-framework
      - course-management

  - id: infra-agent
    name: 基础设施 Agent
    modules:
      - backend-infrastructure
      - device-integration

# 解析配置
parse:
  watch: true                      # 是否监听文件变化
  watch_interval: 5                # 文件变化检测间隔（秒）
  output_dir: views                # 输出目录
  output_file: timeline.json       # 输出文件名

# 可视化配置
visualization:
  theme: light                     # 主题：light / dark
  default_view: execution          # 默认视图：execution / milestone / track / module / risk / followup
  show_done_tasks: false           # 是否显示已完成任务
  color_scheme:
    backlog: "#9CA3AF"             # 灰色
    todo: "#3B82F6"                # 蓝色
    in_progress: "#F59E0B"         # 橙色
    review: "#8B5CF6"              # 紫色
    done: "#10B981"                # 绿色
    blocked: "#EF4444"             # 红色
```

### views 配置

V4 只开放视图开关，不开放完整 `filter / group_by / sort_by` DSL。

```yaml
views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | array | 启用哪些内置视图 |
| `default` | string | 打开页面后默认进入哪个视图 |

当前内置视图：

| 视图 ID | 说明 |
|---------|------|
| `execution` | 执行视角，按可执行、进行中、阻塞、已完成组织任务 |
| `milestone` | 里程碑视角，按里程碑组织任务 |
| `track` | 主线视角，按 `track` 组织任务 |
| `module` | 领域视角，按 `domain` 组织任务；视图 ID 暂保留为 `module` 以兼容旧配置 |
| `risk` | 风险视角，聚合阻塞任务、未清理 Follow-up、非法 Follow-up 和严重健康检查 |
| `followup` | Follow-up 视角，按 Follow-up 状态组织后续事项 |

约束：

- `enabled` 只能引用内置视图 ID。
- `default` 必须存在于 `enabled` 中；否则页面回退到第一个可用视图。
- V4 不支持项目自定义 `filter / group_by / sort_by / fields`。
- 视图只是只读投影，不是任务真相源。

## 5. 跨模块依赖引用

### 引用格式

在任务的 `dependencies` 字段中直接使用任务 ID：

```yaml
dependencies: [S-ATT-01, S-PRM-02]
```

- `S-ATT-01`：同领域任务
- `S-PRM-02`：跨领域任务（权限能力域）

### 解析规则

1. 解析器扫描所有 `tasks/*.md` 文件，并兼容扫描旧的 `modules/*.md`
2. 构建全局任务 ID 索引
3. 解析依赖关系时，通过 ID 查找目标任务
4. 如果找不到目标任务，报告错误

### 命名建议

建议使用模块缩写作为任务 ID 前缀：

| 模块 | 缩写 | 示例 |
|------|------|------|
| 后端基础设施 | BE | S-BE-01 |
| 权限系统 | PRM | S-PRM-01 |
| 考勤系统 | ATT | S-ATT-01 |
| 通知引擎 | NTI | S-NTI-01 |
| 设备集成 | DEV | S-DEV-01 |
| 前端框架 | FE | S-FE-01 |
| 用户管理 | USR | S-USR-01 |
| 课程管理 | CRS | S-CRS-01 |

## 6. 文件命名规范

### 任务文件

- 路径：`tasks/{task-file-id}.md`
- 命名规则：小写英文 + 连字符
- 示例：`active.md`、`backend.md`、`crosscutting.md`

### 里程碑文件

- 路径：`milestones/overview.md`
- 固定文件名

### Follow-up 文件

- 路径：`followups.md`
- 固定文件名

### 配置文件

- 路径：`config.yaml`
- 固定文件名

## 7. 格式验证规则

### 必须满足

1. 每个任务必须有唯一 ID
2. 依赖的任务 ID 必须存在
3. 状态转换必须合法（不能从 done 回到 todo）
4. 完成的任务必须有 completed_date
5. 进行中的任务必须有 start_date
6. 阻塞的任务必须有 blocked_reason
7. `followups.md` 中的 `source_type: pr_review` 必须有 `source_pr` 和 `source_rr`
8. `status: accepted` 的 follow-up 必须有 `accepted_by`、`accepted_at`、`next_review_at` 和 `decision`

### 警告（不阻止解析）

1. 任务没有 estimate 字段
2. 任务没有 tags 字段
3. 里程碑没有 description
4. 质量门没有 criteria

### 错误（阻止解析）

1. 任务 ID 重复
2. 依赖的任务 ID 不存在
3. 依赖循环
4. Frontmatter 缺少必填字段
5. 状态值无效
