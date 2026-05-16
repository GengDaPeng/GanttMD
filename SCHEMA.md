# GanttMD Markdown Schema 规范

本文档定义 GanttMD 中所有 Markdown 文件的格式规范。

## 文件类型

| 类型 | 路径 | 用途 | 数量 |
|------|------|------|------|
| 项目配置 | `config.yaml` | 项目元信息、里程碑、质量门、Agent 配置 | 1 |
| 模块任务文件 | `modules/*.md` | 某个模块的所有任务 | 等于模块数 |
| 里程碑总览 | `milestones/overview.md` | 里程碑路线图和状态 | 1 |
| 时间线数据 | `views/timeline.json` | 解析产物（自动生成） | 1 |

## 1. 模块任务文件格式

### 文件路径

```
.ganttmd/modules/{module-id}.md
```

`module-id` 使用小写英文和连字符，例如：`user-management`、`attendance-system`、`backend-infrastructure`

### Frontmatter

```yaml
---
module: attendance-system              # 模块 ID（必填）
module_name: 考勤系统                   # 模块中文名（必填）
owner: backend-agent                   # 负责的 Agent ID（必填）
created: 2026-05-20                    # 创建日期（必填）
updated: 2026-05-22                    # 最后更新日期（必填）
description: 考勤系统核心功能模块       # 模块描述（可选）
---
```

### 文档结构

```markdown
---
module: {module-id}
module_name: {模块中文名}
owner: {agent-id}
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# {模块中文名}

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
| `status` | enum | 任务状态：backlog / todo / in_progress / review / done / blocked |
| `priority` | enum | 优先级：P0 / P1 / P2 |
| `dependencies` | array | 前置任务 ID 列表（可以是同模块或跨模块） |
| `milestone` | string | 所属里程碑 ID |

#### 可选字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `start_date` | date | 开始日期（status=in_progress 时填写） |
| `due_date` | date | 截止日期 |
| `completed_date` | date | 完成日期（status=done 时填写） |
| `estimate` | string | 预估时间（如 3d、1w、2w） |
| `tags` | array | 标签列表，用于分类和筛选 |
| `blocked_reason` | string | 阻塞原因（仅 status=blocked 时填写） |

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
| backlog | 任务创建 | 人决定排入 todo | 未排入开发计划 |
| todo | backlog 或阻塞解除 | AI Agent 领取 | 等待执行 |
| in_progress | AI Agent 领取 | 完成或阻塞 | 执行中 |
| review | AI Agent 标记完成 | 人确认 | 等待人确认 |
| done | 人或 AI 确认 | 终态 | 已完成 |
| blocked | 前置依赖未满足 | 依赖完成 | 被阻塞 |

### 示例：考勤系统模块

```markdown
---
module: attendance-system
module_name: 考勤系统
owner: backend-agent
created: 2026-05-20
updated: 2026-05-22
---

# 考勤系统模块

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

## 2. 里程碑总览格式

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

## 3. config.yaml 格式

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
  default_view: modules            # 默认视图：modules / milestones / timeline
  show_done_tasks: false           # 是否显示已完成任务
  color_scheme:
    backlog: "#9CA3AF"             # 灰色
    todo: "#3B82F6"                # 蓝色
    in_progress: "#F59E0B"         # 橙色
    review: "#8B5CF6"              # 紫色
    done: "#10B981"                # 绿色
    blocked: "#EF4444"             # 红色
```

## 4. 跨模块依赖引用

### 引用格式

在任务的 `dependencies` 字段中直接使用任务 ID：

```yaml
dependencies: [S-ATT-01, S-PRM-02]
```

- `S-ATT-01`：同模块任务
- `S-PRM-02`：跨模块任务（权限系统模块）

### 解析规则

1. 解析器扫描所有 `modules/*.md` 文件
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

## 5. 文件命名规范

### 模块文件

- 路径：`modules/{module-id}.md`
- 命名规则：小写英文 + 连字符
- 示例：`user-management.md`、`attendance-system.md`

### 里程碑文件

- 路径：`milestones/overview.md`
- 固定文件名

### 配置文件

- 路径：`config.yaml`
- 固定文件名

## 6. 格式验证规则

### 必须满足

1. 每个任务必须有唯一 ID
2. 依赖的任务 ID 必须存在
3. 状态转换必须合法（不能从 done 回到 todo）
4. 完成的任务必须有 completed_date
5. 进行中的任务必须有 start_date
6. 阻塞的任务必须有 blocked_reason

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
