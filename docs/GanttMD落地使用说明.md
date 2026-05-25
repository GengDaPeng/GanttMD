# GanttMD 使用说明

GanttMD 是项目的任务状态层。它帮助人和 Agent 共同回答：

- 当前项目有哪些里程碑。
- 哪些任务已完成、进行中、待复核、可领取或被阻塞。
- 某个任务依赖哪些前置任务。
- Agent 下一步应该优先看哪个任务。
- 哪些 follow-up、用户裁决、延期项和外部等待还没有清理。

GanttMD 不替代正式需求、技术设计、模块规格、接口清单、测试规范或代码审查记录。任务只引用这些文档，不复制正文。

GanttMD 也不要求项目再维护一套“项目进度文档”。动态进度、任务状态、阻塞、证据链和 follow-up 应以 `.ganttmd/` 为唯一真相源；原来的总控待办或模块推进清单应迁入 `.ganttmd/tasks/*.md`，或瘦身成静态说明和 GanttMD 入口。

`source_docs` 不是第二套进度系统。它只指向项目原有的正式需求、设计、接口、数据模型、测试规范或 PR 证据，说明任务的依据从哪里来。

## 目录结构

推荐放在目标项目根目录：

```text
AGENTS.md
.ganttmd/
  config.yaml             # 项目、里程碑和视图配置
  followups.md            # Agent 后续事项、用户裁决、延期复查和外部等待
  runs.md                 # 主控派工批次、分支和 worktree 承接记录
  tasks/                  # 任务状态真相源
    backend.md
    frontend.md
    quality.md
```

**使用方项目只保存 `.ganttmd/` 数据。** 看板页面、校验器、本地服务和迁移逻辑由安装在项目外的 `ganttmd` 工具提供。

其中：

- `.ganttmd/config.yaml`：项目、里程碑和视图配置。
- `.ganttmd/tasks/*.md`：任务状态真相源。
- `.ganttmd/followups.md`：Agent 后续事项、用户裁决、延期复查和外部等待。
- `.ganttmd/runs.md`：任务批次、分支、worktree 和执行状态记录。
- `AGENTS.md`：告诉 Agent 如何读取和维护 GanttMD。

## 安装方式

当前主线采用安装式部署。GanttMD 工具安装在项目外，项目内只提交 `.ganttmd/` 数据。

本仓库本地开发时：

```bash
npm install -g .
```

发布后：

```bash
npm install -g ganttmd
```

目标项目接入：

```bash
cd /path/to/your-project
ganttmd init
ganttmd validate
ganttmd doctor
ganttmd project add .
ganttmd start
```

`ganttmd init` 只创建缺失文件，不覆盖已有 `.ganttmd/` 内容。`ganttmd migrate` 默认只输出 dry-run 计划；只有 `ganttmd migrate --apply` 才会备份后写入。

更新、卸载、迁移和真实项目接入前检查见 [安装、更新、卸载与迁移](user/安装更新卸载与迁移.md)。

## config.yaml

最小配置：

```yaml
project:
  id: demo
  name: 示例项目
ganttmd:
  schema_version: 1

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
domain: foundation
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

1. 运行 `ganttmd start`。
2. 在本地看板选择项目。
3. 查看执行视角、风险视角和 Follow-up。
4. 必要时调整 `.ganttmd/` 文件。
5. 运行 `ganttmd validate` 和 `ganttmd doctor`。
6. 复杂决策写回正式文档。

Agent 的工作流：

1. 读取目标项目 `AGENTS.md`。
2. 读取 `.ganttmd/config.yaml`。
3. 查看任务文件列表，并只读取与本次任务、推荐任务或相关依赖有关的 `.ganttmd/tasks/*.md`。
4. 找到 `status: todo` 且依赖已完成的任务；不要求每次全量阅读所有历史任务文件。
5. 领取前改为 `in_progress`，补 `agent` 或 `owner`。
6. 执行时读取当前任务的 `source_docs`，确认需求/设计依据。
7. 完成后补 `evidence`、必要时补 `verification` 和 `review_status`。
8. 如有后续事项，写入 `.ganttmd/followups.md`。
9. 如任务在 worktree/分支中连续推进，更新 `.ganttmd/runs.md`。

worktree/分支不是任务真相源。正式任务只能由主控在主分支创建；分支只负责领取主分支任务、维护任务内 checklist、补充执行证据，并可追加 `status: open` 的 follow-up。接受、关闭、转正式任务和归档必须回到主分支由项目主控处理。

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

## 本地看板

`ganttmd start` 后台启动本地只读看板。它会读取本机项目登记表，聚合主项目 `.ganttmd/`、worktree 状态、runs、checklist 和健康检查结果。

```bash
ganttmd project add /path/to/project --id demo --name 示例项目
ganttmd start --port 7777
ganttmd status
ganttmd stop
```

本地服务只读展示，不自动修改项目文件。需要写文件的动作必须走显式 CLI 命令。`ganttmd start` 会记录后台服务 pid，`ganttmd stop` 只关闭这一个本地看板服务。

## 命令行校验

GanttMD 提供命令行校验，用来在 Agent 提交前或 CI 合并前检查 `.ganttmd/` 的结构问题。

在使用方项目根目录运行：

```bash
ganttmd validate
```

如果从其他目录执行，也可以显式传项目路径或 `.ganttmd/` 路径：

```bash
ganttmd validate /path/to/project
ganttmd validate /path/to/project/.ganttmd
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
ganttmd validate
```

如果页面和命令行结果不一致，应以命令行输出为结构性校验依据，再回到页面确认视觉展示是否符合预期。

CI 里也直接运行同一条命令：

```yaml
- name: Validate GanttMD
  run: ganttmd validate
```

## 历史归档

已完成和已取消任务不要直接删除。推荐流程是：

1. 任务进入 `done` 时填写 `completed_date`；缺失时 validator 会回退使用 `closed_at` 或 `updated_at`。
2. 任务进入 `cancelled` 时填写 `closed_at` 或 `cancelled_at`；缺失时 validator 会回退使用 `updated_at`。
3. `ganttmd validate` 每次运行时检查是否超过 7 天归档阈值。
4. 超过阈值后，validate 只提示“可归档”，不自动写文件。
5. 项目主控可补 `archived_at` 和 `archived_reason` 手动归档；恢复时删除这两个字段。
6. 未来如提供 `ganttmd archive --apply`，再由显式命令移动到历史文件。

不建议做后台定时自动清理。GanttMD 是文件真相源，自动写文件应尽量可见、可审查、可回滚。
