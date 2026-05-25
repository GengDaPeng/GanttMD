# Acme Notes 样例

这是一个虚构的团队笔记产品样例，用于展示 GanttMD 的主要能力。

它覆盖：

- 4 个里程碑。
- 17 个任务，包含 `todo`、`in_progress`、`review`、`done`、`cancelled`。
- 任务依赖与被阻塞展示。
- 前端、后端、质量、文档、运维等主线。
- editor、sync、sharing、release 等领域分组。
- evidence、verification、review_status。
- checklist 和 runs。
- Follow-up 的 open、accepted、converted、done、wontfix 状态。

## 使用方式

从仓库根目录运行：

```bash
npm run validate -- examples/minimal
node bin/ganttmd.js project add examples/minimal --id acme-notes --name "Acme Notes 样例"
node bin/ganttmd.js serve
```

然后在本地看板查看执行、里程碑、主线、模块、风险和 Follow-up 视图。

安装 GanttMD 后，在自己的项目根目录校验：

```bash
ganttmd validate
```
