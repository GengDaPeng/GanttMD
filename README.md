# GanttMD

[![npm version](https://img.shields.io/npm/v/ganttmd)](https://www.npmjs.com/package/ganttmd)
[![license](https://img.shields.io/npm/l/ganttmd)](LICENSE)

**GanttMD** 是一个 Markdown 原生的任务状态治理工具，面向有 AI Agent 参与的软件项目。

任务数据以 `.ganttmd/` 目录保存在项目内，工具通过 `ganttmd` CLI 安装在项目外。它提供校验、看板、运行态聚合和 follow-up 治理能力——不替代需求文档、PR 评审或项目管理平台。

## 安装

```bash
npm install -g ganttmd
```

验证安装：

```bash
ganttmd --version
ganttmd --help
```

本仓库本地开发时可直接安装当前工作树：

```bash
cd /path/to/GanttMD
npm install -g .
```

如果只是验证本仓库当前实现，建议先跑一次：

```bash
npm test
```

## 快速开始

在目标项目根目录执行：

```bash
ganttmd init                              # 创建 .ganttmd/ 骨架，不覆盖已有文件
ganttmd doctor                            # 先看 schema 和健康状态
ganttmd validate                          # 校验任务结构（0 warning 才继续）
ganttmd project add . --id demo --name Demo
ganttmd start --no-open                   # 启动看板 → http://127.0.0.1:7777
```

目标项目只提交 `.ganttmd/` 目录：

```text
your-project/
  AGENTS.md
  .ganttmd/
    config.yaml
    followups.md
    runs.md
    tasks/
      product.md
      engineering.md
      quality.md
```

> 项目只保存 `.ganttmd/` 数据，工具本体不提交到目标项目。

`ganttmd init` 当前会补齐这 5 个最小文件，但不会覆盖已有内容：

- `.ganttmd/README.md`
- `.ganttmd/config.yaml`
- `.ganttmd/tasks/main.md`
- `.ganttmd/followups.md`
- `.ganttmd/runs.md`

如果项目需要自定义看板里的“复制指令”，直接在 `.ganttmd/config.yaml` 写 `agent_command` 配置块；可在 `templates.default` 写统一模板，也可按状态配置 `todo`、`review`、`blocked` 等模板。

初始化后第一步不是继续堆样例，而是把 `tasks/main.md` 里的示例任务替换成项目真实任务，再执行 `doctor` 和 `validate`。

### 新项目起步建议

不要第一天就写太细。推荐起步规模：

- 3 个里程碑，2-4 个任务文件，10-20 个任务。
- 每个任务只写必要字段（id、title、status、dependencies）。
- 等项目真实推进一轮后，再补 `next_action`、`acceptance`、`source_docs` 的细节。

务必把 `docs/Agent协作规则模板.md` 复制到项目根目录 `AGENTS.md`——Agent 不会天然知道 GanttMD 的存在，必须通过 `AGENTS.md` 明确告诉它任务文件在哪、怎么领取、怎么完成。

## 任务文件示例

````markdown
### API-001 实现笔记同步 API

```ganttmd-task
id: API-001
title: 实现笔记同步 API
status: todo
dependencies: [SPEC-001]
milestone: M1
track: backend
domain: sync
priority: P0
source_docs: [docs/architecture.md]
next_action: 实现保存接口和版本冲突响应
acceptance: [保存接口幂等, 版本冲突返回 409, 错误响应含可读 message]
evidence: []
```

补充说明可以写在任务块外面。
````

## 命令行

| 命令 | 用途 |
|---|---|
| `ganttmd init [path]` | 创建 `.ganttmd/` 骨架，不覆盖已有文件 |
| `ganttmd validate [path] [--json]` | 校验任务、follow-up、run 和 checklist |
| `ganttmd doctor [path] [--json]` | 检查 schema 版本和项目健康 |
| `ganttmd migrate [path] [--apply]` | 迁移 schema（默认 dry-run） |
| `ganttmd upgrade [path] [--apply] [--json]` | 执行安全升级：补齐托管说明、schema，并受控清理已废弃旧文件 |
| `ganttmd project add <path> [--id <id>] [--name <name>]` | 登记项目到本机看板 |
| `ganttmd project list [--json]` | 查看已登记项目 |
| `ganttmd project remove <id-or-path>` | 移除登记（不删项目数据） |
| `ganttmd start [--port 7777] [--no-open]` | 后台启动看板服务，可禁止自动打开浏览器 |
| `ganttmd stop [--json]` | 关闭看板服务 |
| `ganttmd status [--json]` | 查看服务状态 |
| `ganttmd serve [--port 7777]` | 前台启动服务（调试用） |
| `ganttmd static [path] [--out dir]` | 导出离线静态看板 |
| `ganttmd template eject [path] [--dry-run]` | 把内置 Agent 指令模板追加到 `config.yaml` 的 `agent_command` 配置块 |

`validate --json` 和 `doctor --json` 的返回码可直接用于 CI 阻断。

要自定义看板「复制指令」的文案，修改 `.ganttmd/config.yaml` 的 `agent_command` 配置块即可。`ganttmd template eject` 可以把内置模板追加成可编辑的 `agent_command` 配置。详见 [SCHEMA.md](SCHEMA.md) §9.4。

### 升级与迁移边界

- `ganttmd doctor`、`validate`、`status`、`start/stop` 只读项目数据，不改 `.ganttmd/`。
- `ganttmd upgrade` 是推荐入口：默认 dry-run，`--apply` 时才写盘。
- 当前 `upgrade` 会做三类安全动作：补 `config.yaml` 的 `ganttmd.schema_version`、升级托管的 `.ganttmd/README.md`、删除命中白名单且内容仍是旧样板的废弃文件。
- 当前废弃白名单示例包括：`.task-card.md`、`milestones/overview.md`、`views/timeline.json`。
- 命中废弃白名单但内容已被用户改过的文件不会自动删除，只会报 warning。
- `upgrade --apply` 写盘前会在 `.ganttmd/.backup/<timestamp>/upgrade/` 生成备份。
- `ganttmd migrate` 仍保留为低层 schema 迁移命令；只处理 `config.yaml` 的 `schema_version`。

详细操作见 [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md)。

## 看板视图

启动后访问 `http://127.0.0.1:7777`，内置六种视图：

- **执行视角** — 按可接手顺序展示任务，自动推荐下一步
- **里程碑视角** — 按里程碑分组，显示阶段进度
- **主线视角** — 按 `track` 分组（spec / backend / frontend / infra / quality）
- **模块视角** — 按 `domain` 分组（业务域或能力域）
- **风险视角** — 聚合阻塞任务、未清理 follow-up 和严重健康问题
- **Follow-up** — 管理后续事项、决策和延期项；支持 `全部`、`待处理`、`等待用户裁决`、`延期复查`、`高风险事项`、`已转正式任务`、`已关闭` 等多选标签。已转正式任务的卡片会读取关联任务状态；关联任务已完成时进入已完成分组，阶段标签和任务状态分开显示。

可通过 `.ganttmd/config.yaml` 配置启用的视图和默认视图：

```yaml
views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution
```

## 适用场景

- AI Agent 需要明确的"下一步做什么"
- 依赖和阻塞关系频繁变更，人工对齐成本高
- follow-up 常留在聊天里，需要收口到可追踪清单
- 交付需要可验证证据链（evidence、verification）

**不适合：** 全栈项目管理（Jira/Linear）、10 人以上团队协作、强实时看板、需求文档本身。

## 文档

- [Schema 规范](SCHEMA.md) — 文件格式、字段约定、校验规则、人机协作边界
- [Agent 协作规则模板](docs/Agent协作规则模板.md) — 复制到目标项目 `AGENTS.md`
- [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md) — 工具生命周期管理

## 许可证

[ISC](LICENSE)
