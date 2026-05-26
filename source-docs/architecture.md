# Acme Notes 架构说明

本样例假设 Acme Notes 使用一个轻量前端应用和一个 JSON API。

## 前端

- `app-shell` 负责导航、空状态和页面布局。
- `editor` 负责 Markdown 输入、工具栏和自动保存状态。
- `resilience` 负责离线横幅、重试按钮和冲突提示。

## 后端

- `notes-api` 提供笔记列表和保存接口。
- `sync` 使用版本号识别保存冲突。
- `sharing` 提供只读分享链接。
- `audit` 记录关键修改、分享和冲突事件。

## 约束

- 同步 API 的 `409` 冲突语义必须稳定。
- 首版不引入外部数据库依赖。
- 前端任务不能随意改变 note 数据结构。
