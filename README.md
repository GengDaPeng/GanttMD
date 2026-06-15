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

## 快速开始

```bash
cd /path/to/your-project

ganttmd init                # 创建 .ganttmd/ 骨架，不覆盖已有文件
ganttmd validate            # 校验任务结构（0 warning 才继续）
ganttmd project add .       # 登记到本机看板
ganttmd start               # 启动看板 → http://127.0.0.1:7777
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
| `ganttmd project add <path>` | 登记项目到本机看板 |
| `ganttmd project list [--json]` | 查看已登记项目 |
| `ganttmd project remove <id-or-path>` | 移除登记（不删项目数据） |
| `ganttmd start [--port 7777]` | 后台启动看板服务 |
| `ganttmd stop` | 关闭看板服务 |
| `ganttmd status [--json]` | 查看服务状态 |
| `ganttmd serve [--port 7777]` | 前台启动服务（调试用） |
| `ganttmd static [path] [--out dir]` | 导出离线静态看板 |

`validate --json` 和 `doctor --json` 的返回码可直接用于 CI 阻断。

## 看板视图

启动后访问 `http://127.0.0.1:7777`，内置六种视图：

- **执行视角** — 按可接手顺序展示任务，自动推荐下一步
- **里程碑视角** — 按里程碑分组，显示阶段进度
- **主线视角** — 按 `track` 分组（spec / backend / frontend / infra / quality）
- **模块视角** — 按 `domain` 分组（业务域或能力域）
- **风险视角** — 聚合阻塞任务、未清理 follow-up 和严重健康问题
- **Follow-up** — 管理后续事项、决策和延期项

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

- [Schema 规范](SCHEMA.md)
- [新项目初始化指南](docs/新项目初始化指南.md)
- [任务字段说明](docs/任务字段说明.md)
- [Follow-up 清单机制](docs/Follow-up清单机制.md)
- [AI Agent 协作边界](docs/人机协作使用路径与边界.md)
- [AI 生成初始任务文件指南](docs/AI生成进度文档指南.md)
- [校验检查流程图](docs/校验脚本检查流程图.md)
- [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md)

## 许可证

[ISC](LICENSE)
