# GanttMD Schema 规范

本文档定义 `.ganttmd/` 数据目录的文件结构、字段约定、校验规则和人机协作边界。

GanttMD 的任务状态真相源只放在 `.ganttmd/`；需求正文、技术设计、接口清单、测试规范、PR 讨论等仍留在项目原有正式位置，通过 `source_docs`、`source_pr`、`source_rr`、`source_comment`、`source_url`、`source_commit` 引用。

## 1. 目录结构

使用方项目只需要提交 `.ganttmd/` 数据目录，不复制 GanttMD 工具源码。

```text
.ganttmd/
  README.md
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
| `README.md` | 建议 | 当前项目的 .ganttmd 操作边界说明 |
| `config.yaml` | 是 | 项目元信息、里程碑、视图配置和校验参数 |
| `tasks/*.md` | 是 | 任务状态真相源，一个文件可放多个任务 |
| `followups.md` | 建议 | follow-up、决策事项、延期项、风险项和关闭结论 |
| `runs.md` | 建议 | 分支或执行批次记录 |
| `modules/*.md` | 兼容 | 旧版任务目录，新项目不推荐 |

GanttMD 不再要求 `milestones/overview.md` 或 `views/timeline.json`。里程碑定义放在 `config.yaml`，页面和 CLI 运行时按 Markdown 数据实时聚合。

## 2. config.yaml

最小示例：

```yaml
ganttmd:
  schema_version: 1

agent_command:
  execution_setup: 主控已完成领取、分支和运行态安排；分支代理只做任务产出。
  delivery_requirements: 在 PR body 交付验证证据、影响范围和候选 follow-up。
  templates:
    default: |
      你接手任务 {{task.id}}：{{task.title}}。

      任务卡：
      {{task.file}} 中的 {{task.id}}

      任务目标：
      {{task.next_action}}

      验收重点：
      {{task.acceptance}}
    review:
      body: |
        复核任务 {{task.id}}：{{task.title}}。

        验收重点：
        {{task.acceptance}}
    blocked:
      body: |
        不建议领取 {{task.id}}：{{task.title}}

        阻塞原因：
        {{task.blocked_reason}}

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

里程碑建议控制在 3-5 个。不要把每个模块都写成里程碑。如果项目已有完整路线图，可以把暂时没有任务的里程碑也写入——页面会显示为 `0 任务 · 未拆解`。

## 3. 任务文件

任务写在 `.ganttmd/tasks/*.md` 的 fenced YAML 代码块中。代码块外可以写人类补充说明，但工具只解析 `ganttmd-task` 块。

````markdown
# 同步任务

### BE-002 离线同步 API

```ganttmd-task
id: BE-002
title: 离线同步 API
kind: task
status: todo
dependencies: [BE-001]
milestone: M2
track: backend
domain: sync
priority: P0
owner:
agent:
source_docs: [docs/architecture.md §同步模型]
next_action: 实现变更游标、批量上传和冲突返回结构
acceptance:
  - 支持客户端按游标拉取增量变更
  - 支持离线编辑批量上传
  - 冲突响应包含本地版本、远端版本和建议处理动作
evidence: []
verification:
review_status:
updated_at: 2026-05-25
```

补充说明写在任务块外。
````

### 3.1 任务字段

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 稳定任务编号，全项目唯一，不能随意改名 |
| `title` | 是 | 人类可读任务标题 |
| `kind` | 否 | `task`、`bugfix`、`ad_hoc`、`review`、`harness`；未填写按 `task` 理解 |
| `status` | 是 | `todo`、`in_progress`、`review`、`done`、`cancelled` |
| `dependencies` | 是 | 前置任务 ID 数组；无依赖写 `[]` |
| `milestone` | 建议 | 对应 `config.yaml` 中的里程碑 ID |
| `track` | 建议 | 主线，见 track 约定 |
| `domain` | 建议 | 业务域或能力域，例如 `editor`、`sync`、`sharing` |
| `priority` | 建议 | `P0`、`P1`、`P2`、`P3` |
| `owner` | 进行中必填 | 负责人 |
| `agent` | 进行中必填 | 当前执行者；`owner` 和 `agent` 可不同 |
| `source_docs` | 活跃任务建议 | 需求、设计、接口、测试或证据依据路径，可带章节 |
| `next_action` | 活跃任务建议 | 下一步具体动作，给接手 Agent 使用 |
| `acceptance` | 活跃任务建议 | 完成边界，建议 2-4 条；不要塞入长篇需求正文 |
| `evidence` | 完成态必填 | PR、commit、测试报告或文档证据 |
| `verification` | 工程完成态必填 | 测试命令、CI、手工验证或未验证原因 |
| `review_status` | review 必填 | 任务级复核状态，见 review_status 节 |
| `completed_branch` | 完成态建议 | 完成本任务的分支名，用于闭环后的历史追踪 |
| `blocked_reason` | 显式 blocked 必填 | 阻塞原因 |
| `downstream_constraints` | 多下游建议 | 实现时不得破坏的下游约束 |
| `created_at` | 建议 | 创建时间 |
| `updated_at` | 建议 | 最后更新日期 |
| `completed_date` | 关闭态建议 | 完成日期，用于归档提醒 |
| `closed_at` | 关闭态建议 | 终态关闭日期 |
| `cancel_reason` | cancelled 必填其一 | 取消原因 |
| `resolution` | cancelled 必填其一 | 处理结论 |
| `archived_at` | 归档时填写 | 归档日期；归档后默认从活跃看板隐藏 |
| `archived_reason` | 归档时填写 | 归档原因，如 `done_over_7_days` |

### 3.2 状态

| 状态 | 含义 | 关键规则 |
|---|---|---|
| `todo` | 已登记，未开工 | 依赖完成后可领取 |
| `in_progress` | 已有 Agent 或人承接 | 必须有 `owner` 或 `agent` |
| `review` | 已产出，等待复核 | 必须有 `review_status` |
| `done` | 已真实闭环 | 必须有 `evidence`；工程任务还要有 `verification` |
| `cancelled` | 明确不做 | 必须有 `cancel_reason` 或 `resolution` |

`blocked` 默认不作为源状态写入任务。页面根据 `dependencies` 和 `blocked_reason` 自动推导阻塞展示。如果确实需要显式写 `status: blocked`，必须同时填写 `blocked_reason`。

`done` 和 `cancelled` 任务不要直接删除。超过 7 天归档阈值后，validator 会提示"可归档"，可补 `archived_at` 和 `archived_reason`。归档不是源状态——不要把 `status` 改成 `archived`。

### 3.3 kind

| kind | 含义 |
|---|---|
| `task` | 常规计划内任务；未填写时按 task 理解 |
| `bugfix` | 缺陷修复 |
| `ad_hoc` | 计划外临时任务 |
| `review` | 复核、审查或确认任务 |
| `harness` | 工具、脚手架、AI 工作流或测试夹具任务 |

计划外工作不要只留在聊天里。若需要进入任务治理，应登记为 `kind: ad_hoc` 或 `kind: bugfix`。

### 3.4 review_status

`review_status` 只记录任务级复核状态，不承接 PR 每轮评审意见。

合法值（默认）：

- `pending`：任务已有产出，等待最终复核、合并或用户判断（执行 Agent 填写）。
- `passed`：任务级复核通过，通常与 `status: done` 一起使用（主控或维护者填写）。
- `deferred`：主控明确决定暂缓最终复核，通常应配合 follow-up 记录复查条件和时间。

PR 中的 requested changes、修改意见和返工要求应保留在 PR review 或评论中，不写入 `review_status`；修完后仍回到 `review_status: pending` 等待复核。

关键质量门：

- `status: review` 时，`review_status` 不能是 `passed`；通过后应进入 `status: done`。
- `status: done` 不强制填写 `review_status`，但如果填写，只能是 `passed`。

若团队没有 PR review 流程，或确实希望把返修结论写入任务状态，可在 `.ganttmd/config.yaml` 中显式扩展：

```yaml
ganttmd:
  review_statuses: [pending, passed, deferred, must_fix]
```

一旦项目自定义 `review_statuses`，校验器按项目配置判断合法值。

### 3.5 track 和 domain

`track` 表达工作主线，`domain` 表达业务域或能力域。

当前合法主线：

```text
spec, backend, frontend, infra, quality, docs, ops
```

旧别名 `quality_gate` 会被识别，但校验会提示改成 `quality`。

例如离线同步后端 API：

```yaml
track: backend
domain: sync
```

如果同一功能横跨多端，应拆成多个任务，通过 `domain` 串起来，而不是把所有内容塞进一个"大通知任务"。

### 3.6 source_docs

`source_docs` 只引用正式依据，不是第二套进度系统。路径相对项目根目录，可带章节：

```yaml
source_docs:
  - docs/product.md §共享协作
  - docs/architecture.md §同步模型
```

不要写 `docs/技术方案.md` 这类笼统路径。不把任务说明本身写进 `source_docs`。

### 3.7 next_action 和 acceptance

`next_action` 写下一步具体动作，不写文档名。好的写法：`明确后端目录、模块边界和启动入口`。不好：`阅读 docs/技术方案.md`（读文档是准备动作）。

`acceptance` 写 2-4 条任务级完成边界，不搬源文档的完整验收标准。

### 3.8 evidence 和 verification

`evidence` 写完成证据：

```yaml
evidence: [docs/后端工程骨架专项设计.md, commit:abcdef]
```

不同任务类型的证据要求：

| 任务类型 | 必须证据 | 建议证据 |
|---|---|---|
| 代码实现 | PR 或 commit | verification、review_status |
| 工程配置 | commit 或配置文件路径 | verification |
| 规格/设计文档 | 正式文档章节 | review_status |
| 调研/决策 | decision 记录 | source_docs |

`verification` 可以写测试命令、CI、手工验证，也可以明确写未验证原因。

### 3.9 任务正文

任务块外可以写补充说明：背景说明、当前状态、外部阻塞、人类补充备注。不适合写：需要机器稳定解析的字段、任务状态、依赖列表。

## 4. Follow-up 清单

`followups.md` 使用 `ganttmd-followup` 代码块，用来记录"当前任务中发现，但不应直接混入当前任务范围"的后续事项。

典型场景：后续复查风险、暂缓处理的改进、设计确认、PR 审查留下的可追踪事项、已转正式任务的遗留项，以及裁决后无需转任务的关闭结论。

没有写入 `.ganttmd/followups.md` 的事项，不视为进入项目跟踪。

### Follow-up 示例

````markdown
```ganttmd-followup
id: FUP-001
title: 移动端冲突提示文案需要产品确认
kind: followup
status: open
severity: medium
source_type: discussion
source_task: FE-003
source_pr:
source_rr: RR-001
source_comment:
source_commit:
created_by: ux-review-agent
created_at: 2026-05-25
reason: 冲突解决弹窗的提示文案还没有统一，可能影响用户理解
suggestion: 由产品确认三类冲突提示，再决定是否转为正式 UX 任务
next_review_at: 2026-06-01
```
````

### Follow-up 字段

| 字段 | 必需 | 说明 |
|---|---:|---|
| `id` | 是 | 全项目唯一 follow-up ID |
| `title` | 是 | 标题 |
| `kind` | 是 | `followup`、`decision`、`deferred`、`risk`；历史数据中的 `external_wait` 仅兼容读取，不再作为推荐类型 |
| `status` | 是 | `open`、`accepted`、`converted`、`done`、`wontfix` |
| `severity` | 是 | `low`、`medium`、`high` |
| `source_type` | 是 | `task`、`pr_review`、`discussion`、`user`、`ci` 等 |
| `source_task` | 视来源 | 来源任务 |
| `source_pr` | PR 来源必填 | PR 编号 |
| `source_rr` / `source_comment` / `source_url` | PR 来源三选一 | PR review item 编号、评论链接或可追溯 URL |
| `created_by` | 是 | 登记者 |
| `created_at` | 是 | 登记日期 |
| `reason` | 是 | 为什么需要登记 |
| `suggestion` | 是 | 建议处理方式 |
| `next_review_at` | 延期必填 | 下次复核日期 |
| `accepted_by` / `accepted_at` / `decision` | accepted 必填 | 接受延期时的决策链 |
| `converted_task` / `resolution` | converted 必填 | 转成正式任务后的任务 ID 和结论 |
| `resolution` | done/wontfix 必填 | 关闭结论 |
| `source_pr` | PR 来源必填 | 来源 PR 编号 |

来自 PR 审查的 follow-up 必须填写 `source_pr`，并在 `source_rr`、`source_comment`、`source_url` 中至少填写一个。

### Follow-up 类型和状态

**类型**：

| 类型 | 含义 |
|---|---|
| `followup` | 待处理后续事项 |
| `decision` | 等待明确决策 |
| `deferred` | 已接受延期但需要复查 |
| `risk` | 风险项，不一定立即转任务 |

历史数据中的 `external_wait` 仍可被读取以保证兼容，但看板不再提供“等待外部资料”独立标签。新增事项应按实际治理动作归入 `followup`、`decision`、`deferred` 或 `risk`。

**状态**：

| 状态 | 含义 |
|---|---|
| `open` | 已登记，尚未清理 |
| `accepted` | 确认后续要处理，但尚未转成正式任务 |
| `converted` | 已转成 `.ganttmd/tasks/*.md` 正式任务 |
| `done` | 已处理完成 |
| `wontfix` | 明确不做，保留原因 |

建议执行 Agent 只新增 `open`，其他状态由看板维护者统一处理。

看板 Follow-up 视图使用多选标签组织清单：

- `全部`：显示所有 follow-up。
- `待处理`：显示尚未转正式任务、尚未关闭的 `open` / `accepted` follow-up。
- `等待用户裁决`、`延期复查`、`高风险事项`：待处理集合中的重点子类。
- `已转正式任务`：显示 `status: converted` 或填写了 `converted_task`，且关联正式任务尚未完成的 follow-up。
- `已关闭`：显示裁决后不转正式任务、以 `done` / `wontfix` 或关闭证据收口的 follow-up；也包含已转正式任务且关联正式任务已经 `done` 的 follow-up。

已转正式任务卡片会把两个概念分开显示：`已转正式任务` 是 follow-up 阶段标签；关联正式任务的当前状态（例如 `已完成`、`可执行`、`被阻塞`）显示在卡片右上角，与风险等级并列。关联正式任务进入 `done` 后，该 follow-up 在看板分组上归入“已完成”。

### 转成正式任务

1. 在 `.ganttmd/tasks/*.md` 新增 `ganttmd-task`。
2. 在 follow-up 中设置 `status: converted`。
3. 填写 `converted_task` 和 `resolution`。

### 关闭而不转任务

如果 follow-up 经裁决后不需要进入正式任务，应设置为 `status: done` 或 `status: wontfix`，并填写 `resolution`。这类事项会进入看板的“已关闭”标签，用于保留裁决依据和关闭原因。已转正式任务的 follow-up 不需要在关联任务完成后改写原始 follow-up 状态；看板会根据 `converted_task` 指向任务的 `done` 状态归入已完成分组。

## 5. runs.md 与 checklist

`runs.md` 用来表达分支或执行批次。它不替代 Git 事实；本地服务会同时读取任务数据，用于对照计划和执行状态。

`runs.md` 是运行态记录，不是长期任务正文。项目如果已经启用受控 CLI 或自动化写入口，应优先通过这些入口写入，而不是把手工编辑 `runs.md` 当成默认流程。

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
| `branch` | active 必填 | 对应分支或批次名称 |
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

checklist 是执行过程记录，不是长期任务事实。父任务进入 `done` 或 `cancelled` 后，看板维护者应把 checklist 结果收口到 `evidence`、`verification`、follow-up 或新任务，然后删除 checklist；`ganttmd validate` 会输出 info 级收口提醒。

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
- `in_progress` 是否缺少 `owner/agent`。
- `review` 是否缺少 `review_status`、长期未更新，或提前写成 `passed`。
- `done` 如填写 `review_status`，是否为 `passed`。
- `blocked` 是否缺少 `blocked_reason`。
- `done` 是否缺少 `evidence`。
- 工程类 `done` 是否缺少 `verification`。
- `cancelled` 是否缺少取消原因或处理结论。
- `done/cancelled` 是否已达到归档提醒阈值。
- PR follow-up 是否缺少 `source_pr`，或缺少 `source_rr/source_comment/source_url` 中任一追溯字段。
- `accepted` follow-up 是否缺少决策链或复核时间。
- `run` 是否缺少 active 必填字段、引用不存在任务或 current_task 不属于 tasks。
- checklist 状态是否合法，是否引用不存在任务。
- 父任务已 `done`/`cancelled` 但 checklist 未删除。

输出分为：

| 级别 | 含义 |
|---|---|
| `warn` | 应修复；CI 可据此失败 |
| `info` | 治理提醒；不阻断校验通过 |

JSON 输出：

```bash
ganttmd validate --json
```

## 8. 人机协作边界

`.ganttmd/` 是任务状态数据，不是临时聊天记录。建议团队指定一个任务分发 Agent 或看板维护者负责结构性维护（创建、拆分、取消、关闭任务，调整依赖和里程碑，清理 follow-up）。

执行 Agent 只处理当前任务范围：

- 领取已存在任务，更新状态、`evidence`、`verification`。
- 完成交付后可写 `status: review` 和 `review_status: pending`；`passed`/`deferred` 由主控或维护者填写。
- 维护当前任务内的 checklist。
- 追加 `status: open` 的 follow-up。
- 不要修改与当前任务无关的任务状态。
- 工作前必须读取任务列出的 `source_docs`。
- PR 修改意见、requested changes 和返工要求保留在 PR review 或评论中，不写入 `review_status`。
- "后续再做 / 暂不处理"等未闭环事项必须登记到 `.ganttmd/followups.md`。

这个分工不是强制要求，单人项目可由开发者直接维护。

`done` 应至少满足：有 `evidence`、工程类任务有 `verification`、需复核的任务有 `review_status`、剩余事项已登记为 follow-up 或新任务。

## 9. 使用方项目接入

接入 GanttMD 的项目，`.ganttmd/` 应作为项目根目录下的任务状态层，跟随 Git 管理。

### 9.1 哪些内容放进 .ganttmd/

- `config.yaml`：项目、里程碑和视图配置。
- `tasks/*.md`：任务、状态、依赖、证据链和验收摘要。
- `followups.md`：后续事项、决策事项、延期复核、风险项和关闭结论。
- `runs.md`：任务批次、分支承接关系和执行窗口。

这些文件都应该提交到 Git——Agent 需要读取、人类需要审查、CI 可以校验。

### 9.2 哪些内容不要放进 .ganttmd/

- 产品需求正文、技术方案正文、数据模型正文。
- 接口清单正文、测试规范正文。
- PR 评论流水、长篇 AI 讨论记录。

这些内容继续放在项目原来的 `docs/`、PR 或其他正式位置。`.ganttmd/` 通过 `source_docs`、`source_pr`、`source_rr`、`source_comment`、`source_url`、`source_commit` 引用它们。

### 9.3 Agent 的读取路径

```
AGENTS.md
.ganttmd/config.yaml
相关的 .ganttmd/tasks/*.md 与 followups.md 条目
当前任务列出的 source_docs
```

Agent 不应每次全量阅读所有任务文件。应先按任务 ID、状态、依赖或页面推荐定位相关任务，再读取必要的文件。

### 9.4 复制指令模板

看板复制按钮默认使用内置模板。推荐在 `.ganttmd/config.yaml` 里用 `agent_command` 统一配置：

```yaml
agent_command:
  execution_setup: 主控已完成领取、分支和运行态安排；分支代理只做任务产出。
  delivery_requirements: 在 PR body 交付验证证据、影响范围和候选 follow-up。
  templates:
    default: |
      你接手任务 {{task.id}}：{{task.title}}。

      任务卡：
      {{task.file}} 中的 {{task.id}}

      任务目标：
      {{task.next_action}}
    review:
      body: |
        复核任务 {{task.id}}：{{task.title}}。

        验收重点：
        {{task.acceptance}}
    blocked:
      body: |
        不建议领取 {{task.id}}：{{task.title}}

        阻塞原因：
        {{task.blocked_reason}}
```

`agent_command.templates` 支持 `todo`、`in_progress`、`review`、`done`、`cancelled`、`blocked`、`missing_deps`、`default`。没有写的状态继续使用 GanttMD 内置模板。

#### 导出内置模板供编辑

想改任务指令但不知道从哪下手时，用 `ganttmd template eject` 把内置模板追加到 `config.yaml`：

```bash
ganttmd template eject [path]            # 把全部状态模板追加成 agent_command 配置块
ganttmd template eject [path] --dry-run  # 只看 config.yaml 写入计划，不写盘
```

导出后：

- `config.yaml` 追加一个 `agent_command` 配置块，包含所有状态模板。
- 编辑 `agent_command.templates` 下的模板，刷新看板即生效。
- 默认不重复追加已有 `agent_command` 配置块，避免冲掉你已有的自定义。

选择优先级：

- 缺失依赖任务优先使用 `missing_deps` 模板。
- 阻塞任务优先使用 `blocked` 模板。
- 其他任务优先使用与 `status` 同名的模板。
- 没有状态模板时，使用 `agent_command.templates.default`。
- 没有任何项目模板时，使用 GanttMD 内置模板。

支持的占位符：

- `{{task.id}}`、`{{task.title}}`、`{{task.status}}`、`{{task.file}}`
- `{{task.next_action}}`、`{{task.execution_scope}}`、`{{task.output_target}}`
- `{{task.acceptance}}`、`{{task.downstream_constraints}}`、`{{task.verification_commands}}`
- `{{task.source_docs}}`
- `{{task.blocked_reason}}`、`{{task.open_dependencies}}`、`{{task.missing_dependencies}}`、`{{task.downstream}}`
- `{{execution_setup}}`、`{{delivery_requirements}}`、`{{critical_path_note}}`

未识别的占位符会渲染为空字符串。

### 9.5 最低成功标准

- `ganttmd validate` 没有 warning。
- `ganttmd doctor` 不提示 schema 落后或缺失。
- 本地看板能读取任务，里程碑能显示，执行视角能看到下一步任务。
- Follow-up 视图能显示 `全部`、`待处理`、`已转正式任务`、`已关闭` 等标签；已转正式任务卡片能显示关联正式任务状态，且关联任务完成后进入已完成分组；runs.md 能表达当前分支承接的任务批次。

## 10. 迁移和兼容

- 新项目使用 `.ganttmd/tasks/*.md`。
- 旧项目中的 `.ganttmd/modules/*.md` 仍可被读取，但会逐步迁到 `tasks/`。
- 本地工具升级不应覆盖 `.ganttmd/` 数据。
- schema 升级必须通过显式 `ganttmd migrate --apply`，并在写入前创建备份。
