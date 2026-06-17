const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('任务卡区分活跃分支和完成分支', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('completed_branch'), '任务卡必须读取 completed_branch');
  assert.ok(html.includes('完成分支'), '任务卡必须用中文标识完成分支');
  assert.ok(html.includes('completed-branch-tag'), '完成分支必须使用独立样式，不能复用活跃分支样式');
});

test('Agent 指令草案由任务字段生成可复制开工模板', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'src', 'agent-command-templates.js'), 'utf8');

  assert.ok(tpl.includes('必读事实源'), '指令草案必须展开 source_docs');
  assert.ok(tpl.includes('任务目标'), '指令草案必须展开 next_action');
  assert.ok(tpl.includes('执行范围'), '指令草案必须展开执行范围');
  assert.ok(tpl.includes('产出物 / 结果落点'), '指令草案必须展开交付落点');
  assert.ok(tpl.includes('验收重点'), '指令草案必须展开 acceptance');
  assert.ok(tpl.includes('边界 / 禁止事项'), '指令草案必须展开 downstream_constraints');
  assert.ok(tpl.includes('验证命令'), '指令草案必须展开 verification_commands 或默认验证要求');
  assert.ok(html.includes('主控已完成领取、分支和运行态安排'), '指令草案必须声明分支代理只做任务产出');
  assert.ok(html.includes('PR body'), '指令草案必须要求在 PR body 交付证据');
  assert.ok(html.includes('候选 follow-up'), '指令草案必须要求候选 follow-up 进入 PR body');
  assert.ok(html.includes('看板状态、runs、followups 由项目主控合并后统一处理'), '指令草案不得要求分支代理回写状态源');
  assert.ok(html.includes('templates.default'), '指令草案必须优先读取项目级默认模板配置');
  assert.ok(html.includes('agent_command_templates'), '指令草案必须支持按状态配置模板');
  assert.ok(html.includes('getAgentCommandTemplateKey'), '指令草案必须按任务状态选择模板');
  assert.ok(html.includes('agent_command_execution_setup'), '指令草案必须支持配置执行安排文案');
  assert.ok(html.includes('agent_command_delivery_requirements'), '指令草案必须支持配置交付要求文案');
  assert.ok(html.includes('renderAgentCommandTemplate'), '指令草案必须通过模板渲染函数展开任务字段');
  assert.ok(html.includes('{{task.id}}'), '源码中必须保留项目模板占位符支持');
  assert.ok(html.includes('task.blocked_reason'), '源码中必须保留阻塞模板占位符支持');
  assert.ok(html.includes('task.missing_dependencies'), '源码中必须保留缺失依赖模板占位符支持');
  assert.ok(!html.includes('bash scripts/new-task.sh'), '指令草案不得要求代理自行创建任务分支');
  assert.ok(!html.includes('更新任务卡 status / evidence / verification / review_status'), '指令草案不得要求分支代理回写任务卡');
  assert.ok(!html.includes('分支 / worktree 要求'), '指令草案不得保留旧分支要求章节');
});
