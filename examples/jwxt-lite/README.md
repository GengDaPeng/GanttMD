# jwxt-lite 样例

这是 GanttMD 的真实感样例，数据来自 `jwxt` 项目总控、执行待办、模块推进、跨域总账和升级门总账的快照。

本目录不是 `jwxt` 原项目工作区，只用于展示 GanttMD 当前能力。

## 目录说明

- `.ganttmd/config.yaml`：样例项目、M0-M8 里程碑和视图配置。
- `.ganttmd/modules/*.md`：任务数据，使用 `ganttmd-task` fenced block。
- `.ganttmd/followups.md`：Follow-up、用户裁决、延期复查、外部等待和风险事项。
- `source-docs/`：从 `jwxt` 复制来的进度文档快照，只作来源证据。
- `AGENTS.md`：Agent 操作协议样例。

可视化页面位于仓库根目录的 `tools/ganttmd/index.html`（仓库唯一正典）。历史讨论稿和旧截图已移入 `archive/examples-jwxt-lite/`。

## 使用方式

1. 用浏览器打开仓库根目录的 `tools/ganttmd/index.html`。
2. 点击页面上的“选择目录”。
3. 选择本目录（`examples/jwxt-lite/`）或本目录下的 `.ganttmd/` 目录。
4. 查看执行、里程碑、主线、模块、风险和 Follow-up 视图。
5. 当 `.ganttmd/` 数据被修改后，点页面右上角的「↻ 刷新」按钮即可重新读取，无需再次选择目录。

## 当前展示能力

- 完整里程碑路线图：M0-M8，包括暂未拆解的里程碑。
- 执行视角：推荐下一步、进行中、待复核、被阻塞、已完成。
- 主线视角：按 `track` 查看规格、后端、前端、基础设施和质量门。
- 模块视角：按 `module` 查看业务域任务。
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

