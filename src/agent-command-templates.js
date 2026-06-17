// GanttMD 内置 Agent 指令模板（单一真相源）
//
// 这里定义看板「复制指令」按钮的内置默认模板。它有三个消费方，必须保持一致：
//   1. src/project-loader.js：项目未自定义模板时，把这里的内置模板注入
//      config.ganttmd.agent_command_templates，serve 模式下页面经 /api/state 拿到。
//   2. bin/ganttmd.js 的 `ganttmd template eject`：把这里的模板导出到项目
//      .ganttmd/templates/agent/*.md，供用户编辑覆盖。
//   3. web/index.html：渲染时优先用项目配置 / 注入的内置模板（renderAgentCommandTemplate）。
//
// 模板用 {{占位符}} 语法，占位符由 web/index.html renderAgentCommandTemplate 的
// values 表提供。新增占位符时务必同步那张表，否则会渲染成空字符串。
//
// 模板 key 与任务状态的对应见 getAgentCommandTemplateKey（web/index.html）：
//   missing_deps  依赖数据不完整
//   blocked       被前置依赖或外部原因阻塞
//   todo          可立即执行
//   in_progress   进行中
//   review        待复核
//   done          已完成
//   cancelled     已取消
//   default       其它/兜底

const TODO_BODY = `你接手任务 {{task.id}}：{{task.title}}。

开工入口：
先按 AGENTS.md 执行，并读取任务卡与必读事实源。

任务卡：
{{task.file}} 中的 {{task.id}}。

## 任务目标
{{task.next_action}}

## 执行范围
{{task.execution_scope}}

## 产出物 / 结果落点
{{task.output_target}}

## 验收重点
{{task.acceptance}}

## 边界 / 禁止事项
{{task.downstream_constraints}}

## 验证命令
{{task.verification_commands}}

## 执行安排
{{execution_setup}}

必读事实源：
{{task.source_docs}}

交付要求：
{{delivery_requirements}}
{{critical_path_note}}`;

const IN_PROGRESS_BODY = `接续进行中任务 {{task.id}}：{{task.title}}。

开工入口：
先按 AGENTS.md 执行，并读取任务卡与必读事实源。

任务卡：
{{task.file}} 中的 {{task.id}}。

## 任务目标
{{task.next_action}}

## 执行范围
{{task.execution_scope}}

## 产出物 / 结果落点
{{task.output_target}}

## 验收重点
{{task.acceptance}}

## 边界 / 禁止事项
{{task.downstream_constraints}}

## 验证命令
{{task.verification_commands}}

## 执行安排
{{execution_setup}}

必读事实源：
{{task.source_docs}}

接续要求：
{{delivery_requirements}}
{{critical_path_note}}`;

const REVIEW_BODY = `复核任务 {{task.id}}：{{task.title}}。

开工入口：
先按 AGENTS.md 执行，并读取任务卡与必读事实源。

任务卡：
{{task.file}} 中的 {{task.id}}。

## 任务目标
复核本任务产出是否满足验收重点，并确认 PR body 证据完整。

## 执行范围
{{task.execution_scope}}

## 产出物 / 结果落点
复核结论写入 PR review / PR Notes；必须修的问题退回实现，候选 follow-up 写入 PR body。

## 验收重点
{{task.acceptance}}

## 边界 / 禁止事项
{{task.downstream_constraints}}

## 验证命令
{{task.verification_commands}}

## 执行安排
{{execution_setup}}

必读事实源：
{{task.source_docs}}

复核要求：
检查 PR body 是否覆盖验证证据、影响范围和候选 follow-up。看板状态、runs、followups 由项目主控合并后统一处理。
{{critical_path_note}}`;

const DONE_BODY = `复核已完成任务 {{task.id}}。
读取任务卡：{{task.file}}
读取来源文档：
{{task.source_docs}}
检查 PR body / evidence 是否覆盖以下验收标准：
{{task.acceptance}}
若已确认完成，下一步关注它的后续任务：{{task.downstream}}。`;

const CANCELLED_BODY = `任务 {{task.id}} 已取消。
读取任务卡：{{task.file}}
读取来源文档：
{{task.source_docs}}
确认取消原因、剩余风险和是否需要登记 follow-up。`;

const BLOCKED_BODY = `不建议领取 {{task.id}}：{{task.title}}

当前被阻塞，先不要进入实现。

外部阻塞原因：
{{task.blocked_reason}}

未完成前置任务：
{{task.open_dependencies}}

请先推进前置任务或澄清外部阻塞，解除后再重新判断它是否可执行。`;

const MISSING_DEPS_BODY = `任务 {{task.id}} 的依赖数据不完整。

开工入口：
先按 AGENTS.md 执行；只核对任务数据，不进入实现。

任务卡：
{{task.file}} 中的 {{task.id}}。

必读事实源：
{{task.source_docs}}

处理要求：
修正 dependencies 中不存在的任务：{{task.missing_dependencies}}。
修正后重新判断它是否可执行，不要直接开始实现。`;

const DEFAULT_BODY = `读取任务卡：{{task.file}}
读取来源文档：
{{task.source_docs}}
补充任务 {{task.id}} 的 next_action、acceptance、owner/agent 等协作字段后再执行。`;

// key -> 模板文本。eject 时按这些 key 生成 .ganttmd/templates/agent/<key>.md。
const BUILTIN_AGENT_COMMAND_TEMPLATES = {
  todo: TODO_BODY,
  in_progress: IN_PROGRESS_BODY,
  review: REVIEW_BODY,
  done: DONE_BODY,
  cancelled: CANCELLED_BODY,
  blocked: BLOCKED_BODY,
  missing_deps: MISSING_DEPS_BODY,
  default: DEFAULT_BODY,
};

// eject 时写到 .ganttmd/templates/agent/ 下的相对路径（相对 .ganttmd/）。
const EJECT_DIR = 'templates/agent';

function ejectRelativePath(key) {
  return `${EJECT_DIR}/${key}.md`;
}

module.exports = {
  BUILTIN_AGENT_COMMAND_TEMPLATES,
  EJECT_DIR,
  ejectRelativePath,
};
