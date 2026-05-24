# GanttMD 最小样例

这是给新用户快速理解 GanttMD 的最小完整样例。

它用少量任务展示：

- 可执行任务。
- 进行中任务。
- 待复核任务。
- 被依赖阻塞的任务。
- 已完成任务和证据链。
- 已取消任务。
- 临时任务 `kind: ad_hoc`。
- Follow-up 的 open / accepted / converted 状态。

## 使用方式

1. 用浏览器直接打开 `examples/minimal/.ganttmd/index.html`。
2. 点击"选择目录"。
3. 选择 `examples/minimal/` 或 `examples/minimal/.ganttmd/`。
4. 查看执行、里程碑、主线、模块、风险和 Follow-up 视图。

> 所有 GanttMD 相关文件都在 `.ganttmd/` 这一个目录里（页面、规则、校验器、配置、任务、follow-up），这是当前 MVP 的复制式部署形态。

真实项目接入 GanttMD 后，在该项目根目录校验：

```bash
node .ganttmd/validate.js
```

如果从 GanttMD 仓库根目录校验这个内置样例，使用：

```bash
npm run validate -- examples/minimal
```
