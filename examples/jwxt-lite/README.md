# jwxt-lite 样例

这是 GanttMD 的真实感样例，数据来自 `jwxt` 项目总控、执行待办、模块推进、跨域总账和升级门总账的快照。

本目录不是 `jwxt` 原项目工作区，只用于展示 GanttMD 当前能力。

## 目录说明

- `.ganttmd/index.html` + `.ganttmd/rules.js`：看板页面与共享规则（与仓库 `tools/ganttmd/` 同步，由测试守卫保证不漂移）。
- `.ganttmd/config.yaml`：样例项目、M0-M8 里程碑和视图配置。
- `.ganttmd/tasks/*.md`：任务数据，使用 `ganttmd-task` fenced block。
- `.ganttmd/followups.md`：Follow-up、用户裁决、延期复查、外部等待和风险事项。
- `source-docs/`：从 `jwxt` 复制来的历史材料快照，只作离线样例的来源证据；真实项目不应长期维护另一套动态进度文档。
- `AGENTS.md`：Agent 操作协议样例。

历史讨论稿和旧截图已移入 `archive/examples-jwxt-lite/`。

## 使用方式

1. 用浏览器直接打开 `examples/jwxt-lite/.ganttmd/index.html`。
2. 点击页面上的"选择目录"。
3. 选择本目录（`examples/jwxt-lite/`）或本目录下的 `.ganttmd/` 目录。
4. 查看执行、里程碑、主线、模块、风险和 Follow-up 视图。
5. 当 `.ganttmd/` 数据被修改后，点页面右上角的「↻ 刷新」按钮即可重新读取，无需再次选择目录。

## 当前展示能力

- 完整里程碑路线图：M0-M8，包括暂未拆解的里程碑。
- 执行视角：推荐下一步、进行中、待复核、被阻塞、已完成。
- 主线视角：按 `track` 查看规格、后端、前端、基础设施和质量门。
- 领域视角：按 `domain` 查看业务域或能力域任务；旧字段 `module` 会作为兼容别名读取。
- 风险视角：聚合阻塞任务、未清理 Follow-up、用户裁决、延期复查和健康检查。
- Follow-up 视角：按状态和类型查看后续事项。
- 证据链：展示 `evidence`、`verification`、`review_status`、`priority` 和更新时间。
- Agent 指令草案：根据任务状态默认展开适合的接手或复核指令。

## 当前源文档快照

`source-docs/` 当前包含 5 份 `jwxt` 进度材料：

- `00-项目总控看板.md`
- `00-项目总控执行待办.md`
- `00-模块规格推进清单.md`
- `00-跨域依赖收口总账.md`
- `00-延期能力与升级门总账.md`
