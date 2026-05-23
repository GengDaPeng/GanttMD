# JWXT 进度主控演示

本文演示：如果我是 `jwxt` 的 GanttMD 进度主控，会如何从现有进度文档生成 `.ganttmd/`。

本演示只操作 `examples/jwxt-lite/`，不反写真实 `jwxt` 项目。

## 1. 已复制的源文档

本次把 `jwxt` 当前进度相关文档复制到：

```text
examples/jwxt-lite/source-docs/
```

包含：

- `00-项目总控看板.md`
- `00-项目总控执行待办.md`
- `00-模块规格推进清单.md`
- `00-跨域依赖收口总账.md`
- `00-延期能力与升级门总账.md`

这 5 份文档分别承担不同角色：

| 文档 | 用途 |
| --- | --- |
| `00-项目总控看板.md` | 全局里程碑、四大主线、系统级阻塞 |
| `00-项目总控执行待办.md` | 系统总调度任务清单和当前优先队列 |
| `00-模块规格推进清单.md` | 模块规格主线、模块质量门、模块代理状态 |
| `00-跨域依赖收口总账.md` | 跨模块依赖、专项分流、顶层回写 |
| `00-延期能力与升级门总账.md` | 当前延期能力、升级触发条件、复核时机 |

## 2. 我作为进度主控的分层判断

我不会把 5 份文档里的所有条目都平铺成任务。

我会按三层抽取：

1. **系统执行任务**：来自 `00-项目总控执行待办.md`，是 Agent 可以领取或复核的任务。
2. **模块质量门任务**：来自 `00-模块规格推进清单.md` 和跨域总账，是模块主线状态，不直接展开模块内部派单。
3. **风险 / 升级门任务**：来自延期能力与升级门总账，只在需要复核或触发升级时进入执行队列。

不纳入 GanttMD 当前任务队列的内容：

- 已关闭且没有后续动作的历史条目。
- 模块内部代理派单细节。
- 只用于解释边界的背景段落。
- 已明确暂缓且当前无检查动作的远期任务。

## 3. 里程碑写法

我会从 `00-项目总控看板.md` 的 M0-M8 抽取里程碑，但当前执行视图重点放在 M1 / M2 / M5 / M7 / M8。

示例：

```yaml
project:
  name: 教务系统进度样例

milestones:
  - id: M1
    name: 核心模块规格首轮收敛
    status: in_progress
    description: 核心模块主规格和考勤中心完整形态收口

  - id: M2
    name: 工程跑道建立
    status: in_progress
    description: 后端工程、数据库迁移、依赖、本地启动和 CI 建立

  - id: M5
    name: 安全到校第一条纵切
    status: in_progress
    description: 后端 API 已合并，下一步前端页面最小闭环

  - id: M7
    name: 统计与审计成型
    status: backlog
    description: 等考勤事实稳定后启动

  - id: M8
    name: 真实设备接入与 V1 收敛
    status: backlog
    description: 等设备专项和纵切验证
```

## 4. 当前我会重点写入的任务

### S-FE-02 安全到校前端页面最小闭环

这是当前最明确的下一步，因为执行待办里已经形成链路：

```text
S-QA-03 → S-BE-09 → S-FE-02
```

我会写成：

```ganttmd-task
id: S-FE-02
title: 安全到校前端页面最小闭环
status: todo
dependencies: [S-BE-09, S-QA-13, S-QA-14]
milestone: M5
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 完成安全到校工作台、状态列表、异常详情、关闭表单和模拟设备入口的前端最小闭环
acceptance: [工作台能展示安全到校关键状态, 异常详情和关闭表单可走通, 模拟设备入口能触发最小演示链路]
evidence: []
```

说明：

- `S-BE-09` 已完成，是直接工程输入。
- `S-QA-13 / S-QA-14` 仍在进行中，所以页面会显示该任务被阻塞。
- 如果项目负责人认为前端可以不等测试 / 本地开发规范完全定稿，应裁决是否移除这两个依赖。

### S-DEV-01 设备接入专项前置材料准备

该任务不是阻塞 M5 模拟链路，但阻塞真实设备适配器。

我会写成：

```ganttmd-task
id: S-DEV-01
title: 设备接入专项前置材料准备
status: todo
dependencies: []
milestone: M5
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 推动海康沟通，优先确认推荐型号与拓扑、内网固定 IP、实时事件订阅和历史事件补拉
acceptance: [H1/H3/H4/H5 获得明确回复, 形成真实事件样例或备选方案判断, 明确是否触发 ISAPI 或其他品牌备选评估]
evidence: []
```

正文补充：

```markdown
> BLOCKED: 海康沟通阻塞中；不阻塞 M5 模拟设备事件阶段，但阻塞真实设备适配器开发。
```

说明：

- 这里的 `status` 仍是 `todo`，因为业务阻塞不写 `blocked`。
- 阻塞说明写在正文，供人和 Agent 判断。

### S-MOD-06 考勤跨域对端确认和专项分流反馈

该任务来自执行待办和模块推进清单，是模块质量门和系统调度之间的衔接。

```ganttmd-task
id: S-MOD-06
title: 考勤跨域对端确认和专项分流反馈
status: in_progress
dependencies: [S-MOD-03, S-ATT-02]
milestone: M1
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-模块规格推进清单.md, source-docs/00-跨域依赖收口总账.md]
next_action: 收口审批逐事项字段、回写路径、失败响应和统一错误码，并把设备、通知、统计审计、数据库落点分流到对应专项
acceptance: [审批与考勤的逐事项字段和回写路径完成对齐, ATT-CD-06/07/08/09/10/13 均有承接专项或明确暂缓原因, 稳定结论反馈系统总调度]
evidence: []
```

说明：

- 这不是模块内部派单。
- 它是模块总控向系统总调度反馈稳定结论的质量门任务。

### S-QA-13 / S-QA-14 测试与本地开发规范持续填充

这两个任务当前在进行中，是工程质量门余量。

```ganttmd-task
id: S-QA-13
title: 测试规范骨架与定稿
status: in_progress
dependencies: [S-BE-03, S-BE-04, S-BE-05, S-BE-06]
milestone: M2
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 继续补齐前端、契约和业务 API 测试细则，并随安全到校实现回填测试规范
acceptance: [测试分层规则覆盖后端前端契约和业务 API, AI 生成测试的审查要求明确, 后续随实现补齐项有清单]
evidence: []
```

```ganttmd-task
id: S-QA-14
title: 本地开发环境规范骨架与定稿
status: in_progress
dependencies: [S-BE-05, S-BE-06]
milestone: M2
source_docs: [source-docs/00-项目总控执行待办.md]
next_action: 继续补齐多 worktree 隔离、IDE 细则和安全到校纵切下的本地运行经验
acceptance: [多 worktree 并行开发规则明确, 本地依赖和运行时锁规则可复用, 安全到校纵切经验回填规范]
evidence: []
```

## 5. 我会暂不写入当前执行队列的事项

| 事项 | 原因 |
| --- | --- |
| M0 历史完成项 | 已完成且无当前动作，保留在源文档即可 |
| 大量模块内部代理任务 | 属于模块开发总控内部派单，不进入系统总调度队列 |
| S-QA-15 部署与运维规范 | M5+ 暂缓，无当前可验收对象 |
| S-BE-08 数据生命周期专项 | P2，暂缓，不阻塞当前安全到校纵切 |
| S-MOD-04 统计与审计模块规格启动 | 等考勤事实稳定后启动 |
| S-DEV-02 设备接入专项技术设计 | 阻塞于 S-DEV-01 |

## 6. 我会输出给用户的主控结论

当前 `jwxt` 的 GanttMD 主控判断：

1. 工程跑道主干已经完成，当前不是“没有后端基础设施”的阶段。
2. M5 安全到校纵切已经完成方案和后端 API，下一步应集中看 `S-FE-02`。
3. `S-FE-02` 是否必须等待 `S-QA-13 / S-QA-14` 完全定稿，需要项目负责人裁决；如果只是前端最小闭环，可以考虑降低依赖强度。
4. `S-DEV-01` 是真实设备接入风险，不阻塞模拟事件链路，但必须持续跟踪 H1/H3/H4/H5 截止时间。
5. 模块规格主线当前重点不是再开新模块，而是考勤跨域对端确认和专项分流。
6. `S-05` 跨域任务与事件可靠性机制当前为 `[covered]`，但安全到校纵切验收和后续业务链路仍要持续检查是否触发升级。

## 7. 如果要落到真实 jwxt

我会在真实项目里做以下动作：

1. 创建 `.ganttmd/config.yaml`，按 M0-M8 写里程碑。
2. 创建 `.ganttmd/modules/system-control.md`，放系统总调度任务。
3. 创建 `.ganttmd/modules/module-specs.md`，只放模块质量门和跨域反馈任务，不放模块内部派单。
4. 创建 `.ganttmd/modules/device-and-risk.md`，放设备、延期能力和升级门。
5. 把 GanttMD 规则写进 `AGENTS.md`，要求 Agent 开工前先读 `.ganttmd/`。
6. 第一次只抽取 15-25 个当前有效任务，不迁移所有历史完成项。

