# jwxt-lite 样例

这是 GanttMD 的最小真实项目样例，任务来源于 `jwxt` 的项目总控与模块规格进度文档快照。

## 目录说明

- `.ganttmd/config.yaml`：样例项目与里程碑配置。
- `.ganttmd/modules/*.md`：GanttMD 任务数据，采用“模块文件 + YAML fenced block”格式。
- `source-docs/`：从 `jwxt` 复制来的进度文档快照，只作来源证据，不参与解析。
- `AGENTS.md`：Agent 操作协议样例。
- `index.html`：Claude Code 版本展示原型。
- `index-v2.html`：依赖关系与抽屉交互验证版本。
- `index-v3.html`：执行视角、健康检查、Agent 指令草案和任务字段验证版本。
- `index-v4.html`：内置视图配置驱动、风险视图和 `views.enabled/default` 验证版本。
- `JWXT进度主控演示.md`：以 `jwxt` 进度主控身份演示如何从源文档抽取 GanttMD 任务。
- `.ganttmd/followups.md`：Follow-up 清单，所有 Agent 可追加，只有主控可清理和转正式任务。

## 使用方式

1. 用浏览器打开 `index-v3.html`。
2. 点击页面上的目录选择按钮。
3. 选择本目录或本目录下的 `.ganttmd` 目录。
4. 页面会解析 `.ganttmd/modules/*.md` 并展示模块进度、任务状态和依赖阻塞。

## 当前验证点

- 三态模型：`todo / in_progress / done`。
- 视图层自动计算 blocked。
- 跨模块依赖：`module-specs.md` 中任务依赖 `backend-engineering.md` 中的任务。
- 手工业务阻塞：任务正文中的 `> BLOCKED: ...`。
- 执行视角：推荐下一步、被阻塞任务、进行中任务和已完成任务分组。
- Agent 指令草案：基于 `source_docs / next_action / acceptance` 模板化生成。
- 任务字段健康检查：提示缺少 `next_action`、`acceptance`、`owner/agent` 等协作字段。
- Follow-up 视角：展示 open / accepted / converted / done / wontfix / invalid 累积情况，并校验 PR 来源字段。
- V4 风险视图：聚合阻塞任务、未清理 Follow-up 和严重健康检查提示。
- V4 视图开关：通过 `.ganttmd/config.yaml` 的 `views.enabled/default` 控制启用视图和默认视图。

## 当前源文档快照

`source-docs/` 当前包含 5 份 `jwxt` 进度材料：

- `00-项目总控看板.md`
- `00-项目总控执行待办.md`
- `00-模块规格推进清单.md`
- `00-跨域依赖收口总账.md`
- `00-延期能力与升级门总账.md`
