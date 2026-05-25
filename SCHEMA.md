# GanttMD Schema 规范

本文档定义当前版本 `.ganttmd/` 数据目录的文件结构、字段约定和校验规则。GanttMD 的任务状态真相源只放在 `.ganttmd/`；需求正文、技术设计、接口清单、测试规范、PR 讨论等仍留在项目原有正式位置，通过 `source_docs`、`source_pr`、`source_rr`、`source_commit` 引用。

## 1. 目录结构

使用方项目只需要提交 `.ganttmd/` 数据目录，不复制 GanttMD 工具源码。

```text
.ganttmd/
  config.yaml
  tasks/
    active.md
    backend.md
    frontend.md
  followups.md
  runs.md
```

| 文件 | 必需 | 用途 |
|---|---:|---|
| `config.yaml` | 是 | 项目元信息、里程碑、视图配置和校验参数 |
| `tasks/*.md` | 是 | 任务状态真相源，一个文件可放多个任务 |
| `followups.md` | 建议 | follow-up、用户裁决、延期项和外部等待项 |
| `runs.md` | 建议 | 主控派给 worktree/branch 的执行批次和 checklist |
| `modules/*.md` | 兼容 | 旧版任务目录，新项目不推荐 |

GanttMD 不再要求 `milestones/overview.md` 或 `views/timeline.json`。里程碑定义放在 `config.yaml`，页面和 CLI 运行时按 Markdown 数据实时聚合。

## 2. config.yaml

最小示例：

```yaml
ganttmd:
  schema_version: 1

project:
  name: 示例项目
  description: AI Agent 项目状态看板

milestones:
  - id: M0
    title: 顶层基线与文档治理成型
    goal: 需求、设计和任务入口稳定
  - id: M1
    title: 工程骨架建立
    goal: 本地开发和 CI 跑通

views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution

validation:
  review_stale_days: 7
  archive_after_days: 7
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `ganttmd.schema_version` | number | 当前为 `1` |
| `project.name` | string | 页面标题和项目列表名称 |
| `project.description` | string | 项目说明 |
| `milestones[].id` | string | 里程碑 ID，例如 `M1` |
| `milestones[].title` | string | 里程碑名称 |
| `milestones[].goal` | string | 阶段目标，用于顶部里程碑卡片 |
| `views.enabled` | array | 启用视图列表 |
| `views.default` | string | 默认视角，推荐 `execution` |
| `validation.review_stale_days` | number | `review` 状态多久未更新算滞留 |
| `validation.archive_after_days` | number | `done/cancelled` 关闭多久后提示归档，默认 7 天 |

## 3. 任务文件

任务写在 `.ganttmd/tasks/*.md` 的 fenced YAML 代码块中。代码块外可以写人类补充说明，但工具只解析 `ganttmd-task` 块。

````markdown
# 后端任务

### S-BE-01 后端工程骨架专项设计

```ganttmd-task
id: S-BE-01
title: 后端工程骨架专项设计
kind: task
status: todo
dependencies: []
milestone: M1
track: backend
domain: foundation
priority: P0
owner:
agent:
source_docs: [docs/技术方案.md §2]
next_action: 明确后端目录、模块边界和启动入口
acceptance:
  - 目录结构确定
  - 本地启动路径明确
  - 后续实现任务可承接
evidence: []
verification:
review_status:
updated_at: 2026-05-25
```

补充说明写在任务块外。
````

### 任务字段

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 全项目唯一任务 ID |
| `title` | 是 | 任务标题 |
| `kind` | 否 | `task`、`bugfix`、`ad_hoc`、`review`、`harness` |
| `status` | 是 | 任务状态，见下表 |
| `dependencies` | 是 | 前置任务 ID 数组；无依赖写 `[]` |
| `milestone` | 建议 | 对应 `config.yaml` 中的里程碑 ID |
| `track` | 建议 | 主线，见 track 约定 |
| `domain` | 建议 | 业务域或能力域，例如 `student`、`notification`、`workflow` |
| `priority` | 建议 | `P0`、`P1`、`P2`、`P3` |
| `owner` / `agent` | 进行中必填 | 当前承接者。二者都写时必须一致 |
| `source_docs` | 活跃任务建议 | 需求、设计、接口、测试或证据依据路径，可带章节 |
| `next_action` | 活跃任务建议 | 下一步动作，给接手 Agent 使用 |
| `acceptance` | 活跃任务建议 | 完成边界，不要塞入长篇需求正文 |
| `evidence` | 完成态必填 | PR、commit、测试报告或文档证据 |
| `verification` | 工程完成态必填 | 测试命令、CI、手工验证或未验证原因 |
| `review_status` | review 必填 | 复核状态或复核结论 |
| `blocked_reason` | 显式 blocked 必填 | 阻塞原因 |
| `downstream_constraints` | 多下游建议 | 实现时不得破坏的下游约束 |
| `created_at` / `updated_at` | 建议 | 创建和更新时间 |
| `completed_date` / `closed_at` | 关闭态建议 | 完成或关闭日期，用于归档提醒 |
| `cancel_reason` / `resolution` | cancelled 必填其一 | 取消原因或处理结论 |
| `archived_at` / `archived_reason` | 归档时填写 | 归档日期和原因 |

### 任务状态

| 状态 | 含义 | 关键规则 |
|---|---|---|
| `todo` | 已登记，未开工 | 依赖完成后可领取 |
| `in_progress` | 已有 Agent 或人承接 | 必须有 `owner` 或 `agent` |
| `review` | 已产出，等待复核、PR 或用户判断 | 必须有 `review_status`，长期不更新会报警 |
| `done` | 已真实闭环 | 必须有 `evidence`；工程任务还要有 `verification` |
| `cancelled` | 明确不做 | 必须有 `cancel_reason` 或 `resolution` |
| `blocked` | 显式阻塞 | 允许写入，但必须有 `blocked_reason` |

实际页面还会派生阻塞态：即使源数据 `status` 不是 `blocked`，只要前置依赖未完成，页面也会把任务视为当前不可执行。

### track 约定

当前合法主线：

```text
spec, backend, frontend, infra, quality, docs, ops
```

旧别名 `quality_gate` 会被识别，但校验会提示改成 `quality`。

`track` 只表达主线分工，`domain` 表达业务域或能力域。比如通知功能可以写：

```yaml
track: backend
domain: notification
```

如果同一功能横跨多端，应拆成多个任务，通过 `domain: notification` 串起来，而不是把所有内容塞进一个“大通知任务”。

### source_docs 规则

`source_docs` 只引用正式依据，不是第二套进度系统。路径相对项目根目录，可带章节：

```yaml
source_docs:
  - docs/03-技术总基线.md §16
  - docs/modules/安全考勤.md §接口契约
```

任务状态、阻塞、完成证据和 follow-up 只写 `.ganttmd/`。正式需求、技术细节、接口字段和测试规范留在被引用文档中。

## 4. Follow-up 清单

`followups.md` 使用 `ganttmd-followup` 代码块。

````markdown
```ganttmd-followup
id: FUP-001
title: 安全到校 queryStatuses 后续优化
kind: followup
status: open
severity: medium
source_type: pr_review
source_task: S-BE-09
source_pr: PR#27
source_rr: RR-001
source_comment:
source_commit:
created_by: review-agent
created_at: 2026-05-22
reason: 当前后端实现使用内存分页，后续应评估 SQL UNION 或状态投影表替换
suggestion: 在 M6 前确认是否转为正式性能优化任务
next_review_at: 2026-05-29
```
````

### Follow-up 字段

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 全项目唯一 follow-up ID |
| `title` | 是 | 标题 |
| `kind` | 是 | 类型，见下表 |
| `status` | 是 | 状态，见下表 |
| `severity` | 是 | `low`、`medium`、`high` 等风险级别 |
| `source_type` | 是 | `task`、`pr_review`、`discussion`、`user`、`ci` 等 |
| `source_task` | 视来源 | 来源任务 |
| `source_pr` | PR 来源必填 | PR 编号 |
| `source_rr` | PR 来源必填 | PR review item 编号 |
| `created_by` | 是 | 登记者 |
| `created_at` | 是 | 登记日期 |
| `reason` | 是 | 为什么需要登记 |
| `suggestion` | 是 | 建议处理方式 |
| `next_review_at` | 延期/外部等待必填 | 下次复核日期 |
| `accepted_by` / `accepted_at` / `decision` | accepted 必填 | 主控接受延期时的决策链 |
| `converted_task` / `resolution` | converted 必填 | 转成正式任务后的任务 ID 和结论 |
| `resolution` | done/wontfix 必填 | 关闭结论 |

### Follow-up 类型

```text
followup, decision, deferred, external_wait, risk
```

| 类型 | 含义 |
|---|---|
| `followup` | 普通后续事项 |
| `decision` | 等待用户或主控裁决 |
| `deferred` | 已接受延期但需要复查 |
| `external_wait` | 等外部资料、设备、账号或环境 |
| `risk` | 风险项，不一定立即转任务 |

### Follow-up 状态

```text
open, accepted, converted, done, wontfix
```

普通 Agent 只能追加 `open` 条目，或在既有条目下追加证据/评论；不能关闭、删除、改为 `converted/done/wontfix`。主控负责清理、关闭、合并或转正式任务。

## 5. runs.md 与 checklist

`runs.md` 用来表达主控派给 worktree/branch 的执行批次。它不替代 Git 事实；本地服务会同时扫描实际 worktree，用于对照“计划”和“现场”。

### Run 示例

````markdown
```ganttmd-run
id: RUN-001
title: 本地服务看板迁移
status: active
branch: codex/local-runtime-dashboard
owner: codex
tasks: [S-CLI-01, S-WEB-01]
current_task: S-WEB-01
started_at: 2026-05-25
intent: 完成本地服务、项目登记和多项目看板入口
```
````

### Run 字段

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | run ID |
| `title` | 是 | run 标题 |
| `status` | 是 | `planned`、`active`、`review`、`merged`、`abandoned` |
| `branch` | active 必填 | 对应分支 |
| `owner` | active 必填 | 承接者 |
| `tasks` | active 必填 | 本批次任务 ID 数组 |
| `current_task` | 否 | 当前主要任务，必须属于 `tasks` |
| `started_at` / `ended_at` | 建议 | 起止时间 |
| `intent` | 建议 | 本 run 的目标 |
| `pr` / `merge_commit` | 合并时建议 | 交付证据 |

同一项目只能有少量 active run；如果多个 active run 同时引用同一个任务，校验会提示冲突风险。

### Checklist 示例

大任务内部 checklist 写在任意 `.ganttmd/tasks/*.md` 中的 `ganttmd-checklist` 代码块。

````markdown
```ganttmd-checklist
task_id: S-WEB-01
items:
  - C1 [done] 恢复 V6 多视图看板 | evidence: PR#12
  - C2 [in_progress] 接入本地服务 API | evidence:
  - C3 [todo] 补浏览器验证截图 | evidence:
```
````

| 字段 | 说明 |
|---|---|
| `task_id` | 所属任务 ID |
| `items` | checklist 项数组 |
| item 状态 | `todo`、`in_progress`、`blocked`、`done`、`skipped` |
| `evidence` | 每项完成证据，可为空但完成后建议补齐 |

页面会把 checklist 展示到任务抽屉和运行态面板中，帮助人类负责人看清“大任务做到了哪一步”。

checklist 是执行过程记录，不是长期任务事实。父任务进入 `done` 或 `cancelled` 后，项目主控应把 checklist 结果收口到 `evidence`、`verification`、follow-up 或新任务，然后删除 checklist；`ganttmd validate` 会输出 info 级收口提醒。

## 6. 归档规则

GanttMD 不自动删除任务。`done` 或 `cancelled` 任务关闭超过 `validation.archive_after_days` 后，`validate` 会输出 info 级归档提醒。

推荐归档方式：

```yaml
status: done
completed_date: 2026-05-10
archived_at: 2026-05-18
archived_reason: done_over_7_days
```

已归档任务仍保留在原任务文件中，默认不在执行视角展示；里程碑、主线、模块视角可通过状态筛选查看。

## 7. 校验规则摘要

`ganttmd validate` 会检查：

- 任务 ID 是否重复。
- `dependencies` 是否指向不存在任务。
- `status`、`kind`、`track`、`review_status` 是否非法。
- 任务是否缺少 `milestone` 或 `track`。
- `milestone` 是否指向配置中不存在的里程碑。
- `source_docs` 是否缺失或指向不存在的正式文档。
- `in_progress` 是否缺少 `owner/agent`，或二者不一致。
- `review` 是否缺少 `review_status` 或长期未更新。
- `blocked` 是否缺少 `blocked_reason`。
- `done` 是否缺少 `evidence`。
- 工程类 `done` 是否缺少 `verification`。
- `cancelled` 是否缺少取消原因或处理结论。
- `done/cancelled` 是否已达到归档提醒阈值。
- PR follow-up 是否缺少 `source_pr/source_rr`。
- `accepted` follow-up 是否缺少主控决策链或复核时间。
- `run` 是否缺少 active 必填字段、引用不存在任务或 current_task 不属于 tasks。
- checklist 状态是否合法，是否引用不存在任务。

输出分为：

| 级别 | 含义 |
|---|---|
| `warn` | 应修复；CI 可据此失败 |
| `info` | 治理提醒；不阻断校验通过 |

JSON 输出：

```bash
ganttmd validate --json
```

## 8. 迁移和兼容

- 新项目使用 `.ganttmd/tasks/*.md`。
- 旧项目中的 `.ganttmd/modules/*.md` 仍可被读取，但会逐步迁到 `tasks/`。
- 本地工具升级不应覆盖 `.ganttmd/` 数据。
- schema 升级必须通过显式 `ganttmd migrate --apply`，并在写入前创建备份。
