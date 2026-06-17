const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { BUILTIN_AGENT_COMMAND_TEMPLATES, ejectRelativePath } = require('../src/agent-command-templates.js');
const { planTemplateEject, applyTemplateEject } = require('../src/template-eject.js');
const { loadProject } = require('../src/project-loader.js');

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

test('template eject 计划：默认创建、不覆盖已存在', () => {
  const { root, ganttRoot } = makeProject();
  // 先放一个用户已有的 todo.md
  const todoPath = path.join(ganttRoot, ejectRelativePath('todo'));
  fs.mkdirSync(path.dirname(todoPath), { recursive: true });
  fs.writeFileSync(todoPath, '用户已有内容');

  const plan = planTemplateEject(root);
  const todo = plan.files.find((f) => f.key === 'todo');
  const review = plan.files.find((f) => f.key === 'review');
  assert.equal(todo.exists, true);
  assert.equal(todo.willWrite, false, '已存在文件默认不覆盖');
  assert.equal(review.exists, false);
  assert.equal(review.willWrite, true);
});

test('template eject 应用：写文件、追加 config 映射、保留用户文件', () => {
  const { root, ganttRoot } = makeProject();
  const todoPath = path.join(ganttRoot, ejectRelativePath('todo'));
  fs.mkdirSync(path.dirname(todoPath), { recursive: true });
  fs.writeFileSync(todoPath, '用户已有内容');

  const result = applyTemplateEject(root);

  // todo 被跳过（用户文件保留），其它被创建
  assert.ok(result.skipped.includes(ejectRelativePath('todo')));
  assert.ok(result.written.includes(ejectRelativePath('review')));
  assert.equal(fs.readFileSync(todoPath, 'utf8'), '用户已有内容', '用户已有模板未被覆盖');

  // 各模板文件落地
  for (const key of EXPECTED_KEYS) {
    assert.ok(fs.existsSync(path.join(ganttRoot, ejectRelativePath(key))), `缺少 ${key}.md`);
  }

  // config 追加了映射（全部 8 个 key）
  assert.equal(result.configUpdated, true);
  const config = fs.readFileSync(path.join(ganttRoot, 'config.yaml'), 'utf8');
  assert.match(config, /^agent_command_templates:\s*$/m);
  for (const key of EXPECTED_KEYS) {
    assert.match(config, new RegExp(`${key}: templates/agent/${key}\\.md`));
  }

  // 再 eject 一次：全部 key 已映射，config 不再改动，且不重复 section
  const second = applyTemplateEject(root);
  assert.equal(second.configUpdated, false);
  const configAfter = fs.readFileSync(path.join(ganttRoot, 'config.yaml'), 'utf8');
  assert.equal((configAfter.match(/^agent_command_templates:\s*$/gm) || []).length, 1);
});

test('template eject 对已有部分映射只补齐缺失 key（P2）', () => {
  const { root, ganttRoot } = makeProject();
  // config 已有部分映射：只配了 todo（指向用户自定义文件）
  const configPath = path.join(ganttRoot, 'config.yaml');
  fs.appendFileSync(configPath, `
agent_command_templates:
  todo: templates/agent/todo.md
`);

  const result = applyTemplateEject(root);
  assert.equal(result.configUpdated, true, '应追加缺失映射');

  const config = fs.readFileSync(configPath, 'utf8');
  // 只有一个 section，已有的 todo 保留，缺失的 review/done/blocked 等被补齐
  assert.equal((config.match(/^agent_command_templates:\s*$/gm) || []).length, 1);
  assert.equal((config.match(/^\s+todo: /gm) || []).length, 1, 'todo 不应重复');
  for (const key of EXPECTED_KEYS) {
    assert.match(config, new RegExp(`^\\s+${key}: templates/agent/${key}\\.md`, 'm'), `缺少 ${key} 映射`);
  }

  // 补齐后所有 key 都能被 loader 读到对应文件
  const project = loadProject(root);
  const templates = project.config.ganttmd.agent_command_templates;
  for (const key of EXPECTED_KEYS) {
    assert.notEqual(templates[key].builtin, true, `${key} 应来自文件而非内置注入`);
  }
});

test('template eject --force 拒绝写穿 symlink（P1）', () => {
  const { root, ganttRoot } = makeProject();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-outside-'));
  const outsideFile = path.join(outsideDir, 'secret.md');
  fs.writeFileSync(outsideFile, '外部敏感内容');

  // 把 todo.md 做成指向外部的 symlink
  const todoPath = path.join(ganttRoot, ejectRelativePath('todo'));
  fs.mkdirSync(path.dirname(todoPath), { recursive: true });
  fs.symlinkSync(outsideFile, todoPath);

  assert.throws(
    () => applyTemplateEject(root, { force: true }),
    /必须位于 .ganttmd 目录内，且不能是指向外部的符号链接/
  );
  // 外部文件未被写穿
  assert.equal(fs.readFileSync(outsideFile, 'utf8'), '外部敏感内容');
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
  assert.equal(fs.existsSync(path.join(outsideRoot, 'templates', 'agent', 'todo.md')), false);
});

test('template eject --force 覆盖已存在文件并备份', () => {
  const { root, ganttRoot } = makeProject();
  const todoPath = path.join(ganttRoot, ejectRelativePath('todo'));
  fs.mkdirSync(path.dirname(todoPath), { recursive: true });
  fs.writeFileSync(todoPath, '旧内容');

  const result = applyTemplateEject(root, { force: true });
  assert.ok(result.written.includes(ejectRelativePath('todo')));
  assert.equal(fs.readFileSync(todoPath, 'utf8').trim(), BUILTIN_AGENT_COMMAND_TEMPLATES.todo.trim());
  assert.ok(result.backupRoot, '应有备份目录');
  assert.ok(fs.existsSync(path.join(result.backupRoot, ejectRelativePath('todo'))), '备份缺少 todo.md');
  assert.equal(fs.readFileSync(path.join(result.backupRoot, ejectRelativePath('todo')), 'utf8'), '旧内容');
});

test('eject 后用户编辑的模板覆盖内置，未编辑的保留导出副本', () => {
  const { root, ganttRoot } = makeProject();
  applyTemplateEject(root);

  // 用户改 todo
  fs.writeFileSync(path.join(ganttRoot, ejectRelativePath('todo')), '自定义 {{task.id}} 指令');

  const project = loadProject(root);
  const templates = project.config.ganttmd.agent_command_templates;
  assert.equal(templates.todo.text.trim(), '自定义 {{task.id}} 指令');
  assert.notEqual(templates.todo.builtin, true, 'todo 现在是文件来源');
  // review 仍是导出的内置内容
  assert.equal(templates.review.text.trim(), BUILTIN_AGENT_COMMAND_TEMPLATES.review.trim());
});
