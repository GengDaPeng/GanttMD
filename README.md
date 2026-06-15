# GanttMD

GanttMD 是一个 Markdown-native 的任务状态治理工具，面向有 AI Agent 参与的软件开发项目。

它把 `.ganttmd/` 当作任务状态真相源，用统一的 CLI 和本机看板服务，把任务状态、依赖、证据与 follow-up 串起来，帮助多人协作时快速对齐执行。

## 这是什么

- **目标**：提升任务可执行性、可复核性和交接可追踪性。
- **核心对象**：`tasks/followups/runs`。
- **工作方式**：源码写在项目内，工具通过安装在项目外的 CLI 使用。

## 适合什么场景

- AI Agent 需要知道“接下去做哪个任务”。
- 依赖和阻塞关系频繁变更，人工对齐成本高。
- follow-up、决策和延迟项经常留在聊天里，不易收口。
- 希望提交/复核有可验证证据链（evidence、verification、review）。

## 什么时候不适合

GanttMD 是任务状态层，不是：

- Jira/Linear/Asana 这类全栈协作管理平台。
- 需求文档、技术方案和测试规范本身。
- PR review 评论系统。
- 企业级 KPI / 报表系统。

## 当前形态

GanttMD 当前采用：**安装式本地工具 + `.ganttmd/` 数据目录 + 本机看板聚合**。

- 项目数据只在目标项目内：`.ganttmd/config.yaml`、`.ganttmd/tasks/*.md`、`.ganttmd/followups.md`、`.ganttmd/runs.md`。
- 工具入口：`ganttmd` CLI（初始化、校验、doctor、迁移、静态导出、看板服务）。
- 看板展示是只读聚合，不直接编辑业务文件。
- 需要写文件时，必须走显式 CLI（如 `ganttmd init`、`ganttmd migrate --apply`）。

## 安装

```bash
# 本地开发/验证：安装当前仓库源码版 CLI
npm install -g .
```

```bash
# 生产环境/多项目机器：安装发布版 CLI
npm install -g ganttmd
```

安装成功后建议先确认：

```bash
# 查看版本
ganttmd --version

# 查看帮助
ganttmd --help
```

## 快速开始（接入新项目）

```bash
# 1. 进入目标项目目录
cd /path/to/your-project

# 2. 初始化 .ganttmd（只创建不存在的文件）
ganttmd init

# 3. 检查 schema、字段与运行环境
ganttmd doctor

# 4. 做结构校验（无 warning 才推荐继续）
ganttmd validate

# 5. 将项目登记到本机看板登记表
ganttmd project add .

# 6. 启动本地看板（默认端口 7777）
ganttmd start
```

目标项目通常提交结构如下：

```text
your-project/
  AGENTS.md
  .ganttmd/
    README.md
    config.yaml
    followups.md
    runs.md
    tasks/
      product.md
      engineering.md
      quality.md
```

**强调：项目只提交 `.ganttmd/`，工具本体不提交到目标项目。**

如不需要默认示例项目 `acme-notes`，可以移除：

```bash
# 从本机服务登记中移除内置样例，避免影响当前项目视图
ganttmd project remove acme-notes
```

## 如何使用

### 常用命令（含命令用途）

```bash
# 创建/补齐 .ganttmd 骨架，不覆盖已有文件
ganttmd init [path]

# 校验任务文件、followup、run 和健康提示
ganttmd validate [path] [--json]

# 检查 schema 与环境健康度（含 issue 列表）
ganttmd doctor [path] [--json]

# 检查/执行迁移（加 --apply 才会修改文件）
ganttmd migrate [path] [--apply] [--json]

# 导出静态看板页面（无运行时服务）
ganttmd static [path] [--out .ganttmd-dist]

# 在本机登记项目（用于 start 显示与聚合）
ganttmd project add <path> [--id <id>] [--name <name>]

# 查看已登记项目
ganttmd project list [--json]

# 从登记表移除项目
ganttmd project remove <id-or-path>

# 前台启动服务（适合调试）
ganttmd serve [--port 7777]
# 后台启动服务（常用）
ganttmd start [--port 7777] [--no-open]

# 查看运行态状态
ganttmd status [--json]

# 关闭本机服务
ganttmd stop [--json]

# 版本和帮助
ganttmd --version
ganttmd --help
```

> `validate --json` 与 `doctor` 输出适合接入 CI；返回码在 CI 中可直接驱动阻断。

### 查看看板

启动后访问：`http://127.0.0.1:7777`（默认）。

支持视图：

- `执行视角`：按可接手顺序展示任务。
- `里程碑视角`：按里程碑看覆盖与阻塞。
- `主线视角`：按 `track` 分组。
- `模块视角`：按 `domain` 分组。
- `风险视角`：聚焦阻塞与长期未处理项。
- `Follow-up`：管理复核、决策和延期项。

视图可在 `.ganttmd/config.yaml` 配置：

```yaml
views:
  enabled: [execution, milestone, track, module, risk, followup]
  default: execution
```

## 安全与运行边界

GanttMD 运行时对边界有默认保护：

- 仅监听本机回环地址，避免对外监听。
- 输入参数与请求有边界校验。
- 注册表与状态文件读取/写入做了坏文件降级与原子写入。
- stop/start 不依赖未校验 PID，减少误杀。

## 样例项目

仓库内置 `Acme Notes` 作为示例项目：

```bash
# 先在仓库根目录校验示例可用性
ganttmd validate
# 把示例登记为本机项目
ganttmd project add . --id acme-notes --name "Acme Notes 样例"
# 启动看板查看示例
ganttmd start
```

建议先在样例链路确认通了，再接入真实项目。

## 任务示例

```text
### API-001 实现笔记同步 API

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

补充说明可写在任务块外。
```

## 版本发布说明

- 版本变更请看项目 `Releases`：
  [GanttMD Releases](https://github.com/GengDaPeng/GanttMD/releases)

## 文档索引

- [Schema](SCHEMA.md)
- [使用说明](docs/GanttMD落地使用说明.md)
- [AI Agent 协作建议](docs/人机协作使用路径与边界.md)
- [任务字段说明](docs/任务字段说明.md)
- [新项目初始化指南](docs/新项目初始化指南.md)
- [Follow-up 清单机制](docs/Follow-up清单机制.md)
- [安装、更新、卸载与迁移](docs/user/安装更新卸载与迁移.md)
- [AI 生成初始任务文件指南](docs/AI生成进度文档指南.md)
- [校验脚本检查流程图](docs/校验脚本检查流程图.md)
