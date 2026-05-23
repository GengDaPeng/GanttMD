# GanttMD 落地使用说明

GanttMD 的当前 MVP 目标不是替代 Jira、Linear 或完整项目管理系统，而是在 AI 编程项目里提供一个人和 Agent 都能读懂、都能维护的项目状态层。

它的最小形态由四部分组成：

```text
your-project/
  .ganttmd/
    config.yaml
    followups.md
    modules/
      backend.md
      frontend.md
      product.md
  AGENTS.md
  tools/ganttmd/index.html
```

## 使用边界

GanttMD 负责回答这些问题：

- 当前项目有哪些里程碑。
- 哪些任务已经完成、正在进行、可以领取、被依赖阻塞。
- 某个任务为什么不能领取。
- Agent 下一步应该优先看哪个任务。
- Agent 领取任务前应该读哪些来源文档。

GanttMD 不负责替代这些内容：

- 完整需求文档。
- 详细业务设计。
- 代码审查记录。
- 长篇讨论过程。
- 项目知识库。

任务卡片只保留执行所需的最小信息。详细上下文仍然放在项目原有文档里，通过 `source_docs` 引用。

## 安装方式

当前阶段推荐使用复制式安装：

1. 在目标项目根目录创建 `.ganttmd/`。
2. 创建 `.ganttmd/config.yaml`。
3. 创建 `.ganttmd/modules/*.md`。
4. 创建 `.ganttmd/followups.md`，用于登记 Agent 留下的后续事项。
5. 把可视化页面复制到 `tools/ganttmd/index.html` 或项目约定目录。
6. 在项目根目录 `AGENTS.md` 里加入 GanttMD 操作规则。

不建议 MVP 阶段先做复杂 CLI。真实项目跑通后，再考虑 `ganttmd init`、`ganttmd validate`、`ganttmd serve`。

## 推荐目录

```text
.ganttmd/
  config.yaml
  followups.md
  modules/
    project-setup.md
    backend.md
    frontend.md
    qa.md
tools/
  ganttmd/
    index.html
AGENTS.md
```

V4 可在 `config.yaml` 中设置启用视图和默认视图：

```yaml
views:
  enabled: [execution, milestone, module, risk, followup]
  default: risk
```

当前只支持内置视图开关，不支持自定义筛选、分组和排序 DSL。

如果项目已经有 `docs/`，不要把 GanttMD 任务文件放进 `docs/` 深层目录。`.ganttmd/` 应放在项目根目录，作为项目状态层的固定入口。

## 日常工作流

人的工作流：

1. 打开 `tools/ganttmd/index.html`。
2. 选择项目根目录。
3. 查看执行视角，确认推荐下一步和阻塞项。
4. 必要时调整 `.ganttmd/modules/*.md` 里的任务字段。
5. 把复杂决策写回正式需求、设计或规范文档。

Agent 的工作流：

1. 读取 `AGENTS.md`。
2. 读取 `.ganttmd/config.yaml`。
3. 扫描 `.ganttmd/modules/*.md`。
4. 选择 `status: todo` 且依赖已完成的任务。
5. 领取前改为 `in_progress`，补充 `owner` 或 `agent`。
6. 执行时读取 `source_docs`。
7. 完成后补充 `evidence`，再改为 `done`。
8. 如果留下后续事项，登记到 `.ganttmd/followups.md`。

## 真相源规则

`.ganttmd/modules/*.md` 是任务状态真相源。

可视化页面只读取任务文件，不直接修改任务文件。这样做有三个好处：

- Git diff 清楚。
- 人和 Agent 都能审查任务状态变化。
- 不需要引入数据库或 SaaS。

## 什么时候更新 GanttMD

应该更新：

- 新增任务。
- 任务开始执行。
- 任务完成。
- 依赖关系变化。
- 任务被拆分或合并。
- 发现任务缺少来源文档、下一步动作或验收边界。

不应该更新：

- 只是讨论中的想法。
- 尚未确认的方案分歧。
- 长篇分析材料。
- 与执行状态无关的背景知识。

这些内容应留在需求、设计、讨论或审查文档中。
