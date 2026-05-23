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

1. 打开仓库根目录的 `tools/ganttmd/index.html`。
2. 点击“选择目录”。
3. 选择 `examples/minimal/`。
4. 查看执行、里程碑、主线、模块、风险和 Follow-up 视图。

校验：

```bash
npm run validate -- examples/minimal
```

