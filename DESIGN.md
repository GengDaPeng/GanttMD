# GanttMD

Markdown-native 项目进度管理工具，面向 AI Agent 开发场景。

## 设计意图

解决 AI solo 开发者在复杂项目中的三个核心痛点：

1. **看板太重**：现有 markdown 看板需要人驱动更新，AI 不会主动维护
2. **全局不可见**：人无法一眼看清项目整体进度和依赖关系
3. **Agent 不知道该做什么**：AI 不会自动检查依赖关系、领取可执行任务

## 核心理念

- **Markdown 是唯一的真相源**（single source of truth）
- **AI Agent 只读写 Markdown**，不需要学习新工具
- **可视化层是只读的**，不修改底层数据
- **完全自主可控**，不依赖外部 SaaS
- **Git 版本控制天然支持**，每次变更留痕

## 系统架构

```
┌─────────────────────────────────────────┐
│            前端可视化层                    │
│    Timeline/Gantt 视图（只读）             │
│    依赖关系、里程碑、质量门                 │
└──────────────┬──────────────────────────┘
               │ 读取
┌──────────────┴──────────────────────────┐
│         解析层（Python 脚本）              │
│    Markdown → JSON 结构化数据             │
│    依赖关系解析、状态聚合、循环检测         │
└──────────────┬──────────────────────────┘
               │ 读写
┌──────────────┴──────────────────────────┐
│         Markdown 数据层                   │
│    模块任务文件、里程碑、配置文件           │
│    AI Agent 直接操作这一层                │
└─────────────────────────────────────────┘
```

## 文件组织

```
.ganttmd/
├── config.yaml                          # 项目配置（里程碑、质量门、元信息）
├── modules/
│   ├── user-management.md               # 用户管理模块（所有任务）
│   ├── permission-system.md             # 权限系统模块
│   ├── course-management.md             # 课程管理模块
│   ├── attendance-system.md             # 考勤系统模块
│   ├── notification-engine.md           # 通知引擎模块
│   ├── device-integration.md            # 设备集成模块
│   ├── backend-infrastructure.md        # 后端基础设施
│   ├── frontend-framework.md            # 前端框架
│   ├── data-analytics.md                # 数据分析模块
│   └── ...                              # 按需添加
├── milestones/
│   └── overview.md                      # 里程碑总览（单文件）
├── views/
│   └── timeline.json                    # 解析产物（自动生成）
└── index.html                           # 可视化页面
```

**设计原则：**
- 文件数量 = 模块数量（10-30 个，完全可控）
- 每个模块的所有任务在一个文件内
- AI Agent 只需操作对应模块的文件
- 跨模块依赖用任务 ID 引用

## Markdown 任务格式

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
- status: done                    # backlog | todo | in_progress | review | done | blocked
- priority: P0                    # P0 | P1 | P2
- dependencies: []                # 前置任务 ID 列表
- milestone: M2
- start_date: 2026-05-20
- due_date: 2026-05-25
- completed_date: 2026-05-24
- estimate: 5d
- tags: [architecture, backend]

## M3 阶段任务

### Task: S-ATT-02
- title: 考勤核心数据模型
- status: todo
- priority: P1
- dependencies: [S-ATT-01]       # 依赖同模块任务
- milestone: M3
- start_date: null
- due_date: null
- completed_date: null
- estimate: 3d

### Task: S-ATT-03
- title: 考勤 API 接口
- status: todo
- priority: P1
- dependencies: [S-ATT-01, S-PRM-02]  # 跨模块依赖（权限系统模块）
- milestone: M3
```

**任务状态说明：**

| 状态 | 进入条件 | 退出条件 |
|------|----------|----------|
| backlog | 任务创建 | 人决定排入 todo |
| todo | backlog 或阻塞解除 | AI Agent 领取 → in_progress |
| in_progress | AI Agent 领取 | 完成 → done，或阻塞 → blocked |
| review | AI Agent 标记完成，等待人确认 | 人确认 → done，或打回 → in_progress |
| done | 人或 AI 确认完成 | 终态，不可回退 |
| blocked | 前置依赖未满足 | 依赖完成 → todo |

## config.yaml 格式

```yaml
project:
  name: 教务系统
  description: 全站教务管理系统
  created: 2026-05-10
  owner: solo-developer

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

agents:
  - id: backend-agent
    name: 后端开发 Agent
    modules: [user-management, permission-system, attendance-system, backend-infrastructure]

  - id: frontend-agent
    name: 前端开发 Agent
    modules: [frontend-framework, course-management]

  - id: infra-agent
    name: 基础设施 Agent
    modules: [backend-infrastructure]
```

## milestones/overview.md 格式

```markdown
---
project: 教务系统
updated: 2026-05-22
---

# 里程碑总览

## 里程碑路线图

| ID | 名称 | 状态 | 开始日期 | 完成日期 | 依赖 | 完成标准 |
|----|------|------|----------|----------|------|----------|
| M0 | 顶层基线与文档治理成型 | done | 2026-05-10 | 2026-05-10 | — | 核心文档体系建立 |
| M1 | 核心模块规格首轮收敛 | done | 2026-05-10 | 2026-05-14 | M0 | 核心模块规格完成 |
| M2 | 工程跑道建立 | in_progress | 2026-05-15 | — | M1 | 后端骨架、CI、数据库迁移 |
| M3 | 系统底座最小实现 | backlog | — | — | M2 | 核心模块最小 API |
| M4 | 主数据最小闭环 | backlog | — | — | M3 | 学生/班级/教师 API |
| M5 | 安全到校第一条纵切 | backlog | — | — | M4 | 端到端闭环验证 |

## 当前全局位置

```text
M0 已完成
→ M1 已完成
→ M2 进行中（工程跑道建立）
→ M3 待启动
```
```

## 解析脚本设计

### 输入

- 扫描 `modules/*.md` 和 `milestones/overview.md`
- 解析 Markdown frontmatter 和任务列表

### 处理

1. **任务提取**：从每个模块文件中提取所有 Task 项
2. **依赖图构建**：构建全局任务依赖图
3. **循环检测**：检测依赖循环，报告错误
4. **状态聚合**：计算每个模块和里程碑的完成度
5. **blocked 状态计算**：如果依赖未完成，自动标记 blocked

### 输出

生成 `views/timeline.json`：

```json
{
  "project": "教务系统",
  "updated": "2026-05-22T10:30:00Z",
  "milestones": [
    {
      "id": "M2",
      "name": "工程跑道建立",
      "status": "in_progress",
      "progress": 0.35,
      "start_date": "2026-05-15",
      "due_date": null
    }
  ],
  "modules": [
    {
      "id": "backend-infrastructure",
      "name": "后端基础设施",
      "owner": "backend-agent",
      "tasks": [
        {
          "id": "S-BE-01",
          "title": "后端工程骨架搭建",
          "status": "done",
          "priority": "P0",
          "dependencies": [],
          "milestone": "M2",
          "start_date": "2026-05-15",
          "completed_date": "2026-05-20",
          "progress": 1.0
        }
      ],
      "progress": 0.4
    }
  ],
  "dependencies": {
    "S-ATT-02": ["S-ATT-01"],
    "S-ATT-03": ["S-ATT-01", "S-PRM-02"]
  },
  "quality_gates": [
    {
      "id": "QG-01",
      "name": "后端工程门",
      "milestone": "M2",
      "status": "not_passed",
      "criteria": "至少具备后端骨架、迁移发布规范、测试、队列、对象存储、本地启动"
    }
  ]
}
```

### 运行方式

```bash
# 手动运行
python ganttmd parse

# 监听文件变化（开发模式）
python ganttmd watch

# 输出静态页面
python ganttmd build
```

## AI Agent 操作规范

### 标准操作

以下操作应在 AGENTS.md 中定义，AI Agent 执行任务时必须遵循：

**1. 查找可执行任务**

```python
def find_executable_tasks(module_file):
    """查找模块中可执行的任务（status=todo 且 dependencies 已满足）"""
    # 1. 解析模块文件
    # 2. 过滤 status=todo 的任务
    # 3. 检查每个任务的 dependencies 是否全部 done
    # 4. 返回可执行任务列表
```

**2. 领取任务**

```python
def claim_task(module_file, task_id):
    """领取任务：status → in_progress"""
    # 1. 修改 status: in_progress
    # 2. 写入 start_date: today
    # 3. 更新 updated 时间
```

**3. 完成任务**

```python
def complete_task(module_file, task_id):
    """完成任务：status → done"""
    # 1. 修改 status: done
    # 2. 写入 completed_date: today
    # 3. 更新 updated 时间
```

**4. 阻塞任务**

```python
def block_task(module_file, task_id, reason):
    """阻塞任务：status → blocked"""
    # 1. 修改 status: blocked
    # 2. 添加 blocked_reason 字段
    # 3. 更新 updated 时间
```

### 任务领取流程

```text
1. AI Agent 启动
2. 读取 config.yaml，获取负责的模块列表
3. 扫描对应模块文件，查找可执行任务
4. 按优先级领取任务（P0 > P1 > P2）
5. 执行任务
6. 完成后更新 Markdown
7. 回到步骤 3
```

## 前端可视化设计（MVP）

### 功能

1. **模块视图**：按模块分组展示任务
2. **里程碑视图**：按里程碑聚合进度
3. **依赖关系**：任务间依赖连线
4. **状态颜色**：
   - 灰色：backlog
   - 蓝色：todo
   - 橙色：in_progress
   - 紫色：review
   - 绿色：done
   - 红色：blocked
5. **里程碑标记**：时间轴上的关键节点
6. **质量门标记**：质量门状态展示
7. **筛选功能**：按模块、状态、优先级筛选

### 技术选型

- **前端**：HTML + JavaScript + CSS
- **甘特图库**：frappe-gantt 或 dhtmlxGantt（待评估）
- **数据源**：timeline.json（只读）
- **部署**：本地静态页面，无需服务器

### 界面布局

```
┌─────────────────────────────────────────────────────────┐
│  项目名称    里程碑进度    模块筛选    状态筛选            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  里程碑时间轴                                      │   │
│  │  [M0]──[M1]──[M2 进行中]──[M3]──[M4]──[M5]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  模块视图                                         │   │
│  │  ├── 后端基础设施 (40%)                          │   │
│  │  │   ├── S-BE-01 ✓ 完成                         │   │
│  │  │   ├── S-BE-02 ⏳ 进行中                       │   │
│  │  │   ├── S-BE-03 ⬜ 待做                         │   │
│  │  │   └── S-BE-04 ⬜ 待做                         │   │
│  │  ├── 权限系统 (100%)                             │   │
│  │  │   └── ...                                     │   │
│  │  └── 考勤系统 (0%)                               │   │
│  │      └── ...                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  依赖关系图                                       │   │
│  │  S-BE-01 ──→ S-BE-02 ──→ S-ATT-02               │   │
│  │                     ↓                           │   │
│  │              S-PRM-02                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 系统不变量

1. **Markdown 是唯一的真相源**，可视化层不可回写
2. **任务 ID 全局唯一且稳定**，不变不重用
3. **状态转换有向无环**：backlog → todo → in_progress → review → done
4. **依赖关系不可循环**，系统必须能检测并报告
5. **历史完成记录不可删除或改写**（completed_date 一旦写入不可变）
6. **里程碑完成标准由人定义**，不由 AI 自行判定

## 阶段切分

### 当前必须做（MVP）

1. 定义 Markdown 任务文件 schema（frontmatter 字段规范）
2. 定义项目目录结构（.ganttmd/）
3. 定义 config.yaml 格式
4. Python 解析脚本（Markdown → JSON）
5. 依赖关系解析和循环检测
6. 单页 HTML 可视化（模块视图 + 依赖关系 + 状态颜色 + 里程碑标记）

### 当前建议做

7. 文件变化自动检测（watch mode），Markdown 变化后自动重新解析
8. AI Agent 操作规范（写入 AGENTS.md 的标准操作模板）
9. 从真实项目迁移一个案例验证可行性

### 可延后

10. 甘特图时间轴视图（依赖日期估算精度）
11. 多项目支持
12. 导出功能（PDF/PNG）
13. WebSocket 实时推送

### 明确不做

14. 数据库后端
15. 多用户协作和权限系统
16. 云端部署和 SaaS 模式
17. 移动端适配

## 技术选型

- **解析脚本**：Python 3.11+（与现有工具链一致）
- **Markdown 解析**：python-frontmatter + 自定义任务解析器
- **前端**：HTML + JavaScript + CSS（静态页面）
- **甘特图库**：待评估（frappe-gantt / dhtmlxGantt / 自定义）
- **文件监听**：watchdog（Python 库）
- **版本控制**：Git（天然支持）

## 依赖关系

### 运行依赖

- Python 3.11+
- Node.js（前端开发，可选）

### Python 依赖

- `python-frontmatter`：解析 Markdown frontmatter
- `pyyaml`：解析 YAML 配置
- `watchdog`：文件变化监听
- `rich`：终端美化输出（可选）

### 前端依赖

- 甘特图库（待评估）
- 无其他外部依赖

## 开发计划

### Phase 1：核心框架（1 周）

1. 项目初始化（pyproject.toml、目录结构）
2. Markdown schema 定义和文档
3. 解析脚本核心功能
4. 依赖图构建和循环检测

### Phase 2：可视化（1 周）

5. JSON 输出格式确定
6. 前端页面骨架
7. 模块视图渲染
8. 依赖关系可视化

### Phase 3：完善（1 周）

9. 文件监听和自动解析
10. AI Agent 操作规范文档
11. 测试用例
12. 文档完善

### Phase 4：验证（1 周）

13. 从真实项目迁移数据
14. 实际使用验证
15. 反馈收集和优化

## 不确定项

### 证据状态

- Markdown 看板体系在 jwxt 项目中已验证可行性
- 但自动解析和可视化尚未实现
- 前端甘特图库选型需要实际测试

### 代理暂定设计

- 前端使用 frappe-gantt 或类似轻量甘特图库
- Python 脚本解析 Markdown
- 文件监听使用 watchdog 库

### 判断错误风险

- 甘特图库可能不完全支持自定义依赖连线样式
- 可能需要自行开发渲染组件
- 跨模块依赖解析的复杂度可能被低估

### 需用户确认的问题

1. 是否需要 review 状态（人确认 AI 完成的任务），还是 AI 标记 done 即可？
2. 里程碑的完成标准是人手动判定，还是 AI 可以根据子任务全部 done 自动判定？
3. 任务是否需要 estimate（预估时间）字段，还是纯依赖关系驱动？

### 建议用纵横审查复核的点

- Markdown schema 的字段完整性
- 前端渲染库的技术可行性
- 跨模块依赖解析的边界情况

## 下一步

1. 确认方案后创建项目文件夹
2. 定义详细的 Markdown schema 规范
3. 实现解析脚本 MVP
4. 实现前端可视化 MVP
5. 从真实项目迁移数据验证
