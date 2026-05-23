# Follow-up 清单机制

Follow-up 清单用于解决 Agent “口头闭环”的问题。

只要 Agent 在回复、审查、实现说明或任务总结中写出“后续再做”“follow-up”“以后优化”“暂不处理”“后续补齐”等内容，就必须判断是否登记到 `.ganttmd/followups.md`。

没有登记到清单的 follow-up，不视为进入项目跟踪。

## 1. 权限模型

Follow-up 的权限分两层：

| 角色 | 可以做 | 不可以做 |
| --- | --- | --- |
| 普通 Agent | 新增 `status: open` 的 follow-up；对已有 follow-up 只能追加 `comment` / `evidence` 子项 | 删除、关闭、合并、转正式任务、修改原字段、修改关闭结论 |
| 项目主控 | 清理、关闭、合并、转正式任务、修改状态、写 resolution | 无 |

核心规则：

> 发现问题民主化，项目计划集中化。

所有 Agent 都可以发现和登记问题，但只有项目主控可以判断是否进入正式计划。

## 2. 文件位置

MVP 使用一个文件：

```text
.ganttmd/followups.md
```

后续数量变多时再拆：

```text
.ganttmd/followups/
  engineering.md
  product.md
  risk.md
```

## 3. 状态

```yaml
status: open
status: accepted
status: converted
status: done
status: wontfix
```

含义：

- `open`：已登记，未清理。
- `accepted`：主控确认要处理，但尚未转正式任务。
- `converted`：已转成 `.ganttmd/modules/*.md` 正式任务。
- `done`：已处理完成。
- `wontfix`：明确不做，保留原因。

普通 Agent 只能新增 `open`。

`accepted / converted / done / wontfix` 只能由项目主控设置。

`accepted` 不是口头承诺状态。设置为 `accepted` 时，必须同时填写：

```yaml
accepted_by: project-control
accepted_at: 2026-05-22
next_review_at: 2026-06-10
decision: 保留为 M5 风险清理项，暂不转正式任务
```

缺少以上字段的 `accepted` 应视为非法数据，项目主控必须优先清理。

## 4. 字段

示例：

```yaml
id: FUP-001
title: queryStatuses 后续优化
kind: followup
status: open
source_type: pr_review
source_pr: PR#27
source_rr: RR-003
source_comment: https://example.com/review-comment
source_commit: abcdef1
source_task: S-BE-09
created_by: codex
created_at: 2026-05-22
reason: 当前使用内存分页，后续应改为 SQL UNION 或日状态投影表
suggestion: M5 验收前由主控判断是否转正式任务
severity: medium
owner: project-control
target_milestone: M5
resolution:
converted_task:
```

来源字段说明：

| 字段 | 说明 |
| --- | --- |
| `source_type` | 来源类型：`pr_review / task / discussion / user / ci` |
| `source_pr` | 来源 PR，例如 `PR#27` |
| `source_rr` | 来源 review record，例如 `RR-003` |
| `source_comment` | 来源评论链接或评论 ID |
| `source_commit` | 来源提交 hash |
| `source_task` | 来源任务 ID |

来自 PR 评论区或 PR 审查结论的 follow-up，`source_type` 必须是 `pr_review`，并且 `source_pr` 和 `source_rr` 必填。

`kind` 用来区分事项性质：

| kind | 含义 |
| --- | --- |
| `followup` | 普通后续事项 |
| `decision` | 等待用户或主控裁决 |
| `deferred` | 已接受延期，等待复查 |
| `external_wait` | 等待外部资料或第三方反馈 |
| `risk` | 高风险事项 |

用户裁决不单独新增文件，优先写为：

```yaml
kind: decision
decision_owner: user
status: open
```

延期接受不写入任务状态，优先写为：

```yaml
kind: deferred
status: accepted
next_review_at: 2026-06-10
decision: 主控接受延期，M5 验收前复查
```

## 5. 普通 Agent 写入规则

普通 Agent 新增 follow-up 时只能追加新条目。

必须填写：

- `id`
- `title`
- `status: open`
- `source_type`
- `created_by`
- `created_at`
- `reason`
- `suggestion`
- `severity`

可以补充：

- `source_task`
- `target_milestone`
- `evidence`
- `source_pr`
- `source_rr`
- `source_comment`
- `source_commit`

不得修改：

- 其他 Agent 已写入的原始字段。
- 其他 Agent 写的关闭结论。
- `status` 到非 `open`。
- `resolution`。
- `converted_task`。

如果普通 Agent 需要补充已有 follow-up，只能追加 `comment` / `evidence` 子项，不能直接改原字段。

## 6. 项目主控清理规则

项目主控定期清理时，对每个 `open` follow-up 做判断：

1. 是否重复。
2. 是否仍然有效。
3. 是否影响当前里程碑。
4. 是否应该转正式任务。
5. 是否只是记录后关闭。

主控可以做：

- `open -> accepted`
- `open -> converted`
- `open -> done`
- `open -> wontfix`
- 合并重复项。
- 将重要 follow-up 写入 `.ganttmd/modules/*.md` 正式任务。

如果转正式任务，必须填写：

```yaml
status: converted
converted_task: S-XXX-01
resolution: 已转正式任务
```

如果接受但暂不转正式任务，必须填写：

```yaml
status: accepted
accepted_by: project-control
accepted_at: 2026-05-22
next_review_at: 2026-06-10
decision: 保留到下一次主控清理窗口复核
```

## 7. 看板展示

看板应展示：

- open 数量。
- accepted 数量。
- converted 数量。
- done 数量。
- wontfix 数量。
- invalid 数量。
- 按 source_task 查看某个任务留下的 follow-up。
- 按 source_pr / source_rr 追踪 PR 审查留下的 follow-up。

主控清理时优先看：

1. `severity: high`
2. `target_milestone` 等于当前里程碑
3. 长期 `open`
4. 来自已完成任务但未处理的 follow-up
