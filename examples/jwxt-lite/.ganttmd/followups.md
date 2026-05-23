# Follow-up 清单

本文件记录 Agent 在执行、审查和总结过程中发现的后续事项。

所有 Agent 可以追加 `status: open` 的 follow-up；只有项目主控可以清理、关闭、合并或转正式任务。

### FUP-001 安全到校 queryStatuses 后续优化

```ganttmd-followup
id: FUP-001
title: 安全到校 queryStatuses 后续优化
kind: followup
status: open
source_type: pr_review
source_pr: PR#27
source_rr: RR-001
source_comment: PR#27 review comment 1
source_commit:
source_task: S-BE-09
created_by: codex
created_at: 2026-05-22
reason: 当前后端实现使用内存分页，后续应评估 SQL UNION 或日状态投影表替换
suggestion: M5 验收前由项目主控判断是否转正式任务
severity: medium
owner: project-control
target_milestone: M5
resolution:
converted_task:
```

### FUP-002 安全到校 escalation run 真相源

```ganttmd-followup
id: FUP-002
title: 安全到校 escalation run 真相源
kind: followup
status: open
source_type: pr_review
source_pr: PR#27
source_rr: RR-002
source_comment: PR#27 review comment 2
source_commit:
source_task: S-BE-09
created_by: codex
created_at: 2026-05-22
reason: triggerEscalation 后续需要独立 escalation run 真相源，避免升级流程只停留在接口行为
suggestion: 与 S-FE-02 前端页面最小闭环一起复核是否进入 M5 正式任务
severity: medium
owner: project-control
target_milestone: M5
resolution:
converted_task:
```

### FUP-003 设备接入备选方案评估

```ganttmd-followup
id: FUP-003
title: 设备接入备选方案评估
kind: external_wait
status: accepted
source_type: task
source_pr:
source_rr:
source_comment:
source_commit:
source_task: S-DEV-01
created_by: claude
created_at: 2026-05-22
accepted_by: project-control
accepted_at: 2026-05-22
next_review_at: 2026-06-10
decision: 保留为 M5 风险清理项，暂不转正式任务
reason: 海康 H1/H3/H4/H5 若在 M5 验收前仍无回复，需要评估 ISAPI HTTP 推送或其他品牌设备备选方案
suggestion: 主控在 M5 纵切验收前复核
severity: high
owner: project-control
target_milestone: M5
resolution: 主控已确认保留为 M5 风险清理项，暂不转正式任务
converted_task:
```

### FUP-004 数据生命周期专项排期

```ganttmd-followup
id: FUP-004
title: 数据生命周期专项排期
kind: deferred
status: converted
source_type: pr_review
source_pr: PR#24
source_rr: RR-004
source_comment: PR#24 review comment 4
source_commit:
source_task: S-GATE-05
created_by: codex
created_at: 2026-05-22
reason: 数据保留、归档、冷热分离、软删除、历史还原和合规删除需要在 M3 前置复核
suggestion: 转入正式任务后由系统总调度排期
severity: low
owner: project-control
target_milestone: M3
resolution: 已转为正式任务 S-BE-08
converted_task: S-BE-08
```

### FUP-005 S-FE-02 是否必须等待 S-QA-13 / S-QA-14 完全定稿

```ganttmd-followup
id: FUP-005
title: S-FE-02 是否必须等待 S-QA-13 / S-QA-14 完全定稿
kind: decision
status: open
source_type: task
source_pr:
source_rr:
source_comment:
source_commit:
source_task: S-FE-02
created_by: claude
created_at: 2026-05-22
decision_owner: user
next_review_at: 2026-05-28
reason: S-FE-02 当前依赖 S-QA-13 和 S-QA-14，但二者尚未完全定稿；若强等待会阻塞 M5 纵切，若降低依赖强度可能引入测试规范偏差
suggestion: 项目负责人裁决：A) 强等待 S-QA-13/14 定稿；B) 降低 S-FE-02 对 S-QA-13/14 的依赖强度，允许并行
severity: high
owner: project-control
target_milestone: M5
resolution:
converted_task:
```

### FUP-006 海康设备到货时间高风险

```ganttmd-followup
id: FUP-006
title: 海康设备到货时间高风险
kind: risk
status: open
source_type: task
source_pr:
source_rr:
source_comment:
source_commit:
source_task: S-DEV-01
created_by: claude
created_at: 2026-05-22
next_review_at: 2026-06-01
reason: 海康沟通持续阻塞，若 M5 前仍无真实设备到货，M8 真实设备接入与 V1 收敛将整体后延 2-4 周
suggestion: 主控评估是否启动备选品牌设备采购或推动校方协调海康优先级
severity: high
owner: project-control
target_milestone: M8
resolution:
converted_task:
```
