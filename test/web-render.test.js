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

  assert.ok(html.includes('function getBranchCommand(task)'), '指令草案必须派生 new-task 脚本命令');
  assert.ok(html.includes('bash scripts/new-task.sh'), '指令草案必须包含统一分支创建脚本');
  assert.ok(html.includes('必读事实源'), '指令草案必须展开 source_docs');
  assert.ok(html.includes('任务目标'), '指令草案必须展开 next_action');
  assert.ok(html.includes('执行范围'), '指令草案必须展开执行范围');
  assert.ok(html.includes('产出物 / 结果落点'), '指令草案必须展开交付落点');
  assert.ok(html.includes('验收重点'), '指令草案必须展开 acceptance');
  assert.ok(html.includes('边界 / 禁止事项'), '指令草案必须展开 downstream_constraints');
  assert.ok(html.includes('验证命令'), '指令草案必须展开 verification_commands 或默认验证要求');
  assert.ok(html.includes('分支 / worktree 要求'), '指令草案必须展开统一分支要求');
  assert.ok(html.includes('AI solo 项目运行工作流规范.md §0'), '指令草案必须引用工作流入口而不是重复红线');
  assert.ok(html.includes('Git工作流与提交规范.md §0'), '指令草案必须引用 Git 动作路由');
});
