# Agent 协作规则模板

复制到目标项目根目录的 `AGENTS.md`，并按项目实际路径调整。

## GanttMD 入口

```text
.ganttmd/config.yaml
.ganttmd/tasks/*.md
.ganttmd/followups.md
tools/ganttmd/index.html
```

字段和状态以 `SCHEMA.md`、`docs/任务字段说明.md` 和 `npm run validate -- .` 为准。

## 工作前

1. 先读取 `.ganttmd/config.yaml`、`.ganttmd/tasks/*.md`、`.ganttmd/followups.md`。
2. 如项目提供校验脚本，先运行 `npm run validate -- .`。
3. 执行任务前读取该任务的 `source_docs`。
4. 不领取依赖未完成的任务。

项目尚未创建 `.ganttmd/` 时，按 `docs/AI生成进度文档指南.md` 从已有文档生成；不得凭空规划任务。

## 执行中

- 领取任务：改为 `status: in_progress`，补 `owner` 或 `agent`。
- 等待复核：使用 `status: review`。
- 真实闭环：使用 `status: done`。
- 明确不做：使用 `status: cancelled`，补取消原因或处理结论。
- 提交 `.ganttmd/` 改动前，再运行 `npm run validate -- .`。

校验出现 warning 时，优先修复 `.ganttmd/`；确需保留异常时，说明原因并交给项目主控裁决。

## Follow-up

“后续再做、以后优化、暂不处理、本轮不修、后续专项承接”等未闭环事项必须登记到 `.ganttmd/followups.md`，不能只写在聊天总结或 PR 回复里。

普通 Agent 可以追加新的 `status: open` follow-up，也可以对已有 follow-up 追加补充说明或证据。

普通 Agent 不得删除、关闭、转正式任务、修改原始字段、修改 `resolution` 或 `converted_task`。

## 不允许

- 跳过 `.ganttmd/` 直接自行决定下一步。
- 凭空编造任务、来源文档或完成证据。
- 为绕过依赖随意写 `blocked`。
- 大范围重排任务文件，除非用户明确要求。
- 修改与当前任务无关的任务状态。
- 作为普通 Agent 清理、关闭、合并或转正式任务 follow-up。
