# 设备接入与升级门

本文件按系统总调度视角抽取设备接入、延期能力和升级门任务。它不替代设备专项设计，只跟踪当前阻塞、备选方案和升级触发条件。

### S-DEV-01 设备接入专项前置材料准备

```ganttmd-task
id: S-DEV-01
title: 设备接入专项前置材料准备
status: todo
dependencies: []
milestone: M5
track: infra
module: foundation
priority: P0
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 推动海康沟通，优先确认推荐型号与拓扑、内网固定 IP、实时事件订阅和历史事件补拉
acceptance: [H1/H3/H4/H5 获得明确回复, 形成真实事件样例或备选方案判断, 明确是否触发 ISAPI 或其他品牌备选评估]
blocked_reason: 海康沟通阻塞中；不阻塞 M5 模拟设备事件阶段，但阻塞真实设备适配器开发
evidence: []
updated_at: 2026-05-20
```

> BLOCKED: 海康沟通阻塞中；不阻塞 M5 模拟设备事件阶段，但阻塞真实设备适配器开发。

### S-DEV-02 设备接入专项技术设计

```ganttmd-task
id: S-DEV-02
title: 设备接入专项技术设计
status: todo
dependencies: [S-DEV-01]
milestone: M8
track: infra
module: foundation
priority: P2
source_docs: [source-docs/00-项目总控执行待办.md, source-docs/00-项目总控看板.md]
next_action: 在真实设备型号、拓扑和事件样例明确后，编写设备接入专项技术设计
acceptance: [适配器边界明确, SDK 或 ISAPI 路径明确, 原始事件字段映射去重补拉对账故障恢复和隐私合规明确]
evidence: []
```

### S-GATE-05 跨域任务与事件可靠性升级门复核

```ganttmd-task
id: S-GATE-05
title: 跨域任务与事件可靠性升级门复核
status: todo
dependencies: [S-QA-03, S-BE-09]
milestone: M5
track: quality_gate
module: crosscutting
priority: P1
source_docs: [source-docs/00-延期能力与升级门总账.md, source-docs/00-跨域依赖收口总账.md]
next_action: 在安全到校纵切验收和后续业务链路推进时，复核 S-05 是否仍保持 covered 或需要升级为独立专项
acceptance: [最小必须覆盖项逐条复核, 未触发统一任务状态机或统一处理台等升级条件, 若触发升级则登记 split 和后续专项落点]
evidence: []
```

说明：当前 `S-05` 在延期能力总账中为 `[covered]`，但这只是文档层覆盖，不表示后续工程实现可跳过检查。

### S-DEV-03 ISAPI 通用适配预研

```ganttmd-task
id: S-DEV-03
title: ISAPI 通用适配预研
status: cancelled
dependencies: []
milestone: M8
track: infra
module: foundation
priority: P3
source_docs: [source-docs/00-延期能力与升级门总账.md]
next_action: 已取消，不再排期
acceptance: []
evidence: []
cancel_reason: 海康反馈确认采用官方 SDK 推送通道，ISAPI 通用适配作为备选不再评估
resolution: 相关需求并入 S-DEV-02 设备接入专项技术设计的备选方案章节
updated_at: 2026-05-22
```

说明：保留为历史决策记录，供后续设备策略变更时回溯。
