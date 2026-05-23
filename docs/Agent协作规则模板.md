# Agent 协作规则模板

把本文件内容复制到目标项目根目录的 `AGENTS.md`，并按项目实际情况修改路径。

## 项目进度入口

本项目使用 GanttMD 跟踪项目进度。

任务数据位置：

```text
.ganttmd/config.yaml
.ganttmd/modules/*.md
```

可视化页面位置：

```text
tools/ganttmd/index.html
```

## 工作前必须读取

Agent 开始任何项目推进任务前，必须先读取：

1. `.ganttmd/config.yaml`
2. `.ganttmd/modules/*.md`
3. 当前任务的 `source_docs`

如果任务没有 `source_docs`，先读取项目根目录的 README、需求总览或用户指定文档，再补充任务字段。

## 初始化或生成进度文档

如果项目尚未创建 `.ganttmd/`，Agent 应先按照 `docs/AI生成进度文档指南.md` 的规则生成。

生成前必须读取：

1. 项目总控看板或路线图。
2. 项目执行待办或任务清单。
3. 模块推进清单。
4. 跨域依赖、风险、延期能力或升级门总账。
5. 用户本轮明确指定的阶段目标。

生成时必须遵守：

- 只从已有文档和用户明确指令抽取任务，不凭空规划。
- 只把有明确产出、状态和完成判断的事项写成任务。
- 暂缓项、历史说明和模块内部派单不要默认写入系统级执行队列。
- 每次生成后输出：新增任务、更新任务、未纳入事项、风险和需要用户裁决的问题。

## 任务状态

任务源状态只允许使用：

```yaml
status: todo
status: in_progress
status: done
```

不要把 `blocked` 写成源状态。

阻塞由依赖自动计算：如果一个 `todo` 任务的 `dependencies` 中存在未完成任务，则视为被阻塞。

## 如何选择任务

优先选择满足以下条件的任务：

1. `status: todo`
2. `dependencies` 全部为 `done`
3. `source_docs` 明确
4. `next_action` 明确
5. `acceptance` 明确

不要领取依赖未完成的任务。

## 如何领取任务

领取任务前：

1. 确认任务不是被阻塞状态。
2. 确认没有其他 Agent 或用户正在修改同一任务。
3. 读取 `source_docs`。

领取时更新任务块：

```yaml
status: in_progress
agent: codex
start_date: 2026-05-21
```

`agent` 可以改成实际执行者，例如 `claude`、`codex`、`opencode`。

## 如何完成任务

完成任务前：

1. 对照 `acceptance` 检查是否满足。
2. 补充 `evidence`。
3. 必要时更新相关源文档。

完成时更新：

```yaml
status: done
completed_date: 2026-05-21
evidence: [docs/xxx.md, commit:abcdef]
```

如果只完成了部分内容，不要改为 `done`。应更新任务正文说明剩余问题。

## 如何处理阻塞

如果任务依赖未完成：

1. 不要领取该任务。
2. 查看 `dependencies` 中未完成的前置任务。
3. 优先推进前置任务。

如果任务存在外部业务阻塞，不要把 `status` 改成 `blocked`，应在任务正文中写：

```markdown
> BLOCKED: 等待第三方接口确认，负责人为 xxx。
```

## 如何维护字段

如果发现任务缺少字段，应优先补齐：

```yaml
source_docs: []
next_action:
acceptance: []
```

字段补齐应基于真实项目文档，不要凭空编造。

## Follow-up 规则

本项目使用 `.ganttmd/followups.md` 跟踪后续事项。

如果 Agent 在回复、审查、实现说明或任务总结中使用以下表达，必须判断是否登记 follow-up：

- 后续再做
- follow-up
- 以后优化
- 暂不处理
- 后续补齐
- 后续专项承接
- 本轮不修

普通 Agent 可以做：

- 追加新的 `status: open` follow-up。
- 对已有 follow-up 追加 `comment` / `evidence` 子项。
- 标记 `created_by` 和 `created_at`。

普通 Agent 不得做：

- 删除 follow-up。
- 修改已有 follow-up 的原始字段。
- 把 follow-up 标记为 `done`。
- 把 follow-up 标记为 `wontfix`。
- 把 follow-up 标记为 `converted`。
- 将 follow-up 转成正式任务。
- 修改 `resolution` 或 `converted_task`。

只有项目主控可以清理、关闭、合并或转正式任务。

普通 Agent 新增 follow-up 时必须使用：

```yaml
status: open
source_type: pr_review | task | discussion | user | ci
```

如果 follow-up 来自 PR 审查或 PR 评论，必须填写：

```yaml
source_type: pr_review
source_pr: PR#27
source_rr: RR-003
```

如果普通 Agent 认为某个 follow-up 应关闭或转正式任务，只能追加建议，不得直接改状态。

项目主控把 follow-up 设置为 `accepted` 时，必须同时填写：

```yaml
accepted_by: project-control
accepted_at: 2026-05-22
next_review_at: 2026-06-10
decision: 保留到下一次主控清理窗口复核
```

## 不允许的行为

Agent 不得：

- 跳过 `.ganttmd/` 直接自行决定下一步。
- 领取依赖未完成的任务。
- 把 `blocked` 写入 `status`。
- 完成任务但不补 `evidence`。
- 口头写 follow-up 但不登记到 `.ganttmd/followups.md`。
- 作为普通 Agent 清理、关闭、合并或转正式任务 follow-up。
- 大范围重排任务文件，除非用户明确要求。
- 修改与当前任务无关的任务状态。
