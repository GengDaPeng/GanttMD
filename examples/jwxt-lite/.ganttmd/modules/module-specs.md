# 模块规格与跨域质量门

本文件按 `jwxt` 模块开发总控和跨域总账抽取模块质量门任务。它不展开模块内部代理派单，只保留会影响系统总调度的稳定结论、对端确认和专项分流。

### S-MOD-03 六模块 P0 跨域接口首轮关闭

```ganttmd-task
id: S-MOD-03
title: 六模块 P0 跨域接口首轮关闭
status: done
dependencies: []
milestone: M1
source_docs: [source-docs/00-模块规格推进清单.md, source-docs/00-跨域依赖收口总账.md]
next_action: 复核六模块 P0 接口契约关闭结果，并确认稳定结论已反馈系统总调度
acceptance: [学生班级教师系统设置审批组织权限六模块 P0 接口已关闭, 考勤 ATT-CD-01~05 和 ATT-CD-11~12 已分发到承接文档, 需系统总调度承接的事项已进入专项或总账]
evidence: [source-docs/00-模块规格推进清单.md, source-docs/00-跨域依赖收口总账.md]
```

范围：学生、班级、教师、系统设置、审批中心、组织权限六模块 P0 接口首轮关闭。

### S-ATT-01 考勤中心完整形态主规格第一版

```ganttmd-task
id: S-ATT-01
title: 考勤中心完整形态主规格第一版
status: done
dependencies: [S-MOD-03]
milestone: M1
source_docs: [source-docs/00-模块规格推进清单.md, source-docs/00-项目总控看板.md]
next_action: 复核考勤完整形态主规格是否足以支撑安全到校首条纵切和后续阶段扩展
acceptance: [安全到校在校离校归寝等阶段边界已明确, 对象分层和状态语言已形成统一口径, 审批设备通知权限审计等跨域输入已登记]
evidence: [source-docs/00-模块规格推进清单.md]
```

范围：安全到校、在校、离校、归寝、对象分层、状态语言、审批接入、设备输入、通知意图、权限范围和审计留痕。

### S-ATT-02 考勤字段、接口和阶段方案收口

```ganttmd-task
id: S-ATT-02
title: 考勤字段、接口和阶段方案收口
status: in_progress
dependencies: [S-ATT-01]
milestone: M1
source_docs: [source-docs/00-模块规格推进清单.md, source-docs/00-跨域依赖收口总账.md]
next_action: 对齐考勤字段字典、接口清单和阶段方案，形成可被前后端、安全到校纵切和专项设计承接的收口说明
acceptance: [关键考勤字段对象完成命名收口, 接口清单标明阶段归属和承接文档, ATT-CD 剩余项明确进入设备通知统计审计数据库或运行保障专项]
evidence: []
```

当前状态：考勤字段字典和接口清单已形成初稿，`ATT-CD-01~05 / 11 / 12` 已分发到承接文档。

### S-MOD-06 考勤跨域对端确认和专项分流反馈

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

说明：这是模块总控向系统总调度反馈稳定结论的质量门任务，不是模块内部派单。

### S-STAT-01 统计与审计主规格启动

```ganttmd-task
id: S-STAT-01
title: 统计与审计主规格启动
status: todo
dependencies: [S-ATT-02, S-FE-02]
milestone: M7
source_docs: [source-docs/00-模块规格推进清单.md, source-docs/00-项目总控看板.md]
next_action: 在考勤字段收口和安全到校前端闭环完成后，启动统计与审计主规格拆解
acceptance: [明确统计口径和审计事件边界, 输出首轮主规格目录, 标记依赖考勤和安全到校的字段来源]
evidence: []
```

暂缓原因：统计与审计应在考勤事实、状态和审批回写口径稳定后启动。
