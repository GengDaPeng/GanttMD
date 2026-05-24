# GanttMD Agent 操作协议样例

本目录是 GanttMD 的离线样例，不是 `jwxt` 原项目工作区。Agent 只能修改本样例内的 `.ganttmd/` 文件，不得反写 `source-docs/`，也不得修改 `/Users/gpp/project/gitee/jwxt`。

## 任务读取规则

1. 读取 `.ganttmd/config.yaml`，确认项目和里程碑。
2. 按本次任务读取相关 `.ganttmd/tasks/*.md`。
3. 每个任务由一个 `ganttmd-task` 代码块定义。
4. 任务源状态只允许：`todo`、`in_progress`、`review`、`done`、`cancelled`。
5. `blocked` 不是源状态。若 `todo` 任务的依赖未全部 `done`，视图层显示为 blocked。
6. 执行任务前读取当前任务的 `source_docs`；它是需求、设计或证据依据，不是第二套进度真相源。

## 领取任务

领取任务前先检查：

1. 任务 `status` 是否为 `todo`。
2. `dependencies` 中的任务是否全部为 `done`。
3. 当前文件是否正在被用户或其他 Agent 修改。

领取时更新目标任务的执行字段：

```yaml
status: in_progress
agent: codex
start_date: 2026-05-21
```

## 完成任务

完成任务时更新目标任务的完成字段：

```yaml
status: done
```

如果完成结果需要说明，把说明写在任务正文中，并补充 `evidence`。

## 阻塞说明

业务阻塞不写入 `status`。在任务正文中使用引用说明：

```markdown
> BLOCKED: 等待第三方 SDK 发布。
```

依赖阻塞由视图层根据 `dependencies` 自动计算。

## 协作字段

样例任务支持以下协作字段：

```yaml
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 明确下一步具体动作
acceptance: [完成边界 1, 完成边界 2]
evidence: []
agent: codex
owner: gpp
start_date: 2026-05-21
completed_date: 2026-05-21
review_status: pending
verification: 测试命令、CI 或手工验证说明
```

`source_docs` 放来源文档路径，`next_action` 放下一步动作，`acceptance` 放任务级完成边界。不要把长篇业务设计搬进任务块。
