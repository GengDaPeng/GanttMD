# GanttMD Agent 操作协议样例

本目录是 GanttMD 的离线样例，不是 `jwxt` 原项目工作区。Agent 只能修改本样例内的 `.ganttmd/` 文件，不得反写 `source-docs/`，也不得修改 `/Users/gpp/project/gitee/jwxt`。

## 任务读取规则

1. 读取 `.ganttmd/config.yaml`，确认项目和里程碑。
2. 扫描 `.ganttmd/modules/*.md`。
3. 每个任务由一个 `ganttmd-task` 代码块定义。
4. 任务源状态只允许：`todo`、`in_progress`、`done`。
5. `blocked` 不是源状态。若 `todo` 任务的依赖未全部 `done`，视图层显示为 blocked。

## 领取任务

领取任务前先检查：

1. 任务 `status` 是否为 `todo`。
2. `dependencies` 中的任务是否全部为 `done`。
3. 当前文件是否正在被用户或其他 Agent 修改。

领取时只修改目标任务的 `status`：

```yaml
status: in_progress
```

## 完成任务

完成任务时只修改目标任务的 `status`：

```yaml
status: done
```

如果完成结果需要说明，把说明写在任务正文中，不要新增未定义字段。

## 阻塞说明

业务阻塞不写入 `status`。在任务正文中使用引用说明：

```markdown
> BLOCKED: 等待第三方 SDK 发布。
```

依赖阻塞由视图层根据 `dependencies` 自动计算。
