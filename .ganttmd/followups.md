# Follow-up 清单

## 待处理事项

```ganttmd-followup
id: FUP-001
title: 离线恢复体验需要补用户提示
kind: risk
status: open
source_type: task
source_task: FE-003
created_by: frontend-dev
created_at: 2026-05-25
reason: 离线重试失败时用户可能不知道数据是否已保存
suggestion: 在 FE-003 实现时增加失败状态和下一步提示
severity: medium
```

```ganttmd-followup
id: FUP-002
title: 自动化端到端测试延后到同步 API 稳定后
kind: deferred
status: accepted
source_type: planning
source_task: QA-002
created_by: qa-dev
created_at: 2026-05-25
accepted_by: tech-lead
accepted_at: 2026-05-25
next_review_at: 2026-07-01
decision: 同步 API 字段稳定前只维护回归清单，API 完成后再补自动化
reason: 当前接口还在变化，过早写端到端测试会增加维护成本
suggestion: BE-002 完成后复查 QA-002
severity: medium
```

```ganttmd-followup
id: FUP-003
title: 将评审意见转成端到端测试任务
kind: followup
status: converted
source_type: pr_review
source_pr: PR#42
source_rr: RR-001
created_by: reviewer
created_at: 2026-05-25
reason: 评审要求补充编辑保存和冲突处理测试
suggestion: 转成 QA-002，统一覆盖端到端测试
severity: high
resolution: 已转为 QA-002
converted_task: QA-002
```

```ganttmd-followup
id: FUP-004
title: 等待设计稿确认分享链接空状态
kind: external_wait
status: done
source_type: design
source_task: BE-003
created_by: product-designer
created_at: 2026-05-25
reason: 分享链接页面缺少空状态文案
suggestion: 等设计稿确认后更新 DOC-002
severity: low
resolution: 设计稿已确认，文案纳入 DOC-002
```

```ganttmd-followup
id: FUP-005
title: 首版不支持旧笔记导入
kind: followup
status: wontfix
source_type: planning
source_task: SPEC-002
created_by: product-owner
created_at: 2026-05-25
reason: 旧格式导入不影响首版核心协作路径
suggestion: 如后续客户明确需要，再重新建任务评估
severity: low
resolution: 当前版本不做，保留取消任务 SPEC-002 作为决策记录
```

```ganttmd-followup
id: FUP-006
title: 是否需要首版支持命令面板
kind: decision
status: open
source_type: planning
source_task: FE-004
created_by: product-owner
created_at: 2026-05-25
decision_owner: product-owner
reason: 命令面板能提升效率，但可能推迟首版发布时间
suggestion: 发布检查前决定是否保留 FE-004 在 M3
severity: medium
```
