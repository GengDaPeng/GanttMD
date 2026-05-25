# AI 生成初始任务文件指南

本文面向想用 AI Agent 初始化 GanttMD 的开发者。目标是从已有项目材料中生成 `.ganttmd/`，而不是让 Agent 凭空规划项目。

## 输入材料

优先读取：

1. README。
2. 产品需求或路线图。
3. 技术设计或架构说明。
4. issue、PR、changelog 或已有任务清单。
5. 测试、发布或运维说明。

如果材料不足，先让 Agent 输出缺口清单，不要直接生成大量任务。

## 输出结构

推荐生成：

```text
.ganttmd/
  README.md
  config.yaml
  followups.md
  runs.md
  tasks/
    product.md
    engineering.md
    quality.md
```

任务文件可以按项目维护习惯调整。不要机械按代码目录拆分；任务归属由 `track` 和 `domain` 表达。

## 任务抽取标准

写成任务的事项应满足：

- 有明确产出。
- 可以判断完成或未完成。
- 能挂到里程碑或工作主线。
- 对后续任务有依赖影响，或需要被领取推进。

不要写成任务：

- 纯背景说明。
- 长篇设计原则。
- 已经关闭且不影响后续的历史讨论。
- 尚未确认的想法。
- 没有完成判断的宽泛方向。

## 状态映射

| 来源状态 | GanttMD `status` | 说明 |
| --- | --- | --- |
| 已完成 | `done` | 应补 `evidence` |
| 进行中 | `in_progress` | 应补 `owner` 或 `agent` |
| 等待复核 | `review` | 应补 `review_status` |
| 未开始 | `todo` | 可被领取 |
| 明确取消 | `cancelled` | 应补取消原因 |

`blocked` 通常不手写。看板会根据依赖自动展示被阻塞任务。外部阻塞可以写入 `blocked_reason` 或 follow-up。

## 编号建议

使用稳定、可读、不会频繁变动的 ID：

```text
SPEC-001
FE-001
BE-001
QA-001
OPS-001
```

同一项目内保持风格一致即可。

## 任务块示例

```ganttmd-task
id: BE-001
title: 实现笔记同步 API
kind: task
status: todo
dependencies: [SPEC-001]
milestone: M2
track: backend
domain: sync
priority: P0
source_docs: [docs/architecture.md]
next_action: 实现保存接口和版本冲突响应
acceptance: [保存接口幂等, 版本冲突返回 409, 错误响应含可读 message]
evidence: []
updated_at: 2026-05-25
```

`source_docs` 是依据引用，不是第二套进度来源。它可以指向需求、设计、测试计划、issue、PR 或 commit。

## Follow-up 抽取

写入 `.ganttmd/followups.md` 的事项应是：

- 当前不适合直接做成任务。
- 但后续需要复查、决策或追踪。
- 不记录就容易在聊天、PR 或会议纪要中丢失。

示例：

```ganttmd-followup
id: FUP-001
title: 自动化端到端测试延后到同步 API 稳定后
kind: deferred
status: accepted
source_type: planning
source_task: QA-002
created_by: qa-dev
created_at: 2026-05-25
accepted_by: tech-lead
accepted_at: 2026-05-25
next_review_at: 2026-06-10
decision: 同步 API 字段稳定前只维护回归清单
reason: 当前接口还在变化，过早写端到端测试会增加维护成本
suggestion: BE-002 完成后复查 QA-002
severity: medium
```

## 推荐提示词

```text
你要为这个项目初始化 GanttMD 任务状态数据。

请先读取 README、需求、架构、测试或已有任务材料。
不要凭空创建任务。

输出：
1. .ganttmd/config.yaml
2. .ganttmd/tasks/*.md
3. .ganttmd/followups.md
4. .ganttmd/runs.md

要求：
- 任务必须有稳定 id、status、dependencies、milestone、track、domain、source_docs、next_action 和 acceptance。
- done 任务必须有 evidence。
- 工程类 done 任务必须有 verification。
- 暂不处理但需要追踪的事项写入 followups.md。
- 完成后运行 ganttmd validate，并修复 warning。
```
