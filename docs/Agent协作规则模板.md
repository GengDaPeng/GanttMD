# Agent 协作规则模板

复制到目标项目根目录的 `AGENTS.md`，并按项目实际路径调整。本文只保留每次会话都必须知道、且工具无法替代的项目级硬边界。

## 任务管理：GanttMD

### 入口

- 任务状态唯一真相源：`.ganttmd/config.yaml`、`.ganttmd/tasks/*.md`、`.ganttmd/followups.md`
- 执行批次与 worktree 承接记录：`.ganttmd/runs.md`
- 人类查看入口：`ganttmd start` 本地看板；`ganttmd serve` 只用于前台调试
- 字段、状态和规则以项目内 `.ganttmd/`、`ganttmd validate` 和 `ganttmd doctor` 为准

### 工作边界

- 工作前先读取 `.ganttmd/config.yaml` 和与本次任务相关的 `tasks/followups`，不得跳过 GanttMD 自行决定下一步
- 执行任务前必须读取当前任务列出的 `source_docs`；它是需求/设计依据引用，不是进度真相源
- 不得凭空编造任务、来源文档、依赖或完成证据
- 不得修改与当前任务无关的任务状态
- 普通 Agent 不得关闭、删除、转换 follow-up
- 普通 Agent 不得归档或恢复任务；归档只由项目主控处理
- “后续再做 / 暂不处理 / 本轮不修”等未闭环事项必须登记到 `followups.md`
- 连续任务、worktree 分支或批次推进必须登记或更新 `runs.md`
- worktree/分支只能领取主分支已有任务，不得创建新的顶层 `ganttmd-task`
- worktree/分支只能维护当前任务内的 `ganttmd-checklist`，不得改任务依赖、里程碑、主线、验收标准等结构字段
- 任务关闭后，项目主控必须把 checklist 结果收口到 evidence、verification、follow-up 或新任务，并删除 checklist
- worktree/分支只能追加 `status: open` 的 follow-up；接受、转任务、关闭或拒绝必须由项目主控在主分支处理
- 大范围重排任务文件必须先得到用户明确要求

### 提交前

- 运行 `ganttmd validate` 和 `ganttmd doctor`（项目根目录下），按提示修复；确需保留异常时，说明原因并交给项目主控裁决
