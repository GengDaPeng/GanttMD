# Follow-up 清单机制

Follow-up 用来记录“当前任务中发现，但不应直接混入当前任务范围”的后续事项。

典型场景：

- 需要后续复查的风险。
- 当前版本暂缓处理的改进。
- 外部输入或设计确认。
- PR 审查留下的可追踪后续事项。
- 已决定转成正式任务的遗留事项。

没有写入 `.ganttmd/followups.md` 的事项，不视为进入项目跟踪。

## 推荐维护方式

多 Agent 协作时，建议由一个任务分发 Agent 或看板维护者统一清理 follow-up：

- 执行 Agent 可以追加新的 `status: open` follow-up。
- 看板维护者负责接受、关闭、拒绝、合并或转成正式任务。
- 这样可以避免多个 Agent 同时改变计划状态，导致看板不可信。

小项目也可以由人类维护者直接清理，不一定需要专门 Agent。

## 文件位置

MVP 使用一个文件：

```text
.ganttmd/followups.md
```

数量变多后，可以按项目约定拆分：

```text
.ganttmd/followups/
  product.md
  engineering.md
  release.md
```

## 状态

```yaml
status: open
status: accepted
status: converted
status: done
status: wontfix
```

含义：

- `open`：已登记，尚未清理。
- `accepted`：确认后续要处理，但尚未转成正式任务。
- `converted`：已转成 `.ganttmd/tasks/*.md` 正式任务。
- `done`：已处理完成。
- `wontfix`：明确不做，保留原因。

建议执行 Agent 只新增 `open`。其他状态由看板维护者统一处理。

`accepted` 应同时填写：

```yaml
accepted_by: tech-lead
accepted_at: 2026-05-25
next_review_at: 2026-06-10
decision: 等同步 API 字段稳定后再补自动化测试
```

## 字段示例

```yaml
id: FUP-001
title: 离线恢复体验需要补用户提示
kind: risk
status: open
source_type: task
source_task: FE-003
created_by: frontend-dev
created_at: 2026-05-25
reason: 离线重试失败时用户可能不知道数据是否已保存
suggestion: 在 FE-003 实现时增加失败状态和下一步提示
severity: medium
```

常用字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定 follow-up 编号 |
| `title` | 简短标题 |
| `kind` | `followup`、`decision`、`deferred`、`external_wait`、`risk` |
| `status` | `open`、`accepted`、`converted`、`done`、`wontfix` |
| `source_type` | 来源类型，如 `task`、`planning`、`design`、`pr_review` |
| `source_task` | 来源任务 ID |
| `source_pr` | 来源 PR，例如 `PR#42` |
| `source_rr` | 来源 review record，例如 `RR-001` |
| `created_by` | 记录人或 Agent |
| `created_at` | 创建日期 |
| `reason` | 为什么需要跟踪 |
| `suggestion` | 建议下一步 |
| `severity` | `low`、`medium`、`high` |

来自 PR 审查的 follow-up 建议填写 `source_pr` 和 `source_rr`，便于追溯。

## 转成正式任务

当 follow-up 影响后续交付时，可以转成正式任务：

1. 在 `.ganttmd/tasks/*.md` 新增 `ganttmd-task`。
2. 在 follow-up 中设置 `status: converted`。
3. 填写 `converted_task` 和 `resolution`。

示例：

```yaml
status: converted
converted_task: QA-002
resolution: 已转为端到端测试任务
```
