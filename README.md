# GanttMD

Markdown-native 项目进度管理工具，面向 AI Agent 开发场景。

## 什么是 GanttMD

GanttMD 是一个轻量级的项目进度管理工具，核心理念是：

- **Markdown 是唯一的真相源**：所有项目信息都存储在结构化的 Markdown 文件中
- **AI Agent 友好**：AI Agent 只需要学会读写 Markdown，不需要学习新工具
- **可视化只读**：前端可视化层只读取数据，不修改底层 Markdown
- **完全自主可控**：不依赖外部 SaaS，数据完全在本地

## 解决什么问题

AI solo 开发者在复杂项目中的三个核心痛点：

1. **看板太重**：现有 markdown 看板需要人驱动更新，AI 不会主动维护
2. **全局不可见**：人无法一眼看清项目整体进度和依赖关系
3. **Agent 不知道该做什么**：AI 不会自动检查依赖关系、领取可执行任务

## 核心功能

- **模块化任务管理**：按模块组织任务，文件数量可控
- **依赖关系追踪**：自动检测依赖循环，支持跨模块依赖
- **状态自动计算**：依赖未满足时自动标记 blocked
- **里程碑视图**：可视化展示项目关键节点
- **AI Agent 操作规范**：定义标准的任务领取、更新、完成流程
- **可视化甘特图**：Web 界面展示项目全局进度

## 快速开始

当前 MVP 推荐复制式使用，不需要安装服务端或数据库：

1. 在目标项目创建 `.ganttmd/config.yaml`。
2. 在 `.ganttmd/modules/*.md` 中维护任务。
3. 将 `examples/jwxt-lite/index-v4.html` 复制到目标项目，例如 `tools/ganttmd/index.html`。
4. 将 [Agent 协作规则模板](docs/Agent协作规则模板.md) 复制到项目根目录 `AGENTS.md`。
5. 用浏览器打开 `tools/ganttmd/index.html`，选择项目根目录查看看板。

详细步骤见 [GanttMD 落地使用说明](docs/GanttMD落地使用说明.md) 和 [新项目初始化指南](docs/新项目初始化指南.md)。

## 文件结构

```
.ganttmd/
├── config.yaml              # 项目配置
├── modules/                 # 模块任务文件
│   ├── user-management.md
│   ├── permission-system.md
│   └── ...
├── followups.md             # Agent 后续事项清单
tools/
└── ganttmd/
    └── index.html           # 可视化页面
AGENTS.md                    # Agent 操作规则
```

## 文档

- [设计方案](DESIGN.md)：完整的设计文档，包括架构、流程、阶段切分
- [Markdown Schema](SCHEMA.md)：Markdown 文件格式规范
- [GanttMD 落地使用说明](docs/GanttMD落地使用说明.md)：如何把当前 MVP 放进真实项目
- [新项目初始化指南](docs/新项目初始化指南.md)：一个新项目从 0 创建 `.ganttmd/` 的步骤
- [Agent 协作规则模板](docs/Agent协作规则模板.md)：可复制到项目 `AGENTS.md` 的规则模板
- [任务字段说明](docs/任务字段说明.md)：任务字段怎么写、写到什么粒度
- [AI 生成进度文档指南](docs/AI生成进度文档指南.md)：告诉 Agent 如何从项目文档生成 `.ganttmd/`
- [Follow-up 清单机制](docs/Follow-up清单机制.md)：防止 Agent 口头 follow-up 不落入项目跟踪

## V4 视图

V4 页面使用内置视图配置驱动，并在 `config.yaml` 中开放极简视图开关：

```yaml
views:
  enabled: [execution, milestone, module, risk, followup]
  default: risk
```

V4 只允许启用/关闭内置视图和选择默认视图，不暴露完整 `filter / group_by / sort_by` DSL。当前新增的 `risk` 视图用于聚合阻塞任务、未清理 Follow-up、非法 Follow-up 和严重健康检查提示。

## 核心理念

### Markdown 是唯一的真相源

所有项目信息都存储在 Markdown 文件中：
- 任务状态、依赖关系、优先级
- 里程碑定义
- Agent 配置

AI Agent 只需要读写 Markdown，不需要学习新工具。

### AI Agent 友好

GanttMD 定义了标准的 AI Agent 操作规范：

1. **查找可执行任务**：扫描模块文件，找到 status=todo 且 dependencies 已满足的任务
2. **领取任务**：status → in_progress，写入 start_date
3. **完成任务**：status → done，写入 completed_date
4. **阻塞任务**：status → blocked，写入 blocked_reason

### 可视化只读

前端可视化层只读取 `.ganttmd/` 下的 Markdown 和 YAML 文件，不修改底层 Markdown。这保证了：
- 数据一致性
- 版本控制友好
- 多 Agent 并发安全

## 使用场景

### AI solo 开发者

一个人 + 多个 AI Agent 开发复杂项目：
- 人定义项目结构和里程碑
- AI Agent 按模块领取任务
- 人通过可视化界面监控全局进度

### 小团队

2-5 人团队使用 AI 辅助开发：
- 每人负责不同模块
- AI Agent 辅助编码和测试
- 通过 GanttMD 协调进度和依赖

### 开源项目

开源项目的任务管理：
- 贡献者通过 Markdown 提交任务
- 维护者通过可视化界面审核
- 依赖关系清晰可见

## 技术栈

- **数据源**：Markdown fenced block + YAML 风格字段
- **前端**：单文件 HTML + JavaScript + CSS
- **运行方式**：浏览器本地打开，选择项目目录
- **版本控制**：Git

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与。

## 许可证

MIT License

## 路线图

### Phase 1：核心框架（1 周）

- [ ] 项目初始化
- [ ] Markdown schema 定义
- [ ] 单文件可视化页面
- [ ] 依赖图构建和循环检测

### Phase 2：可视化（1 周）

- [ ] JSON 输出格式
- [ ] 前端页面骨架
- [ ] 模块视图渲染
- [ ] 依赖关系可视化

### Phase 3：完善（1 周）

- [ ] 文件监听和自动解析
- [ ] AI Agent 操作规范
- [ ] 测试用例
- [ ] 文档完善

### Phase 4：验证（1 周）

- [ ] 从真实项目迁移数据
- [ ] 实际使用验证
- [ ] 反馈收集和优化
