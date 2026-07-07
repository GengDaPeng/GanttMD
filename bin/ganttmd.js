#!/usr/bin/env node

const { loadProject, validateProject } = require('../src/validator.js');
const Registry = require('../src/project-registry.js');
const { closeWatchers, startServer } = require('../src/server.js');
const { initProject } = require('../src/project-init.js');
const { doctorProject } = require('../src/doctor.js');
const { planMigration, applyMigration } = require('../src/migrator.js');
const { planUpgrade, applyUpgrade } = require('../src/upgrader.js');
const { exportStatic } = require('../src/static-export.js');
const { planTemplateEject, applyTemplateEject } = require('../src/template-eject.js');
const ServiceControl = require('../src/service-control.js');

function parseRootAndFlags(args) {
  return {
    json: args.includes('--json'),
    root: args.find((arg) => !arg.startsWith('--')) || process.cwd(),
  };
}

function levelLabel(level) {
  if (level === 'warn') return '警告';
  if (level === 'info') return '提示';
  return level;
}

function printIssueLine(item) {
  const location = item.sourceFile ? ` ${item.sourceFile}` : '';
  const field = item.field ? ` [${item.field}]` : '';
  console.log(`- ${levelLabel(item.level)} ${item.id}${field}${location}：${item.message}`);
}

function printValidateResult(project, issues, options) {
  const warnings = issues.filter((item) => item.level === 'warn');

  if (options.json) {
    console.log(JSON.stringify({
      root: project.root,
      ganttRoot: project.ganttRoot,
      taskCount: project.tasks.length,
      followupCount: project.followups.length,
      runCount: project.runs.length,
      checklistCount: project.checklists.length,
      issueCount: issues.length,
      warningCount: warnings.length,
      issues,
    }, null, 2));
    return warnings.length > 0 ? 1 : 0;
  }

  console.log(`GanttMD 校验：${project.ganttRoot}`);
  console.log(`任务 ${project.tasks.length} 个，follow-up ${project.followups.length} 个，run ${project.runs.length} 个，checklist ${project.checklists.length} 个，警告 ${warnings.length} 个，提示 ${issues.length - warnings.length} 个。`);

  if (issues.length === 0) {
    console.log('未发现结构问题。');
  } else if (options.verbose) {
    for (const item of issues) printIssueLine(item);
  } else {
    const limit = options.detailLimit || 10;
    const total = {};
    for (const item of issues) {
      const k = item.level + '|' + (item.field || '');
      total[k] = (total[k] || 0) + 1;
    }
    const shown = {};
    for (const item of issues) {
      const k = item.level + '|' + (item.field || '');
      if (total[k] <= limit) { printIssueLine(item); continue; }
      shown[k] = (shown[k] || 0) + 1;
      if (shown[k] <= limit) {
        printIssueLine(item);
      } else if (shown[k] === limit + 1) {
        const fieldLabel = item.field ? ` [${item.field}]` : '';
        console.log(`  …… 本组（${levelLabel(item.level)}${fieldLabel}）共 ${total[k]} 条，其余 ${total[k] - limit} 条已折叠，加 --verbose 查看全部`);
      }
    }
  }

  return warnings.length > 0 ? 1 : 0;
}

function runValidate(args) {
  const options = parseRootAndFlags(args);
  options.verbose = args.includes('--verbose') || args.includes('--full');
  const project = loadProject(options.root);
  const rawLimit = Number(project.config.validation && project.config.validation.warning_detail_limit);
  options.detailLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const issues = validateProject(project);
  return printValidateResult(project, issues, options);
}

function printHelp() {
  console.log(`GanttMD

用法：
  ganttmd init [path]
  ganttmd validate [path] [--json] [--verbose]
  ganttmd doctor [path] [--json]
  ganttmd migrate [path] [--apply] [--json]
  ganttmd upgrade [path] [--apply] [--json]
  ganttmd static [path] [--out .ganttmd-dist]
  ganttmd template eject [path] [--dry-run]
  ganttmd project add <path> [--id <id>] [--name <name>]
  ganttmd project list [--json]
  ganttmd project remove <id-or-path>
  ganttmd serve [--port 7777]
  ganttmd start [--port 7777] [--no-open]
  ganttmd status [--json]
  ganttmd stop [--json]
  ganttmd --help
  ganttmd --version
`);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return '';
  return args[index + 1] || '';
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return NaN;
  return port;
}

function runInit(args) {
  const root = args.find((arg) => !arg.startsWith('--')) || process.cwd();
  const result = initProject(root);
  console.log(`GanttMD 初始化：${result.ganttRoot}`);
  if (result.created.length === 0) {
    console.log('没有新增文件，已有数据未被覆盖。');
    return 0;
  }
  for (const filePath of result.created) {
    console.log(`- 创建 ${filePath}`);
  }
  return 0;
}

function printDoctorResult(result, options) {
  const warnings = [
    ...result.issues.filter((issue) => issue.level === 'warn'),
    ...result.doctorIssues.filter((issue) => issue.level === 'warn'),
  ];

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return warnings.length > 0 ? 1 : 0;
  }

  console.log(`GanttMD Doctor：${result.ganttRoot}`);
  console.log(`schema：项目 ${result.projectSchemaVersion || '未声明'} / 工具 ${result.toolSchemaVersion}`);
  console.log(`任务 ${result.taskCount} 个，follow-up ${result.followupCount} 个，run ${result.runCount} 个，checklist ${result.checklistCount} 个。`);

  const allIssues = [...result.doctorIssues, ...result.issues];
  if (allIssues.length === 0) {
    console.log('未发现环境或结构问题。');
  } else {
    for (const item of allIssues) {
      const location = item.sourceFile ? ` ${item.sourceFile}` : '';
      const field = item.field ? ` [${item.field}]` : '';
      console.log(`- ${levelLabel(item.level)}${item.id ? ` ${item.id}` : ''}${field}${location}：${item.message}`);
    }
  }

  return warnings.length > 0 ? 1 : 0;
}

function runDoctor(args) {
  const options = parseRootAndFlags(args);
  const result = doctorProject(options.root);
  return printDoctorResult(result, options);
}

function printMigrationPlan(plan) {
  console.log(`GanttMD 迁移计划：${plan.ganttRoot}`);
  if (plan.changes.length === 0) {
    console.log('无需迁移。');
    return;
  }
  for (const change of plan.changes) {
    console.log(`- ${change.type} ${change.file}：${change.description}`);
  }
}

function runMigrate(args) {
  const options = parseRootAndFlags(args);
  const shouldApply = args.includes('--apply');
  const result = shouldApply ? applyMigration(options.root) : planMigration(options.root);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  printMigrationPlan(result);
  if (!shouldApply && result.changes.length > 0) {
    console.log('这是 dry-run。确认后运行：ganttmd migrate <path> --apply');
  }
  if (shouldApply) {
    console.log(result.applied ? `已应用迁移，备份目录：${result.backupRoot}` : '无需迁移。');
  }
  return 0;
}

function printUpgradeResult(result, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log(`GanttMD 升级计划：${result.ganttRoot}`);
  const sections = [
    ['created', '创建'],
    ['modified', '修改'],
    ['removed', '删除'],
  ];
  let actionCount = 0;
  for (const [field, label] of sections) {
    for (const item of result[field]) {
      actionCount++;
      console.log(`- ${label} ${item.file}：${item.description}`);
    }
  }
  for (const warning of result.warnings) {
    console.log(`- 警告 ${warning.file}：${warning.message}`);
  }
  if (actionCount === 0 && result.warnings.length === 0) {
    console.log('无需升级。');
  } else if (actionCount === 0 && result.warnings.length > 0) {
    console.log('当前没有可自动应用的升级项；如需处理，请先查看 warning。');
  }
  return 0;
}

function runUpgrade(args) {
  const options = parseRootAndFlags(args);
  const shouldApply = args.includes('--apply');
  const result = shouldApply ? applyUpgrade(options.root) : planUpgrade(options.root);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  printUpgradeResult(result);
  const actionCount = result.created.length + result.modified.length + result.removed.length;
  if (!shouldApply) {
    if (actionCount > 0) {
      console.log('这是 dry-run。确认后运行：ganttmd upgrade <path> --apply');
    } else if (result.warnings.length > 0) {
      console.log('这是 dry-run。当前只有 warning，没有自动写盘动作。');
    }
  }
  if (shouldApply && result.applied) {
    console.log(`已应用升级，备份目录：${result.backupRoot}`);
  }
  return 0;
}

function runStatic(args) {
  const root = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--out') || process.cwd();
  const outDir = readOption(args, '--out') || '.ganttmd-dist';
  const result = exportStatic(root, outDir);
  console.log(`已导出静态看板：${result.indexPath}`);
  return 0;
}

function runTemplate(args) {
  const subcommand = args[0];
  if (subcommand !== 'eject') {
    console.error(`未知 template 子命令：${subcommand || ''}`);
    printHelp();
    return 1;
  }

  const root = args.find((arg, index) => index > 0 && !arg.startsWith('--')) || process.cwd();
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    const plan = planTemplateEject(root);
    console.log(`GanttMD 指令模板导出计划：${plan.ganttRoot}`);
    if (!plan.configExists) {
      console.log('- 未找到 config.yaml，无法自动写入 agent_command 配置块');
    } else if (plan.willUpdateConfig) {
      console.log('- 在 config.yaml 追加 agent_command 配置块');
    } else if (plan.hasAgentCommand) {
      console.log('- config.yaml 已有 agent_command 配置块，保持不变');
    }
    console.log('这是 dry-run。确认后运行：ganttmd template eject <path>');
    return 0;
  }

  const result = applyTemplateEject(root);
  console.log(`GanttMD 指令模板导出：${result.ganttRoot}`);
  if (result.configUpdated) {
    console.log('已在 config.yaml 追加 agent_command 配置块。');
  } else if (result.hasAgentCommand) {
    console.log('config.yaml 已有 agent_command 配置块，未改动。');
  } else if (!result.configExists) {
    console.log('未找到 config.yaml，请手动配置 agent_command 配置块。');
  }
  if (result.backupRoot) {
    console.log(`备份目录：${result.backupRoot}`);
  }
  console.log('现在可以编辑 config.yaml 的 agent_command 配置块，刷新看板即生效。');
  return 0;
}

function runProject(args) {
  const subcommand = args[0];
  if (subcommand === 'add') {
    const projectPath = args.find((arg, index) => index > 0 && !arg.startsWith('--') && args[index - 1] !== '--id' && args[index - 1] !== '--name');
    if (!projectPath) {
      console.error('缺少项目路径：ganttmd project add <path>');
      return 1;
    }
    const registry = Registry.addProject(projectPath, {
      id: readOption(args, '--id') || undefined,
      name: readOption(args, '--name') || undefined,
    });
    const entry = registry.projects.find((project) => project.root === require('node:path').resolve(projectPath));
    console.log(`已登记项目：${entry.id} ${entry.root}`);
    return 0;
  }

  if (subcommand === 'list') {
    const registry = Registry.loadRegistry();
    if (args.includes('--json')) {
      console.log(JSON.stringify(registry, null, 2));
      return 0;
    }
    if (registry.projects.length === 0) {
      console.log('未登记项目。');
      return 0;
    }
    for (const project of registry.projects) {
      console.log(`${project.id}\t${project.name}\t${project.root}`);
    }
    return 0;
  }

  if (subcommand === 'remove') {
    const id = args[1];
    if (!id) {
      console.error('缺少项目 ID 或路径：ganttmd project remove <id-or-path>');
      return 1;
    }
    Registry.removeProject(id);
    console.log(`已移除项目登记：${id}`);
    return 0;
  }

  console.error(`未知 project 子命令：${subcommand || ''}`);
  printHelp();
  return 1;
}


function printServiceStatus(status, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return 0;
  }
  if (status.running) {
    console.log(`${status.message}：${status.url || `http://127.0.0.1:${status.port}`}`);
    console.log(`pid: ${status.pid}`);
  } else {
    console.log(status.message || 'GanttMD Local 未启动');
  }
  return 0;
}

function runStart(args) {
  const portValue = readOption(args, '--port');
  const port = portValue ? parsePort(portValue) : 7777;
  if (!Number.isInteger(port) || port <= 0) {
    console.error('port 必须是正整数');
    return 1;
  }
  const result = ServiceControl.startServerProcess({ port });
  if (result.alreadyRunning) {
    console.log(`GanttMD Local 已在运行：${result.url}`);
    return 0;
  }
  console.log(`GanttMD Local 已启动：${result.url}`);
  console.log(`pid: ${result.pid}`);
  if (!args.includes('--no-open')) {
    ServiceControl.openUrl(result.url);
  }
  return 0;
}

function runStatus(args) {
  const status = ServiceControl.readServerState();
  return printServiceStatus(status, { json: args.includes('--json') });
}

function runStop(args) {
  const result = ServiceControl.stopServerProcess();
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  console.log('GanttMD Local 已停止');
  return 0;
}

async function runServe(args) {
  const portValue = readOption(args, '--port');
  const port = portValue ? parsePort(portValue) : 7777;
  if (!Number.isInteger(port) || port <= 0) {
    console.error('port 必须是正整数');
    return 1;
  }
  const result = await startServer({ port, registryPath: process.env.GANTTMD_REGISTRY_PATH });
  const shutdown = () => {
    closeWatchers();
    result.server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  console.log(`GanttMD Local: ${result.url}`);
  return new Promise(() => {});
}

async function main(argv) {
  const args = argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (command === '--version' || command === '-v') {
    console.log(require('../package.json').version);
    return 0;
  }

  if (command === 'start') {
    return runStart(args.slice(1));
  }

  if (command === 'status') {
    return runStatus(args.slice(1));
  }

  if (command === 'stop') {
    return runStop(args.slice(1));
  }

  if (command === 'validate') {
    return runValidate(args.slice(1));
  }

  if (command === 'init') {
    return runInit(args.slice(1));
  }

  if (command === 'doctor') {
    return runDoctor(args.slice(1));
  }

  if (command === 'migrate') {
    return runMigrate(args.slice(1));
  }

  if (command === 'upgrade') {
    return runUpgrade(args.slice(1));
  }

  if (command === 'static') {
    return runStatic(args.slice(1));
  }

  if (command === 'template') {
    return runTemplate(args.slice(1));
  }

  if (command === 'project') {
    return runProject(args.slice(1));
  }

  if (command === 'serve') {
    return runServe(args.slice(1));
  }

  console.error(`未知命令：${command}`);
  printHelp();
  return 1;
}

if (require.main === module) {
  main(process.argv)
    .then((code) => { process.exitCode = code; })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  main,
  parseRootAndFlags,
  printValidateResult,
  runDoctor,
  runInit,
  runMigrate,
  runStatic,
  runTemplate,
  runValidate,
};
