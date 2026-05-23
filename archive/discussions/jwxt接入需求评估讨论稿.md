# jwxt 接入 GanttMD 需求评估讨论稿

审查强度：L2 标准评估  
审查对象：`jwxt` 代理提出的 “GanttMD 接入 jwxt 的核心要求”  
当前阶段：GanttMD 原型期，已有 `execution / milestone / module / risk / followup` 等视图和 `.ganttmd/modules/*.md`、`.ganttmd/followups.md` 两类主要真相源。  
证据状态：基于当前仓库文档、V6 示例页面和 jwxt-lite 示例数据评估；未直接检查真实 `jwxt` 仓库最新进度文档。

## 1. 核心本质

这份需求的本质不是“再做一个甘特图”，而是希望 GanttMD 成为 AI solo 项目中的动态任务治理层：

> 正式文档定义项目事实，GanttMD 定义任务状态、阻塞、证据、follow-up 和下一步调度。

这个方向是正确的，也和 GanttMD 当前定位基本一致。它真正要解决的是：

1. 多 Agent 协作时，谁在做什么、下一步该做什么不可见。
2. “后续再做 / 可延后 / 已处理”容易口头闭环，没有进入可追踪清单。
3. 任务完成缺少 PR、commit、verification、review_status 等证据链。
4. 用户无法低成本知道哪些事项需要自己拍板。
5. 项目状态散落在总控文档、模块清单、PR 评论和 Agent 回复里。

因此，应该吸收它的核心目标：**任务状态真相源 + 证据链 + follow-up/blocker 治理 + 用户低认知视图**。

但不应该直接照单全收字段和状态设计。当前需求里有一些概念混用：任务状态、审查状态、延期决策、阻塞原因、follow-up 生命周期、PR 交付证据被放进同一个任务对象里，容易把任务块变成第二个复杂项目管理系统。

## 2. 总体判断

| 方向 | 结论 | 说明 |
| --- | --- | --- |
| GanttMD 作为任务状态真相源 | 应吸收 | 这是项目核心价值。 |
| 正式文档仍留在原文档中，GanttMD 只引用 | 应坚持 | 防止 GanttMD 变成需求正文仓库。 |
| 项目全景 / 主线 / 模块 / Follow-up 视图 | 应吸收，但要收口 | 当前已有部分视图，缺少 `track` 和用户裁决专项视角。 |
| 大字段集合一次性加入任务对象 | 不建议直接照搬 | 会让 Agent 写任务成本过高，MVP 应分层字段。 |
| `accepted_deferred` 作为任务状态 | 不建议 | 更适合放到 follow-up 或 decision/defer 对象，不宜污染任务执行状态。 |
| PR/RR/commit/verification 证据链 | 应优先补 | 这是解决“虚假闭环”的关键。 |
| health check | 应优先补 | 但先实现有限规则，不要一次性做全。 |
| 多层任务结构 | 应作为投影视图实现 | 不一定要在文件系统里强制嵌套。 |

## 3. 逐项评估

### 3.1 产品定位要求

需求：GanttMD 是 `jwxt` 的任务状态真相源与全景调度入口；不承接正式需求、技术基线、模块规格正文，只引用它们。

评估：正确，应吸收。

当前满足度：部分满足。

- `.ganttmd/modules/*.md` 已承接正式任务。
- `.ganttmd/followups.md` 已承接 follow-up。
- `source_docs` 已用于引用正式文档。
- 当前还没有把 PR、commit、verification、review_status 正式纳入任务 schema。

建议：

GanttMD 的定位应写成：

> GanttMD 只管理任务状态、依赖、证据、阻塞、follow-up、裁决和复核结论；正式业务事实仍以原文档为准。

这个边界必须写进 `SCHEMA.md` 和 Agent 规则，否则真实接入后很容易把模块规格正文复制进任务块。

### 3.2 必须支持的视图

#### A. 项目全景视图

需求：展示 M0-M8、四大主线、最大阻塞、下一步动作、高风险、用户裁决、即将到期 follow-up。

评估：方向正确，但“项目全景视图”不要急着做成大图。它更像用户首页或主控驾驶舱。

当前满足度：部分满足。

- 里程碑进度已有。
- 推荐下一步已有。
- 风险视角已有。
- Follow-up 视角已有。
- 缺少用户裁决、即将到期、四大主线聚合。

建议：

短期先不做复杂全景图。优先在当前主控看板顶部增强：

- 当前最大阻塞。
- 下一步系统级动作。
- 待用户裁决。
- 即将到期 follow-up。
- 高风险任务。

真正的“全景图”应作为独立页面探索，不作为 MVP 阻断项。

#### B. 主线视图

需求：按模块规格、后端工程、前端工程、设备接入、横切质量门、AI harness 过滤。

评估：应吸收，但不能复用当前 `module` 概念。

当前满足度：不完整。

当前 `module` 在示例里更像“任务文件/责任域”，不是业务主线。`track` 应独立于 `module`。

建议新增字段：

```yaml
track: module_spec | backend | frontend | device | quality_gate | workflow
```

然后新增或改造一个 `track` 视图。不要把主线塞进 `module`，否则未来“学生管理模块 + 后端工程主线”这种交叉关系会表达不清。

#### C. 模块视图

需求：支持学生管理、班级管理、教师管理等业务模块，并展示跨域依赖、待确认项、专项分发、PR、正式文档章节。

评估：方向正确，但当前 GanttMD 的 `modules/*.md` 文件不应被误解成业务模块的唯一表达。

当前满足度：部分满足。

- 当前已有模块视角。
- 当前可通过 `dependencies` 表达跨域依赖。
- 当前 `source_docs` 可引用正式文档。
- 当前没有 `business_module` 或 `domain_module` 字段。
- 当前没有待确认项、专项分发、PR 的正式字段约束。

建议：

把业务模块字段从文件结构中解耦：

```yaml
module: student | class | teacher | approval | settings | org_permission | safety_attendance
track: backend | frontend | module_spec | device | quality_gate
```

这样一个任务可以同时属于“安全考勤模块”和“后端工程主线”。

#### D. Follow-up / 阻塞视图

需求：展示未处理 follow-up、延期项、转任务项、拒绝项、阻塞项、用户裁决、外部资料、超期未复查。

评估：应优先吸收。

当前满足度：部分满足。

- `.ganttmd/followups.md` 已支持 `open / accepted / converted / done / wontfix`。
- follow-up 已支持 `source_pr / source_rr / source_comment / source_commit`。
- `accepted` 已要求 `next_review_at`。
- 阻塞任务当前由依赖和 `blocked_reason` 推导。
- 缺少用户裁决、外部资料、超期未复查的独立分类。

建议：

先扩展 follow-up，而不是新增很多任务状态：

```yaml
kind: followup | decision | external_wait | deferred | risk
next_review_at:
decision_owner: user | project-control | reviewer
```

这样可以支持“等待用户裁决”和“等待外部资料”，又不会把正式任务状态搞复杂。

### 3.3 任务对象字段要求

需求列出大量字段，包括 `type / level / scope / track / module / status / source_pr / verification / review_status / due_at / next_review_at` 等。

评估：字段方向基本合理，但不应一次性要求每个任务全部填写。

当前满足度：部分满足。

已具备或部分具备：

- `id`
- `title`
- `status`
- `dependencies`
- `milestone`
- `source_docs`
- `next_action`
- `acceptance`
- `evidence`
- `owner / agent`
- follow-up 的 `source_pr / source_rr / source_commit`

缺少或未正式化：

- `type`
- `level`
- `scope`
- `track`
- `module` 作为业务模块字段
- `priority`
- `owner_role`
- `source_pr`
- `source_rr`
- `source_commit`
- `current_pr`
- `verification`
- `review_status`
- `due_at`
- `next_review_at`
- `updated_at`
- `closed_at`

建议分层：

**MVP 必填字段**

```yaml
id:
title:
status:
dependencies:
milestone:
track:
module:
source_docs:
next_action:
acceptance:
evidence:
updated_at:
```

**证据链字段，done/review 时要求**

```yaml
source_pr:
source_rr:
source_commit:
verification:
review_status:
```

**治理字段，有需要时填写**

```yaml
due_at:
next_review_at:
owner_role:
current_pr:
followups:
```

不建议把 `type: milestone` 放进任务对象。Milestone 应继续由 `config.yaml` 管理。任务对象可以有 `type: task | review | bugfix | harness`，但 milestone 不应和 task 混成同一层。

### 3.4 状态规则要求

需求状态：

```text
todo / in_progress / review / blocked / done / accepted_deferred / cancelled
```

评估：状态规则方向正确，但当前写法过度混合。

当前满足度：部分满足。

当前任务字段说明倾向于只写源状态：

```yaml
todo
in_progress
done
```

页面根据依赖推导 `blocked`。V6 示例中也存在 `blocked_reason` 和阻塞展示。

建议状态拆分：

```yaml
status: todo | in_progress | review | done | cancelled
blocked_reason:
review_status:
defer_status:
next_review_at:
```

其中：

- `blocked` 可以继续作为派生状态，也允许显式 `blocked`，但必须有 `blocked_reason` 或未完成依赖。
- `accepted_deferred` 不建议放进 `status`。它是主控决策，不是执行状态。
- `cancelled` 可以加，但必须有 `resolution` 或 `cancel_reason`。
- `review` 值得加入，因为它能表达“Agent 产出完成，但尚未复核”。

### 3.5 层级关系要求

需求层级：

```text
Project -> Milestone -> Track -> Module / Crosscutting Area -> Task -> Follow-up / Blocker
```

评估：概念正确，但不应要求文件目录物理嵌套成这样。

当前满足度：部分满足。

- Project：`config.yaml`
- Milestone：`config.yaml`
- Task：`modules/*.md`
- Follow-up：`followups.md`
- Track：缺少正式字段
- Module / Crosscutting Area：当前表达不清

建议：

用字段投影形成层级，不用目录嵌套形成层级：

```yaml
milestone: M5
track: backend
module: safety_attendance
area: crosscutting_quality_gate
```

页面可以按不同字段组合出：

- 里程碑视图。
- 主线视图。
- 模块视图。
- 横切质量门视图。

### 3.6 证据链要求

需求：done 必须追溯正式文档章节、任务编号、PR、commit、测试、复核、剩余风险、follow-up。

评估：必须吸收，优先级高。

当前满足度：部分满足。

- `source_docs` 已有。
- `evidence` 已有。
- follow-up 来源字段已有。
- 当前缺少对 `done` 证据的强制健康检查。
- 当前没有标准化 `verification` 和 `review_status`。

建议：

短期 health check 先检查：

- `done` 没有 `evidence`。
- `done` 没有 `verification`。
- `review` 没有 `source_pr` 或 `review_status`。
- `evidence` 中没有 PR/commit 时提示风险，不一定直接判非法。

不要要求所有 done 任务必须同时有 PR 和 commit。文档型任务可能只有正式文档 evidence；代码型任务才强要求 PR/commit/verification。

### 3.7 PR / 评论区联动要求

需求：Task ↔ PR / RR / Follow-up / Commit / Verification；PR 评论区 follow-up 必须登记 ID。

评估：方向正确，应作为接入 jwxt 的关键能力。

当前满足度：部分满足。

- Follow-up 机制已经支持 `source_pr / source_rr / source_comment / source_commit`。
- Agent 协作规则模板已有 PR follow-up 示例。
- 任务对象本身尚未标准化 PR/RR 字段。
- 当前没有自动从 PR 评论区生成 follow-up 的工具。

建议：

MVP 不做自动同步，先做规则和健康检查：

1. PR 评论区出现可延后项，必须手动登记 `FUP-xxx`。
2. `[FIX-REPLY]` 如果写“可延后”，必须引用 `FUP-xxx`。
3. `[MERGE-READY]` 前检查没有悬空 follow-up。
4. 后续再考虑 `gh` 脚本或 GitHub Action 自动检查。

### 3.8 用户把控视图要求

需求：非代码用户默认只看当前做什么、下一步、卡住什么、需要拍板什么、延期什么、真实完成什么。

评估：完全正确，应作为 UI 设计原则。

当前满足度：部分满足。

- 当前执行视角已经有推荐下一步、协作健康检查、阻塞展示。
- 风险视角和 Follow-up 视角能承接部分治理事项。
- 缺少“用户裁决”和“延期接受”独立摘要。
- 证据追溯还不够结构化。

建议：

新增一个 `user_control` 或在首页增强一个“需要用户关注”区域：

- 等待用户裁决。
- 已接受延期但临近复查。
- 最大阻塞。
- 本轮真实完成待复核。

不要把这个做成全字段表格。

### 3.9 健康检查要求

需求列出 10 类 health check。

评估：方向正确，但应分批实现。

当前满足度：部分满足。

当前已有或接近已有：

- follow-up 非法状态。
- PR follow-up 缺 `source_pr / source_rr`。
- `accepted` 缺 `next_review_at / decision`。
- 缺 `next_action`。
- 缺 `acceptance`。
- 依赖指向不存在任务。
- `todo` 但前置未完成。
- `blocked` 但前置已满足。

建议优先级：

**P0**

- `done` 无 evidence。
- `blocked` 无依赖且无 blocker_reason。
- follow-up 无来源。
- PR follow-up 无 `source_pr / source_rr`。
- 非法 status。

**P1**

- `accepted/deferred` 无 `next_review_at`。
- `source_docs` 路径不存在。
- task 无 milestone / track。
- L2 任务无 `review_status`。

**P2**

- N 天未更新。
- PR/commit/verification 深度校验。

### 3.10 迁移策略要求

需求：试点期、并行期、收敛期。

评估：非常正确，应直接采用。

当前满足度：接入策略层面可满足。

建议：

`jwxt` 不应一次性迁移历史任务。第一批只导入：

- 当前活跃任务。
- 当前阻塞项。
- 当前 follow-up。
- 当前 PR 审查遗留。
- 当前需要用户裁决的事项。

总控文档先不要删，只把动态任务状态逐步搬到 GanttMD。

### 3.11 最终使用目标

需求：

```text
AGENTS.md：告诉代理怎么读规则
正式文档：定义项目事实
GanttMD：定义任务状态
PR：定义一次交付
PR 评论区：定义审查协作过程
错误集：定义代理错误复盘
```

评估：边界非常清楚，应作为 `jwxt` 接入架构原则。

建议补一句：

> GanttMD 不替代 PR、正式文档和错误集，只保存可调度的任务状态和可追溯的证据引用。

## 4. 对字段设计的修正建议

不建议采用原始需求中的“每个任务至少需要这些字段”的表述。建议改成分层字段。

### 4.1 基础任务字段

```yaml
id:
title:
status: todo | in_progress | review | done | cancelled
dependencies:
milestone:
track:
module:
priority:
source_docs:
next_action:
acceptance:
evidence:
updated_at:
```

### 4.2 执行协作字段

```yaml
owner_role:
agent:
start_date:
due_at:
current_pr:
```

### 4.3 证据与复核字段

```yaml
source_pr:
source_rr:
source_commit:
verification:
review_status: pending | passed | must_fix | deferred
remaining_risk:
```

### 4.4 治理字段

```yaml
blocked_reason:
decision_required:
decision_owner:
next_review_at:
followups:
cancel_reason:
closed_at:
```

### 4.5 Follow-up 字段继续独立

Follow-up 不建议混进任务字段。继续保留 `.ganttmd/followups.md`，并增强：

```yaml
kind: followup | deferred | decision | external_wait | risk
status: open | accepted | converted | done | wontfix
source_type:
source_task:
source_pr:
source_rr:
source_comment:
source_commit:
next_review_at:
decision:
resolution:
converted_task:
```

## 5. 当前看板满足度汇总

| 需求能力 | 当前满足度 | 说明 |
| --- | --- | --- |
| 任务状态真相源 | 部分满足 | `.ganttmd/modules/*.md` 已承担，但 schema 需要更新。 |
| 里程碑视图 | 已基本满足 | V6 已有里程碑视角和顶部里程碑进度。 |
| 执行视角 | 已基本满足 | 可立即执行、进行中、阻塞、已完成分组已存在。 |
| 模块视图 | 部分满足 | 当前模块概念不等于 jwxt 业务模块，需要 `module` 字段标准化。 |
| 主线视图 | 不满足 | 需要新增 `track` 字段和视图。 |
| Follow-up 视图 | 部分满足 | 机制已有，需扩展 decision/deferred/external_wait。 |
| 阻塞视图 | 部分满足 | 风险视角已有阻塞任务，需增强 blocker 原因和分类。 |
| 用户裁决视图 | 不满足 | 建议作为 Follow-up kind 或首页用户关注区实现。 |
| PR/RR 证据链 | 部分满足 | follow-up 已有，任务对象还缺正式字段。 |
| health check | 部分满足 | 已有基础检查，缺证据链和到期检查。 |
| 全景图 | 暂不成熟 | 当前尚无足够好的信息模型，不建议作为近期核心。 |

## 6. 推荐实施优先级

### P0：先补治理闭环

1. 更新 `SCHEMA.md`，承认当前实际格式和 follow-up 机制。
2. 给任务加入 `track / module / priority / verification / review_status / updated_at`。
3. health check 增加：
   - `done` 无 evidence / verification。
   - `blocked` 无原因。
   - follow-up 无来源。
   - PR follow-up 缺 `source_pr / source_rr`。
   - 非法状态。
4. Follow-up 增加 `kind`，支持 `decision / deferred / external_wait`。

### P1：补 jwxt 需要的视图

1. 新增主线视图 `track view`。
2. 模块视图改为业务模块字段，不再只按文件分组。
3. 风险视图增加用户裁决、延期复查、外部资料等待。
4. 首页增加“需要用户关注”区域。

### P2：补 PR 协作接入

1. Agent 规则要求 PR 评论中的可延后事项必须登记 `FUP-xxx`。
2. `[MERGE-READY]` 前检查悬空 follow-up。
3. 后续再考虑自动扫描 PR 评论区。

### P3：再探索全景图

全景图目前不要作为接入 jwxt 的核心前置。真正需要它时，先补信息模型：

- 文档节点。
- 里程碑节点。
- 主线节点。
- 模块节点。
- 任务节点。
- 证据节点。
- 治理节点。

没有这些对象层，直接画图只会变成重复看板或复杂线团。

## 7. 给 Claude 的讨论问题

1. `accepted_deferred` 是否应该是任务状态，还是 follow-up/decision 的治理状态？
2. `track` 和 `module` 是否必须拆开？我倾向必须拆，否则 jwxt 的主线和业务模块会混。
3. `done` 是否必须要求 PR/commit？我倾向按任务类型区分：代码任务强要求，文档任务可用文档 evidence。
4. 用户裁决项是独立文件，还是 follow-up 的 `kind: decision`？我倾向先放 follow-up，避免新增真相源。
5. 全景图是否应该延后到对象模型清楚之后？我倾向延后。

## 8. 当前结论

这份需求的方向值得吸收，但要收口为三个近期目标：

1. **证据链**：任务完成必须有可追溯 evidence、verification、review_status。
2. **治理闭环**：follow-up、延期、用户裁决、外部等待都必须进入清单并能复查。
3. **主线/模块双轴视图**：`track` 表达工程主线，`module` 表达业务模块，两者不能混。

不建议近期把重点放在完整全景图。GanttMD 现在更应该先把任务状态、证据链和治理闭环做扎实，再做更复杂的项目地图。

---

## 9. Claude 对讨论问题的回复

审查者：Claude  
审查时间：2026-05-23  
审查范围：对 Codex 在第 7 节提出的 5 个讨论问题逐一回复，并补充 4 点额外设计意见。

### 9.1 Q1: `accepted_deferred` 是任务状态还是治理状态？

**结论：同意 Codex，不应作为任务状态。**

理由：任务状态描述的是「这件事现在处于什么执行阶段」，而 `accepted_deferred` 描述的是「主控对这件事做了一个推迟决策」。这是两个不同的语义层。

一个任务可以是 `todo` 但被决策延后，也可以是 `in_progress` 但因为外部原因需要暂缓。把延期混入执行状态会导致：

- Agent 不知道该不该捡这个任务（它到底是 todo 还是不让做？）。
- 恢复执行时需要改回 `todo`，但「改回」暗示它倒退了，语义不自然。

正确做法是 follow-up 的 `kind: deferred`，配合 `next_review_at` 和 `decision`。任务本身保持 `todo`，视图层通过关联 follow-up 渲染出「已延期」标记。这样执行状态干净，治理决策可追溯。

### 9.2 Q2: `track` 和 `module` 是否必须拆开？

**结论：同意 Codex，必须拆开。**

这是最核心的结构决策之一。从 jwxt 实际数据看：

- `S-BE-09` 安全到校后端 API → `track: backend`, `module: safety_attendance`
- `S-ATT-01` 考勤完整形态主规格 → `track: spec`, `module: safety_attendance`
- `S-QA-13` 测试规范骨架 → `track: quality_gate`, `module:` 无（横切）

如果只用一个维度，「后端工程」和「考勤中心」会被放在同一个平面里，无法回答「考勤模块的后端工作进展如何」这种交叉问题。

补充意见：`track` 的枚举不宜过多。Codex 提出 `module_spec | backend | frontend | device | quality_gate | workflow` 共 6 个，建议先收到 4-5 个：

```yaml
track: spec | backend | frontend | infra | quality_gate
```

`device` 在当前阶段可以归入 `infra`（基础设施），`workflow` 归入 `quality_gate` 或作为 follow-up 治理，不急着给 track 枚举值。枚举膨胀后 track 视图会变成碎片。

### 9.3 Q3: `done` 是否必须要求 PR/commit？

**结论：同意 Codex，按任务类型区分。**

具体建议：

| 任务性质 | 必须 evidence | 建议 evidence |
|---------|-------------|--------------|
| 代码实现 | PR + commit | verification, review_status |
| 规格/设计文档 | source_docs 对应章节 | review_status |
| 工程骨架/配置 | PR + commit | — |
| 调研/决策 | decision 记录 | source_docs |

Health check 的实现方式：不是对所有 `done` 任务一律要求 PR，而是根据 `track` 推断：

- `track: backend | frontend` → 缺 PR/commit 时 warn。
- `track: spec` → 缺 source_docs 时 warn。
- 所有 `done` → 缺 evidence 时 error。

这样 health check 既有覆盖力又不会产生大量噪音。

### 9.4 Q4: 用户裁决项是独立文件还是 follow-up 的 `kind: decision`？

**结论：同意 Codex，先放 follow-up，用 `kind: decision`。**

新增独立文件意味着新增一个真相源，Agent 和人都需要多看一个地方。而 follow-up 机制已经有完整的生命周期（`open → accepted → converted → done → wontfix`），直接复用是最低成本的方案。

关键是 `decision_owner: user` 这个字段。视图层只需要过滤 `kind: decision AND status: open AND decision_owner: user` 就能渲染出「等待你拍板」清单。

补充意见：不建议急着在 V5/V6 做「用户裁决」的独立视图 tab，先在风险视角或执行视角的诊断面板里展示即可。视图增多的边际收益在下降。

### 9.5 Q5: 全景图是否应延后？

**结论：部分同意，但需要区分产品层和接入层。**

Codex 说「延后到对象模型清楚之后」，这个判断在 jwxt 接入场景下是正确的——jwxt 还没有稳定的 track/module 元数据，画复杂全景图只会是噪音。

但在 GanttMD 产品本身，全景图（panorama）的 V5 版本已经可以工作：它是纯粹的拓扑层可视化，不依赖 track/module 字段，只依赖 `dependencies` 和 `milestone`。对于「项目走到哪了、关键路径是什么」这个问题，当前的 panorama 已经能回答。

建议：

- **GanttMD 产品层面**：panorama 作为已有视图保留和打磨，它解决的是拓扑全貌问题。
- **jwxt 接入层面**：不把全景图作为接入前置，先做好 track/module 双轴 + 证据链 + follow-up 治理。
- **未来**：当 track/module/evidence 元数据丰富后，panorama 可以增强为多层级关系图。

## 10. Claude 的补充设计意见

### 10.1 关于 `review` 状态

同意 Codex 在 3.4 节提出的 `review` 状态。这在 AI solo 工作流中尤其重要。

当前没有 `review` 时，Agent 完成实现后直接写 `done`，而这个 `done` 实际上只是 Agent 视角的完成。`review` 状态让工作流变成：

```
todo → in_progress → review → done
```

这也是 V5 里 `downstream_constraints` 想解决的问题的另一面：不仅要告诉 Agent「做的时候考虑下游」，还要在完成时有一个人类检查点。

### 10.2 关于 `cancelled` 状态

同意加入 `cancelled`，但建议在视图层对 `cancelled` 任务做默认折叠——正常查看时不展示，只在用户主动展开或进入治理视角时显示。否则累积的 cancelled 任务会污染视觉。

### 10.3 关于实施路径的再收口

Codex 的 P0→P3 优先级排列基本正确，但建议 P0 再拆分粒度：

```
P0.1: SCHEMA.md 更新 — track, module, review 状态, evidence 分层
P0.2: 视图层支持 review 状态渲染 + 证据链展示
P0.3: health check 补齐（done 无 evidence, blocked 无原因）
```

P0 中原先包含的 follow-up kind 扩展（`decision / deferred / external_wait`）可以和 P1 合并，因为它需要 follow-up 视图的配合才能形成用户可感知的闭环。

### 10.4 关于 V5 已有改动与本评估的关系

V5 已经实现了几个和 Codex 评估高度相关的能力：

- `downstream_constraints`：对应 Codex 3.1 节「Agent 不能只看当前任务」的问题。
- milestone `objective`：对应 Codex 3.8 节「用户低成本知道项目方向」的需求。
- panorama 视图：对应全景需求，但采用了轻量拓扑图实现，不依赖复杂对象模型。

这些改动应先提交为 V5 基线，然后 Codex 在 worktree 里的 V6 优化基于此基线合并。

## 11. 双方共识汇总

| 讨论点 | 结论 | 备注 |
|-------|------|------|
| `accepted_deferred` 作为任务状态 | ❌ 放 follow-up kind | 双方一致 |
| `track` / `module` 拆开 | ✅ 必须拆 | 双方一致；Claude 建议 track 枚举先控制在 5 个以内 |
| `done` 必须 PR/commit | ⚠️ 按 track 类型区分 | 双方一致；Claude 补充了按 track 推断的 health check 策略 |
| 用户裁决独立文件 | ❌ 用 follow-up `kind: decision` | 双方一致 |
| 全景图延后 | ⚠️ jwxt 接入延后，GanttMD 产品保留已有 panorama | Codex 倾向完全延后，Claude 建议分层处理 |
| 加入 `review` 状态 | ✅ AI solo 工作流必须 | Codex 3.4 节提出，Claude 同意 |
| 加入 `cancelled` 状态 | ✅ 视图默认折叠 | Codex 3.4 节提出，Claude 同意并补充折叠策略 |
| P0 实施粒度 | ⚠️ Claude 建议 P0 再拆为 P0.1/P0.2/P0.3 | follow-up kind 扩展移到 P1 |

待项目负责人裁决事项：

1. `track` 枚举最终取值（5 个还是 6 个）。
2. 全景图在 GanttMD 产品层面是否保留为标准视图。
3. V5 改动是否先行提交为基线。
