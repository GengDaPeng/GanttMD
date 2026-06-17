const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { BUILTIN_AGENT_COMMAND_TEMPLATES } = require('../src/agent-command-templates.js');
const { planTemplateEject, applyTemplateEject } = require('../src/template-eject.js');
const { loadProject, parseAgentCommandConfig } = require('../src/project-loader.js');

const EXPECTED_KEYS = ['todo', 'in_progress', 'review', 'done', 'cancelled', 'blocked', 'missing_deps', 'default'];

// web/index.html renderAgentCommandTemplate 的 values 表支持的占位符。
// 内置模板只能用这些占位符，否则页面会渲染成空串。改这张表时必须同步页面。
const SUPPORTED_PLACEHOLDERS = new Set([
  'task.id', 'task.title', 'task.status', 'task.file', 'task.next_action',
  'task.execution_scope', 'task.output_target', 'task.acceptance',
  'task.downstream_constraints', 'task.verification_commands', 'task.source_docs',
  'task.blocked_reason', 'task.open_dependencies', 'task.missing_dependencies',
  'task.downstream', 'execution_setup', 'delivery_requirements', 'critical_path_note',
]);

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-tpl-'));
  const ganttRoot = path.join(root, '.ganttmd');
  fs.mkdirSync(path.join(ganttRoot, 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(ganttRoot, 'config.yaml'), `ganttmd:
  schema_version: 1
project:
  id: tpl
  name: 模板测试
milestones:
  - id: M1
    name: 一阶段
    status: in_progress
`);
  fs.writeFileSync(path.join(ganttRoot, 'tasks', 'main.md'), `\`\`\`ganttmd-task
id: T1
title: 任务
status: todo
dependencies: []
milestone: M1
track: backend
domain: foundation
source_docs: [README.md]
next_action: x
acceptance: [done]
\`\`\`
`);
  fs.writeFileSync(path.join(root, 'README.md'), '# x');
  return { root, ganttRoot };
}

test('内置模板覆盖所有任务状态 key', () => {
  assert.deepEqual(Object.keys(BUILTIN_AGENT_COMMAND_TEMPLATES).sort(), [...EXPECTED_KEYS].sort());
  for (const key of EXPECTED_KEYS) {
    assert.equal(typeof BUILTIN_AGENT_COMMAND_TEMPLATES[key], 'string');
    assert.ok(BUILTIN_AGENT_COMMAND_TEMPLATES[key].length > 0, `${key} 模板为空`);
  }
});

test('内置模板只使用页面支持的占位符', () => {
  for (const [key, text] of Object.entries(BUILTIN_AGENT_COMMAND_TEMPLATES)) {
    const used = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)].map((m) => m[1]);
    for (const placeholder of used) {
      assert.ok(
        SUPPORTED_PLACEHOLDERS.has(placeholder),
        `${key} 模板使用了页面不支持的占位符：{{${placeholder}}}`
      );
    }
  }
});

test('页面 renderAgentCommandTemplate 的占位符表与守卫集合一致', () => {
  // 防止页面 values 表和内置模板悄悄漂移：页面新增/删除占位符时此断言会失败，提醒同步。
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
  const start = html.indexOf('function renderAgentCommandTemplate');
  assert.ok(start !== -1, '页面缺少 renderAgentCommandTemplate');
  const slice = html.slice(start, start + 1600);
  for (const placeholder of SUPPORTED_PLACEHOLDERS) {
    assert.ok(
      slice.includes(`'${placeholder}'`) || slice.includes(placeholder),
      `页面 values 表缺少占位符：${placeholder}`
    );
  }
});

test('loadProject 在项目未自定义时注入全部内置模板', () => {
  const { root } = makeProject();
  const project = loadProject(root);
  const templates = project.config.ganttmd.agent_command_templates;
  for (const key of EXPECTED_KEYS) {
    assert.ok(templates[key], `缺少注入的内置模板：${key}`);
    assert.equal(templates[key].builtin, true);
    assert.equal(templates[key].text, BUILTIN_AGENT_COMMAND_TEMPLATES[key]);
  }
});

test('parseAgentCommandConfig 支持统一配置块和多行模板', () => {
  const config = parseAgentCommandConfig(`ganttmd:
  schema_version: 1

agent_command:
  execution_setup: 主控负责分支
  delivery_requirements: PR body 写证据
  templates:
    default: |
      默认 {{task.id}}
      第二行
    review:
      body: |
        复核 {{task.id}}
    blocked:
      body: |
        阻塞 {{task.id}}

project:
  id: demo
`);

  assert.equal(config.execution_setup, '主控负责分支');
  assert.equal(config.delivery_requirements, 'PR body 写证据');
  assert.equal(config.templates.default.body, '默认 {{task.id}}\n第二行');
  assert.equal(config.templates.review.body, '复核 {{task.id}}');
  assert.equal(config.templates.blocked.body, '阻塞 {{task.id}}');
});

test('loadProject 支持 agent_command 主配置内联模板', () => {
  const { root, ganttRoot } = makeProject();
  fs.appendFileSync(path.join(ganttRoot, 'config.yaml'), `
agent_command:
  execution_setup: 新执行安排
  delivery_requirements: 新交付要求
  templates:
    default: |
      统一默认 {{task.id}}
    review:
      body: |
        内联复核 {{task.id}}
    blocked:
      body: |
        内联阻塞 {{task.id}}
`);

  const project = loadProject(root);
  const ganttmd = project.config.ganttmd;
  assert.equal(ganttmd.agent_command_execution_setup, '新执行安排');
  assert.equal(ganttmd.agent_command_delivery_requirements, '新交付要求');
  assert.equal(ganttmd.agent_command_templates.default.text, '统一默认 {{task.id}}');
  assert.equal(ganttmd.agent_command_templates.default.inline, true);
  assert.equal(ganttmd.agent_command_templates.review.text, '内联复核 {{task.id}}');
  assert.equal(ganttmd.agent_command_templates.blocked.text, '内联阻塞 {{task.id}}');
});

test('template eject 计划：追加统一 agent_command 配置块', () => {
  const { root } = makeProject();
  const plan = planTemplateEject(root);
  assert.equal(plan.configExists, true);
  assert.equal(plan.hasAgentCommand, false);
  assert.equal(plan.willUpdateConfig, true);
});

test('template eject 应用：只更新 config.yaml，不创建模板文件', () => {
  const { root, ganttRoot } = makeProject();
  const result = applyTemplateEject(root);

  assert.equal(result.configUpdated, true);
  assert.ok(result.backupRoot, '应备份 config.yaml');
  assert.equal(fs.existsSync(path.join(ganttRoot, 'templates')), false, '不应创建多模板文件目录');

  const config = fs.readFileSync(path.join(ganttRoot, 'config.yaml'), 'utf8');
  assert.match(config, /^agent_command:\s*$/m);
  assert.match(config, /^\s+templates:\s*$/m);
  for (const key of EXPECTED_KEYS) {
    assert.match(config, new RegExp(`^\\s+${key}:\\s*$`, 'm'), `缺少 ${key} 内联模板`);
  }

  const project = loadProject(root);
  assert.equal(project.config.ganttmd.agent_command_templates.todo.text.trim(), BUILTIN_AGENT_COMMAND_TEMPLATES.todo.trim());

  const second = applyTemplateEject(root);
  assert.equal(second.configUpdated, false, '已有 agent_command 时默认不重复追加');
});

test('template eject 拒绝 config.yaml 是外部 symlink（P1）', () => {
  const { root, ganttRoot } = makeProject();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-outside-cfg-'));
  const outsideConfig = path.join(outsideDir, 'evil.yaml');
  fs.writeFileSync(outsideConfig, 'project:\n  id: evil\n');

  const configPath = path.join(ganttRoot, 'config.yaml');
  fs.rmSync(configPath);
  fs.symlinkSync(outsideConfig, configPath);

  assert.throws(
    () => applyTemplateEject(root),
    /必须位于 .ganttmd 目录内，且不能是指向外部的符号链接/
  );
});

test('template eject 拒绝 .ganttmd 根目录是外部 symlink（P1）', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-root-link-'));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-outside-root-'));
  fs.mkdirSync(path.join(outsideRoot, 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(outsideRoot, 'config.yaml'), 'project:\n  id: outside\n');
  fs.symlinkSync(outsideRoot, path.join(root, '.ganttmd'));

  assert.throws(
    () => applyTemplateEject(root),
    /必须位于 .ganttmd 目录内，且不能是指向外部的符号链接/
  );
  assert.equal(fs.readFileSync(path.join(outsideRoot, 'config.yaml'), 'utf8'), 'project:\n  id: outside\n');
});
