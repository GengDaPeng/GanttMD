# GanttMD

GanttMD 是一个 Markdown-native 的项目状态看板，面向 AI Agent 参与开发的项目。

它的核心定位是：

> 用 `.ganttmd/` 作为项目任务状态真相源，让人类负责人和 AI Agent 共享同一套可读、可审查、可视化的进度数据。

GanttMD 不替代需求文档、技术设计、模块规格、接口清单或测试规范。它只引用这些正式文档，并维护任务状态、依赖、证据链、阻塞项和 follow-up。

## 当前形态

当前版本采用安装式本地工具：

- 项目数据：`.ganttmd/config.yaml`、`.ganttmd/tasks/*.md`、`.ganttmd/followups.md`、`.ganttmd/runs.md`
- 工具入口：`ganttmd` CLI，提供初始化、校验、doctor、迁移、静态导出和本地看板服务
- 可视化：`ganttmd start` 后台启动单端口多项目看板，`ganttmd stop` 关闭服务
- 写入方式：人或 Agent 直接编辑 Markdown；工具写文件必须是显式命令，默认 dry-run 或不覆盖
- 页面行为：只读聚合，不在浏览器里直接修改任务文件

## 适合解决什么问题

- AI Agent 不知道下一步该做哪个任务。
- 人类负责人看不清任务依赖、阻塞和里程碑状态。
- Agent 经常把“后续再做”停留在口头总结里，没有进入项目跟踪。
- 完成任务缺少 PR、commit、verification、review_status 等证据链。

## 什么时候不该用 GanttMD

GanttMD 是 AI Agent 驱动的小型项目的任务状态层，不是通用项目管理工具。下列场景不要用它替代专业工具：

- **替代 Jira / Linear / Asana**：没有用户分配、工时、Sprint、Kanban Swimlane、自动通知等团队协作能力，10 人以上团队会很快撑爆。
- **承载需求文档本身**：任务块只引用正式文档，不复制需求正文。把模块规格写进 `next_action` 或 `acceptance` 会让任务块膨胀失控。
- **代替 PR / Code Review**：交付证据通过 `evidence` 引用 PR，但代码讨论本身仍在 PR 评论区，不要搬到 follow-up 里。
- **跨组织项目组合管理**：本地服务可以登记多个项目，但它不是企业级 portfolio 管理工具。
- **长生命周期路线图**（一年以上跨度）：里程碑机制偏轻量，更适合 3-6 个月可见的近期路线，长期愿景仍属正式文档。
- **强实时协同**：页面是只读的，多人同时改 Markdown 仍需 Git 解决冲突，不适合需要秒级同步的场景。
- **业务报表 / KPI 仪表盘**：GanttMD 关心的是任务结构和证据，不是业务指标。

如果项目主要痛点是上面这些，请用专业工具。GanttMD 解决的是 **AI Agent 协作时的任务状态、依赖、阻塞、证据链和 follow-up 治理**。

## 快速开始

在 GanttMD 仓库或安装后的工具环境中运行：

```bash
npm install -g .
```

发布到 npm 后可替换为：

```bash
npm install -g ganttmd
```

在目标项目中初始化：

```bash
cd /path/to/your-project
ganttmd init
ganttmd validate
ganttmd project add .
ganttmd start
```

目标项目只需要提交数据目录：

```text
your-project/
  AGENTS.md
  .ganttmd/
    config.yaml
    followups.md
    runs.md
    tasks/
      backend.md
      frontend.md
      quality.md
```

**使用方项目只保存 `.ganttmd/` 数据，不复制工具源码。** 更新、卸载 GanttMD 工具不应覆盖项目数据。

然后：

1. 按 [新项目初始化指南](docs/新项目初始化指南.md) 调整 `.ganttmd/config.yaml` 和 `.ganttmd/tasks/*.md`。
2. 将 [Agent 协作规则模板](docs/Agent协作规则模板.md) 合并到目标项目的 `AGENTS.md`。
3. 运行 `ganttmd validate`，确保没有 warning。
4. 运行 `ganttmd start`，在 `http://localhost:7777` 查看本地看板。

真实项目接入、工具更新、卸载和 schema 迁移见 [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md)。

也可以直接用本仓库的样例：

```bash
ganttmd validate examples/minimal
ganttmd validate examples/jwxt-lite
ganttmd project add examples/jwxt-lite --id jwxt-lite --name 教务系统样例
ganttmd start
```

## 任务文件示例

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

补充说明可以写在任务块外面。
````

## 内置视图

当前页面支持这些内置视图：

- `执行视角`：按 Agent 接手顺序组织任务。
- `里程碑视角`：按里程碑组织任务。
- `主线视角`：按 `track` 分组，例如规格、后端、前端、基础设施、质量、文档和运维。
- `模块视角`：按 `domain` 分组，例如学生、审批、安全考勤、通知等业务域或能力域。
- `风险视角`：聚合阻塞任务、未清理 Follow-up 和严重健康检查。
- `Follow-up`：查看 Agent 留下的后续事项、用户裁决、延期复查和外部等待。

任务视图顶部提供状态筛选，默认显示 `活跃` 任务。已归档任务需要手动选择 `已归档` 才会显示；执行视角不展示已归档任务，里程碑、主线和模块视角会按任务原本分组展示归档任务。

视图开关写在 `.ganttmd/config.yaml`：

```yaml
views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution
```

## Agent 如何使用

Agent 不会天然知道 GanttMD 的存在，必须通过目标项目的 `AGENTS.md` 告诉它：

- 任务数据在 `.ganttmd/`。
- 工作前先读取 `.ganttmd/config.yaml`，再按本次任务读取相关 `.ganttmd/tasks/*.md` 和 follow-up 条目。
- 执行任务时读取当前任务的 `source_docs`；它是需求、设计或证据依据，不是第二套进度真相源。
- 只能领取 `status: todo` 且依赖已完成的任务。
- 领取时更新为 `in_progress`，并补 `agent` 或 `owner`。
- 完成时补 `evidence`，必要时补 `verification` 和 `review_status`。
- 遗留事项必须登记到 `.ganttmd/followups.md`，不能只写在聊天总结里。
- worktree/分支只能通过 `.ganttmd/runs.md` 领取主分支已有任务，并在任务内维护 checklist；不得在分支创建新的顶层 `ganttmd-task`。
- worktree/分支只能追加 `status: open` 的 follow-up；接受、关闭或转正式任务必须由项目主控在主分支处理。

可直接使用 [Agent 协作规则模板](docs/Agent协作规则模板.md)。

## Follow-up 治理

`.ganttmd/followups.md` 用来解决“口头 follow-up 没有落地”的问题。

普通 Agent 可以追加 `status: open` 的 follow-up，但不能关闭、删除、转正式任务。只有项目主控可以清理、关闭、合并或转任务。

来自 PR 审查的 follow-up 必须带来源：

```yaml
source_type: pr_review
source_pr: PR#27
source_rr: RR-003
```

详见 [Follow-up 清单机制](docs/Follow-up清单机制.md)。

## 文档索引

- [Schema](SCHEMA.md)：`.ganttmd/` 文件格式规范。
- [使用说明](docs/GanttMD落地使用说明.md)：如何在真实项目中使用 GanttMD。
- [人机协作使用路径与边界](docs/人机协作使用路径与边界.md)：人类负责人、Agent、主控清理和 PR follow-up 的协作边界。
- [新项目初始化指南](docs/新项目初始化指南.md)：从 0 创建 `.ganttmd/`。
- [Agent 协作规则模板](docs/Agent协作规则模板.md)：复制到目标项目 `AGENTS.md` 的规则。
- [AI 生成初始任务文件指南](docs/AI生成进度文档指南.md)：让 Agent 从现有项目材料初始化或迁移 `.ganttmd/`。
- [任务字段说明](docs/任务字段说明.md)：任务字段怎么写。
- [Follow-up 清单机制](docs/Follow-up清单机制.md)：follow-up 权限、来源和状态规则。
- [校验脚本检查流程图](docs/校验脚本检查流程图.md)：`ganttmd validate` 的流程、检查项和输出结果。
- [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md)：使用方项目如何安装工具、更新工具、迁移 schema 和回滚。
- 历史方案、dogfooding 反馈和旧版截图已移入 [archive](archive/README.md)，不作为当前使用入口。

## 命令行

`ganttmd` 的职责不是运行业务项目，而是读取 `.ganttmd/` 并提供任务状态治理能力。

常用命令：

```bash
ganttmd init [path]                    # 创建 .ganttmd/ 骨架，不覆盖已有文件
ganttmd validate [path] [--json]        # 校验任务、follow-up、runs、checklist
ganttmd doctor [path] [--json]          # 检查 schema 版本和项目健康
ganttmd migrate [path]                  # dry-run 迁移计划
ganttmd migrate [path] --apply          # 备份后显式迁移
ganttmd project add <path>              # 登记到本机项目列表
ganttmd project list                    # 查看本机已登记项目
ganttmd project remove <id-or-path>     # 移除本机登记，不删除项目数据
ganttmd start [--port 7777] [--no-open] # 后台启动单端口多项目本地看板
ganttmd status [--json]                 # 查看本地看板服务状态
ganttmd stop [--json]                   # 关闭本地看板服务
ganttmd serve [--port 7777]             # 前台启动服务，适合调试
ganttmd static [path] [--out dir]       # 导出离线静态 fallback 页面
```

`validate` 会检查：

- 任务 ID 是否重复。
- `dependencies` 是否指向不存在的任务。
- `status`、`kind`、`review_status` 是否非法。
- 任务是否缺少 `milestone` 或 `track`。
- `milestone` 是否指向配置中不存在的里程碑。
- `source_docs` 是否缺失或指向不存在的正式文档。
- `in_progress` 任务是否缺少 `owner/agent`，或二者明显冲突。
- `review` 任务是否长期未更新。
- `done` / `cancelled` 任务关闭超过阈值后是否可归档。
- `done` 任务是否缺少 `evidence`。
- 工程任务完成后是否缺少 `verification`。
- PR follow-up 是否缺少 `source_pr` 或 `source_rr`。
- `accepted` follow-up 是否缺少复核时间和主控决策，或已经超过复核时间。

这样 Agent 在提交前、CI 在合并前都能发现结构问题。

如需给其他工具消费结果，可以使用 JSON 输出：

```bash
ganttmd validate --json
```

如需接入 CI，可以直接运行同一条命令：

```yaml
- name: Validate GanttMD
  run: ganttmd validate
```

## 示例

`examples/jwxt-lite/` 是一个从教务系统项目状态材料抽取出来的真实感样例，用来展示：

- 里程碑路线图。
- 执行、主线、模块、风险和 Follow-up 视图。
- 证据链、复核状态、取消任务和外部阻塞。
- PR/RR 来源的 follow-up。

## 许可证

当前仓库尚未补充正式许可证文件。开源发布前应新增 `LICENSE` 并在本节声明许可证类型。
