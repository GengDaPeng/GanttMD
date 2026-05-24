# 来自 jwxt 项目的反馈

本文档专门收集 `jwxt`（教务系统）项目在真实使用 GanttMD 过程中暴露的问题、不顺手的地方和未被满足的需求。

GanttMD 当前处于早期阶段，`jwxt` 是第一个真实接入的项目，承担 dogfooding 角色。所有由 jwxt 侧代理或负责人发现的问题先登记在这里，而不是直接散落在 PR 评论或聊天总结中。等积累一段时间后，主控会按主题归并、形成正式 issue 或转入 follow-up。

## 登记规则

每条反馈用如下格式追加在「待处理反馈」一节末尾：

```markdown
### FB-NNN 简短问题描述

- 提出者：jwxt 代理 / jwxt 负责人 / Claude / Codex
- 日期：YYYY-MM-DD
- 场景：在什么操作下遇到
- 现象：具体看到了什么、和预期的差距
- 严重度：high / medium / low
- 建议方向：（可选）改 schema、改页面、改文档、新增字段、忽略等
- 状态：open / accepted / rejected / converted
```

- `FB-NNN` 用三位编号自增。
- 一条反馈只描述一件事，不混合多个问题。
- 「建议方向」是写给主控参考的，不一定被采纳。
- 状态在主控处理后由主控更新；提出者只写 `open`。

## 处理流程

1. **登记**：jwxt 侧任意代理或负责人发现问题，追加一条 `open` 反馈。
2. **归类**：主控定期审阅（建议每周一次），归类为：
   - schema 问题 → 改 SCHEMA.md，开新 commit
   - 页面问题 → 改源副本 `tools/ganttmd/index.html`（测试守卫会自动检查样例 `.ganttmd/` 是否同步）
   - 文档问题 → 改 `docs/` 下相应文档
   - 校验器问题 → 改 `src/validator.js`
   - 暂不处理 → 标记 `rejected`，写明理由
   - 需要长期跟进 → 标记 `converted`，转入 GitHub Issue 或独立 follow-up
3. **关闭**：处理后将状态改为 `accepted`（已落地）、`rejected`（不做）或 `converted`（转走）。

## 不归这里管的事情

- jwxt 项目自己的业务问题：放 jwxt 仓库。
- GanttMD 的功能愿景：放讨论稿或 GitHub Issue。
- 对单个任务的具体执行讨论：放该任务的 PR 评论区。

## 待处理反馈

（暂无）

## 已处理反馈

### FB-001 tools/ganttmd 子目录对使用方多余

- 提出者：jwxt 负责人（接入前预判）
- 日期：2026-05-23
- 场景：准备把 GanttMD 接入 jwxt 时，发现需要复制两个目录（`.ganttmd/` 数据 + `tools/ganttmd/` 工具）
- 现象：使用方需要在两个位置维护 GanttMD 相关内容，删除时容易漏掉一个，认知成本高
- 严重度：medium
- 建议方向：把 `index.html` 和 `rules.js` 合并进 `.ganttmd/`，让"所有 GanttMD 相关的事情都从 .ganttmd/ 一个入口进"
- 状态：accepted（已落地）
- 落地说明：仓库源副本仍在 `tools/ganttmd/`（src/validator.js 依赖此路径），但所有使用方文档和样例都改为「直接放进 `.ganttmd/`」；`examples/jwxt-lite/.ganttmd/` 和 `examples/minimal/.ganttmd/` 各自包含 `index.html` + `rules.js`，由 `test/template-sync.test.js` 保证三处字节一致
