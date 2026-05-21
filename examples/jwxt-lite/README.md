# jwxt-lite 样例

这是 GanttMD 的最小真实项目样例，任务来源于 `jwxt` 的项目总控与模块规格进度文档快照。

## 目录说明

- `.ganttmd/config.yaml`：样例项目与里程碑配置。
- `.ganttmd/modules/*.md`：GanttMD 任务数据，采用“模块文件 + YAML fenced block”格式。
- `source-docs/`：从 `jwxt` 复制来的进度文档快照，只作来源证据，不参与解析。
- `AGENTS.md`：Agent 操作协议样例。
- `index.html`：无依赖只读展示原型。

## 使用方式

1. 用浏览器打开 `index.html`。
2. 点击页面上的目录选择按钮。
3. 选择本目录或本目录下的 `.ganttmd` 目录。
4. 页面会解析 `.ganttmd/modules/*.md` 并展示模块进度、任务状态和依赖阻塞。

## 当前验证点

- 三态模型：`todo / in_progress / done`。
- 视图层自动计算 blocked。
- 跨模块依赖：`module-specs.md` 中任务依赖 `backend-engineering.md` 中的任务。
- 手工业务阻塞：任务正文中的 `> BLOCKED: ...`。

