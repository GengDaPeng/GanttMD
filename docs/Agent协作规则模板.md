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

## 不允许的行为

Agent 不得：

- 跳过 `.ganttmd/` 直接自行决定下一步。
- 领取依赖未完成的任务。
- 把 `blocked` 写入 `status`。
- 完成任务但不补 `evidence`。
- 大范围重排任务文件，除非用户明确要求。
- 修改与当前任务无关的任务状态。

