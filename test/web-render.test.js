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
  assert.ok(html.includes('templates.default'), '指令草案必须读取项目统一配置中的默认模板');
  assert.ok(html.includes('agent_command_templates'), '指令草案必须从 loader 注入的模板集合读取配置');
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

test('Follow-up 使用可多选标签且不再显示等待外部资料', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('CLOSED_FOLLOWUP_STATUSES'), '前端必须显式定义闭环 Follow-up 状态集合');
  assert.ok(html.includes("selectedFollowupTags: ['all']"), 'Follow-up 默认必须保留并选中全部标签');
  assert.ok(html.includes("FOLLOWUP_TAGS = ['all', 'pending', 'decision', 'deferred', 'risk', 'converted', 'closed']"), 'Follow-up 必须包含全部和最终标签集');
  assert.ok(html.includes('toggleFollowupTag'), 'Follow-up 标签必须支持多选切换');
  assert.ok(html.includes('getFollowupTagItems'), 'Follow-up 渲染必须按标签集合过滤');
  assert.ok(html.includes("getFollowupStatus(item) === 'converted'"), '已转正式任务必须作为独立范围筛选');
  assert.ok(html.includes("['open', 'accepted'].includes(getFollowupStatus(item))"), '默认 Follow-up 范围只能展示待主控清理和主控已接受');
  assert.ok(html.includes('closed_by'), '带 closed_by 的 accepted Follow-up 也必须视为已关闭');
  assert.ok(html.includes('item.converted_task || item.closed_by'), '带 converted_task 的 accepted Follow-up 也必须视为已关闭');
  assert.ok(html.includes('getVisibleFollowups'), 'Follow-up 渲染必须通过统一过滤函数');
  assert.ok(html.includes('followup-tag-filter'), 'Follow-up 页面必须提供标签筛选按钮');
  assert.ok(html.includes("{ id: 'all', label: '全部'"), 'Follow-up 页面必须提供全部筛选');
  assert.ok(html.includes("if (tag === 'all') return state.followups"), '全部标签必须显示全部 Follow-up');
  assert.ok(html.includes("if (nextTag === 'all')"), '点击全部必须切换到全量视图');
  assert.ok(html.includes("followup:'待处理'"), '普通 Follow-up 必须显示为待处理');
  assert.ok(!html.includes('external_wait'), '等待外部资料不应再作为 Follow-up 标签');
  assert.ok(!html.includes('等待外部资料'), '页面不应再显示等待外部资料标签');
  assert.ok(html.includes('已转正式任务'), '按钮文案必须提供已转正式任务筛选');
  assert.ok(html.includes('已关闭'), '按钮文案必须提供已关闭筛选');
  assert.ok(!html.includes('已闭环历史'), '页面不应再显示已闭环历史文案');
});

test('项目列表提供网页删除登记入口且说明不删除用户数据', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('deleteProjectRegistration'), '项目列表必须调用删除登记函数');
  assert.ok(html.includes('project-delete-btn'), '项目卡必须提供删除按钮');
  assert.ok(html.includes('不会删除项目目录或用户数据'), '删除确认必须明确不删除用户数据');
  assert.ok(html.includes("method: 'DELETE'"), '删除登记必须调用 DELETE API');
});

test('已转正式任务的 Follow-up 卡片显示关联任务状态', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('getConvertedFollowupTask'), 'Follow-up 卡片必须解析 converted_task 对应的正式任务');
  assert.ok(html.includes('state.byId.get(item.converted_task)'), '关联任务状态必须来自任务索引，不能只显示 Follow-up 自身状态');
  assert.ok(html.includes('renderFollowupTaskStatusBadge'), '已转正式任务卡片必须在右上角显示正式任务当前状态');
  assert.ok(html.includes('convertedTask._effective || convertedTask.status'), '正式任务状态应优先显示有效状态');
  assert.ok(html.includes('isTransferredFollowup'), '卡片标签必须区分曾转正式任务和仍待跟进的已转任务范围');
  assert.ok(html.includes('if (!isTransferredFollowup(item)) return followupKindLabel(getFollowupKind(item))'), '已完成分组里的已转任务仍必须显示已转正式任务标签');
  assert.ok(html.includes("return '已转正式任务'"), 'Follow-up 阶段标签必须只显示已转正式任务，不混入正式任务状态');
  assert.ok(!html.includes('正式任务状态 ${esc(statusLabel(convertedStatus))}'), '正式任务状态不能在卡片底部重复显示');
});

test('已完成正式任务的 Follow-up 归入已完成分组且保持卡片样式一致', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('getFollowupDisplayStatus'), 'Follow-up 分组必须支持按关联正式任务状态重算显示状态');
  assert.ok(html.includes("if (convertedStatus === 'done') return 'done'"), '关联正式任务已完成时必须进入已完成分组');
  assert.ok(html.includes('displayableFollowups.filter(f => getFollowupDisplayStatus(f) === status)'), 'Follow-up 分组不能只按自身 status 分组');
  assert.ok(html.includes('followup-task-status'), '正式任务状态必须使用 Follow-up 卡片自己的状态样式');
  assert.ok(!html.includes('<span class="dep-status ${esc(convertedStatus)}">正式任务状态'), 'Follow-up 卡片不能复用依赖状态样式');
});
