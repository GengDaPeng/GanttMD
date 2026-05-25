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

从仓库根目录运行：

```bash
npm run validate -- examples/minimal
node bin/ganttmd.js project add examples/minimal --id minimal --name 最小样例
node bin/ganttmd.js serve
```

然后在本地看板查看执行、里程碑、主线、模块、风险和 Follow-up 视图。

真实项目接入 GanttMD 后，项目内只提交 `.ganttmd/` 数据；页面、校验器和本地服务由安装式 `ganttmd` 工具提供。

真实项目接入 GanttMD 后，在该项目根目录校验：

```bash
ganttmd validate
```
