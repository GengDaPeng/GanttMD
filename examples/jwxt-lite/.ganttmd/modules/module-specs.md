# 模块规格主线

本文件从 `source-docs/00-模块规格推进清单.md` 和 `source-docs/00-跨域依赖收口总账.md` 的当前状态抽取少量任务，用于验证跨模块依赖和 blocked 计算。

### S-MOD-03 六模块 P0 跨域接口首轮关闭

```ganttmd-task
id: S-MOD-03
title: 六模块 P0 跨域接口首轮关闭
status: done
dependencies: []
milestone: M1
source: source-docs/00-模块规格推进清单.md
source_docs: [source-docs/00-模块规格推进清单.md]
next_action: 对齐考勤字段字典、接口清单和阶段落地方案，形成可被前后端承接的收口说明
acceptance: [字段字典关键对象完成命名收口, 接口清单标明阶段归属和承接文档, 阶段方案说明首期必须交付和后续延伸]
evidence: []
```

范围：学生、班级、教师、系统设置、审批中心、组织权限六模块 P0 接口首轮关闭。

### S-ATT-01 考勤中心完整形态主规格第一版

```ganttmd-task
id: S-ATT-01
title: 考勤中心完整形态主规格第一版
status: done
dependencies: [S-MOD-03]
milestone: M1
source: source-docs/00-模块规格推进清单.md
```

范围：安全到校、在校、离校、归寝、对象分层、状态语言、审批接入、设备输入、通知意图、权限范围和审计留痕。

### S-ATT-02 考勤字段、接口和阶段方案收口

```ganttmd-task
id: S-ATT-02
title: 考勤字段、接口和阶段方案收口
status: in_progress
dependencies: [S-ATT-01]
milestone: M1
source: source-docs/00-模块规格推进清单.md
source_docs: [source-docs/00-模块规格推进清单.md]
next_action: 对齐考勤字段字典、接口清单和阶段落地方案，形成可被前后端承接的收口说明
acceptance: [字段字典关键对象完成命名收口, 接口清单标明阶段归属和承接文档, 阶段方案说明首期必须交付和后续延伸]
evidence: []
```

当前状态：考勤字段字典和接口清单已形成初稿，`ATT-CD-01~05 / 11 / 12` 已分发到承接文档。

### S-QA-03 安全到校纵切实施方案

```ganttmd-task
id: S-QA-03
title: 安全到校纵切实施方案
status: done
dependencies: [S-ATT-01, S-BE-06]
milestone: M5
source: source-docs/00-项目总控执行待办.md
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 复核安全到校纵切实施方案的完成证据，并确认其是否足以支撑后端和前端最小闭环
acceptance: [纵切方案覆盖登录配置主数据权限和设备事件链路, 异常关闭和审计展示有明确验收路径, 后续后端前端任务能引用该方案继续推进]
evidence: []
```

完成标准：登录、配置、主数据、权限、模拟设备事件、到校事实、异常关闭、审计和工作台展示的最小闭环方案完成。

### S-BE-09 安全到校后端 API 最小闭环

```ganttmd-task
id: S-BE-09
title: 安全到校后端 API 最小闭环
status: done
dependencies: [S-QA-03, S-BE-06]
milestone: M5
source: source-docs/00-项目总控执行待办.md
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 收集海康设备真实事件样例，整理字段含义、触发场景和对安全到校接口的影响
acceptance: [至少覆盖入校离校异常三类事件, 每类事件包含原始字段和业务含义, 明确无法获得真实样例时的备选模拟方案]
evidence: []
```

范围：安全到校 11 个接口、错误码、`ScopeResolver` stub 和 e2e。

### S-DEV-01 海康设备沟通与真实事件样例

```ganttmd-task
id: S-DEV-01
title: 海康设备沟通与真实事件样例
status: todo
dependencies: []
milestone: M5
source: source-docs/00-项目总控执行待办.md
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 收集海康设备真实事件样例，整理字段含义、触发场景和对安全到校接口的影响
acceptance: [至少覆盖入校离校异常三类事件, 每类事件包含原始字段和业务含义, 明确无法获得真实样例时的备选模拟方案]
evidence: []
```

> BLOCKED: 海康沟通阻塞中，H1/H3/H4/H5 最晚需在纵切验收前获得回复，否则需要评估备选方案。

### S-STAT-01 统计与审计主规格启动

```ganttmd-task
id: S-STAT-01
title: 统计与审计主规格启动
status: todo
dependencies: [S-ATT-02, S-FE-02]
milestone: M7
source: source-docs/00-模块规格推进清单.md
source_docs: [source-docs/00-模块规格推进清单.md]
next_action: 在考勤字段收口和安全到校前端闭环完成后，启动统计与审计主规格拆解
acceptance: [明确统计口径和审计事件边界, 输出首轮主规格目录, 标记依赖考勤和安全到校的字段来源]
evidence: []
```

该任务故意依赖尚未完成的 `S-FE-02`，用于验证视图层自动显示 blocked。
