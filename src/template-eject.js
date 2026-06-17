const fs = require('node:fs');
const path = require('node:path');

const { resolveGanttRoot } = require('./project-loader.js');
const { ensureManagedPath, backupDirName } = require('./fs-safety.js');
const { BUILTIN_AGENT_COMMAND_TEMPLATES } = require('./agent-command-templates.js');

const DEFAULT_EXECUTION_SETUP = '主控已完成领取、分支和运行态安排；分支代理只做任务产出。';
const DEFAULT_DELIVERY_REQUIREMENTS = '在 PR body 交付验证证据、影响范围和候选 follow-up。';

function indentBlock(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return String(text).trimEnd().split(/\r?\n/).map((line) => `${prefix}${line}`).join('\n');
}

function formatAgentCommandConfigBlock() {
  const lines = [
    'agent_command:',
    `  execution_setup: ${DEFAULT_EXECUTION_SETUP}`,
    `  delivery_requirements: ${DEFAULT_DELIVERY_REQUIREMENTS}`,
    '  templates:',
  ];

  for (const [key, body] of Object.entries(BUILTIN_AGENT_COMMAND_TEMPLATES)) {
    lines.push(`    ${key}:`);
    lines.push('      body: |');
    lines.push(indentBlock(body, 8));
  }

  return `${lines.join('\n')}\n`;
}

function hasAgentCommandConfig(configText) {
  return /^agent_command:\s*$/m.test(configText);
}

// 计划：把内置 Agent 指令模板导出为 config.yaml 内的统一 agent_command 配置块。
function planTemplateEject(projectRoot = process.cwd(), options = {}) {
  const ganttRoot = resolveGanttRoot(projectRoot);
  const configPath = path.join(ganttRoot, 'config.yaml');
  const configExists = fs.existsSync(configPath);
  const configText = configExists ? fs.readFileSync(configPath, 'utf8') : '';
  const hasAgentCommand = hasAgentCommandConfig(configText);
  return {
    ganttRoot,
    configPath,
    configExists,
    hasAgentCommand,
    force: Boolean(options.force),
    willUpdateConfig: configExists && !hasAgentCommand,
  };
}

// 执行导出。已有 agent_command 配置时不覆盖，避免制造多个配置入口。
function applyTemplateEject(projectRoot = process.cwd(), options = {}) {
  const plan = planTemplateEject(projectRoot, options);
  if (!plan.configExists || !plan.willUpdateConfig) {
    return {
      ganttRoot: plan.ganttRoot,
      configUpdated: false,
      configExists: plan.configExists,
      hasAgentCommand: plan.hasAgentCommand,
      backupRoot: '',
    };
  }

  ensureManagedPath(plan.ganttRoot, plan.configPath, '指令模板写入目标');
  const current = fs.readFileSync(plan.configPath, 'utf8');
  const backupRoot = path.join(plan.ganttRoot, '.backup', backupDirName());
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.copyFileSync(plan.configPath, path.join(backupRoot, 'config.yaml'));

  const sep = current.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(plan.configPath, current + sep + formatAgentCommandConfigBlock());

  return {
    ganttRoot: plan.ganttRoot,
    configUpdated: true,
    configExists: true,
    hasAgentCommand: plan.hasAgentCommand,
    backupRoot,
  };
}

module.exports = {
  formatAgentCommandConfigBlock,
  hasAgentCommandConfig,
  planTemplateEject,
  applyTemplateEject,
};
