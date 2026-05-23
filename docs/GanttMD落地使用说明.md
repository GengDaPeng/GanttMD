# GanttMD 使用说明

GanttMD 是项目的任务状态层。它帮助人和 Agent 共同回答：

- 当前项目有哪些里程碑。
- 哪些任务已完成、进行中、待复核、可领取或被阻塞。
- 某个任务依赖哪些前置任务。
- Agent 下一步应该优先看哪个任务。
- 哪些 follow-up、用户裁决、延期项和外部等待还没有清理。

GanttMD 不替代正式需求、技术设计、模块规格、接口清单、测试规范或代码审查记录。任务只引用这些文档，不复制正文。

## 目录结构

推荐放在目标项目根目录：

```text
.ganttmd/
  config.yaml
  followups.md
  modules/
    backend.md
    frontend.md
    quality.md
tools/
  ganttmd/
    index.html
AGENTS.md
```

其中：

- `.ganttmd/config.yaml`：项目、里程碑和视图配置。
- `.ganttmd/modules/*.md`：任务状态真相源。
- `.ganttmd/followups.md`：Agent 后续事项、用户裁决、延期复查和外部等待。
- `tools/ganttmd/index.html`：只读可视化页面。
- `AGENTS.md`：告诉 Agent 如何读取和维护 GanttMD。

## 安装方式

当前 MVP 推荐复制式使用：

1. 在目标项目创建 `.ganttmd/`。
2. 创建 `.ganttmd/config.yaml`。
3. 创建 `.ganttmd/modules/*.md`。
4. 创建 `.ganttmd/followups.md`。
5. 把当前可视化页面复制到 `tools/ganttmd/index.html`。
6. 把 [Agent 协作规则模板](Agent协作规则模板.md) 合并到目标项目 `AGENTS.md`。

不需要数据库，也不需要服务端。页面用浏览器打开后选择项目目录即可读取。

## config.yaml

最小配置：

```yaml
project:
  id: demo
  name: 示例项目

views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution

milestones:
  - id: M1
    name: 项目骨架建立
    status: in_progress
    description: 明确需求边界、工程骨架和最小闭环
```

里程碑是路线图事实。即使某个里程碑暂时没有拆出任务，也可以先写入 `config.yaml`，页面会显示为 `0 任务 · 未拆解`。

## 任务文件

每个任务用一个 `ganttmd-task` fenced code block：

````markdown
### S-BE-01 后端工程骨架专项设计

```ganttmd-task
id: S-BE-01
title: 后端工程骨架专项设计
status: todo
dependencies: []
milestone: M1
track: backend
module: foundation
priority: P0
source_docs: [docs/技术方案.md]
next_action: 明确后端目录、模块边界和启动入口
acceptance: [目录结构确定, 本地启动路径明确, 后续实现任务可承接]
evidence: []
```
````

任务块外可以写补充说明，但机器稳定读取的字段必须写在代码块内。

## 日常工作流

人的工作流：

1. 打开 `tools/ganttmd/index.html`。
2. 选择项目根目录。
3. 查看执行视角、风险视角和 Follow-up。
4. 必要时调整 `.ganttmd/` 文件。
5. 复杂决策写回正式文档。

Agent 的工作流：

1. 读取目标项目 `AGENTS.md`。
2. 读取 `.ganttmd/config.yaml`。
3. 扫描 `.ganttmd/modules/*.md`。
4. 找到 `status: todo` 且依赖已完成的任务。
5. 领取前改为 `in_progress`，补 `agent` 或 `owner`。
6. 执行时读取 `source_docs`。
7. 完成后补 `evidence`、必要时补 `verification` 和 `review_status`。
8. 如有后续事项，写入 `.ganttmd/followups.md`。

## 什么时候更新 GanttMD

应该更新：

- 新增任务。
- 任务开始执行。
- 任务进入复核。
- 任务完成。
- 依赖关系变化。
- 任务被取消。
- 发现 follow-up、用户裁决或外部等待。

不应该更新：

- 只是讨论中的想法。
- 尚未确认的方案分歧。
- 长篇分析材料。
- 与执行状态无关的背景知识。

这些内容应留在需求、设计、讨论或审查文档中。

## 页面刷新

当前页面主要使用浏览器目录选择能力读取本地文件。

不同浏览器对目录句柄支持不同。外部 Chrome 对自动刷新目录支持更好；部分内嵌浏览器只适合手动重新选择目录。为了保证稳定，基础导入应始终保留 `选择目录` 的手动方式。

## 命令行校验

GanttMD 提供命令行校验脚本，用来在 Agent 提交前或 CI 合并前检查 `.ganttmd/` 的结构问题：

```bash
npm run validate -- /path/to/project
```

如果命令返回警告，退出码为 `1`；只有提示或没有问题时，退出码为 `0`。当前校验重点包括：

- 任务 ID 重复或缺失。
- 任务依赖指向不存在的任务。
- 任务或 follow-up 状态值非法。
- 任务缺少 `milestone` 或 `track`。
- 任务引用配置中不存在的里程碑。
- `source_docs` 缺失或指向不存在的正式文档。
- `in_progress` 任务缺少 `owner/agent`，或二者明显冲突。
- `review` 任务长期未更新。
- `done` / `cancelled` 任务关闭超过阈值后可归档。
- `done` 任务缺少 `evidence`。
- 工程类 `done` 任务缺少 `verification`。
- `review` 任务缺少 `review_status`。
- PR 审查来源 follow-up 缺少 `source_pr` 或 `source_rr`。
- `accepted` follow-up 缺少主控、决策或复核时间，或已经超过复核时间。

Agent 在改动 `.ganttmd/` 后，建议先运行：

```bash
npm run validate -- .
```

如果页面和命令行结果不一致，应以命令行输出为结构性校验依据，再回到页面确认视觉展示是否符合预期。

## 历史归档

已完成和已取消任务不要直接删除。推荐流程是：

1. 任务进入 `done` 时填写 `completed_date`。
2. 任务进入 `cancelled` 时填写 `closed_at` 或 `cancelled_at`。
3. `npm run validate -- .` 每次运行时检查是否超过归档阈值。
4. 超过阈值后，validate 只提示“可归档”，不自动写文件。
5. 未来如提供 `ganttmd archive --apply`，再由显式命令移动到历史文件。

不建议做后台定时自动清理。GanttMD 是文件真相源，自动写文件应尽量可见、可审查、可回滚。
