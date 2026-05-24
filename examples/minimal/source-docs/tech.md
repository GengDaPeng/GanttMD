# 技术说明

最小样例假设项目使用静态页面展示任务，并通过命令行校验 `.ganttmd/` 数据。

## 验证方式

真实项目接入 GanttMD 后，在该项目根目录运行：

```bash
node .ganttmd/validate.js
```

如果从 GanttMD 仓库根目录校验这个内置样例，使用 `npm run validate -- examples/minimal`。
