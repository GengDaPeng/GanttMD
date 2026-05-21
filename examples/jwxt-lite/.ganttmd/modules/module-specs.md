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
```

该任务故意依赖尚未完成的 `S-FE-02`，用于验证视图层自动显示 blocked。

