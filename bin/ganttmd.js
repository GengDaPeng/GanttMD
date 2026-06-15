#!/usr/bin/env node

const { loadProject, validateProject } = require('../src/validator.js');
const Registry = require('../src/project-registry.js');
const { closeWatchers, startServer } = require('../src/server.js');
const { initProject } = require('../src/project-init.js');
const { doctorProject } = require('../src/doctor.js');
const { planMigration, applyMigration } = require('../src/migrator.js');
const { exportStatic } = require('../src/static-export.js');
const ServiceControl = require('../src/service-control.js');
const { claimRun, releaseRun } = require('../src/run-manager.js');

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
  } else {
    for (const item of issues) {
      const location = item.sourceFile ? ` ${item.sourceFile}` : '';
      const field = item.field ? ` [${item.field}]` : '';
      console.log(`- ${levelLabel(item.level)} ${item.id}${field}${location}：${item.message}`);
    }
  }

  return warnings.length > 0 ? 1 : 0;
}

function runValidate(args) {
  const options = parseRootAndFlags(args);
  const project = loadProject(options.root);
  const issues = validateProject(project);
  return printValidateResult(project, issues, options);
}

function printHelp() {
  console.log(`GanttMD

用法：
  ganttmd init [path]
  ganttmd validate [path] [--json]
  ganttmd doctor [path] [--json]
  ganttmd migrate [path] [--apply] [--json]
  ganttmd static [path] [--out .ganttmd-dist]
  ganttmd project add <path> [--id <id>] [--name <name>]
  ganttmd project list [--json]
  ganttmd project remove <id-or-path>
  ganttmd run claim <task-id> [path] [--branch <branch>] [--owner <owner>] [--agent <agent>]  # 写入本地 runtime store
  ganttmd run release [path] --branch <branch> [--status review|merged|abandoned] [--pr <PR#n>]  # 收口本地运行态
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

function readPositional(args, startIndex = 0) {
  return args.filter((arg, index) => index >= startIndex && !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
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

function runStatic(args) {
  const root = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--out') || process.cwd();
  const outDir = readOption(args, '--out') || '.ganttmd-dist';
  const result = exportStatic(root, outDir);
  console.log(`已导出静态看板：${result.indexPath}`);
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

function runRun(args) {
  const subcommand = args[0];
  if (subcommand === 'claim') {
    const positional = readPositional(args, 1);
    const taskId = positional[0];
    const root = positional[1] || process.cwd();
    if (!taskId) {
      console.error('缺少任务 ID：ganttmd run claim <task-id> [path]');
      return 1;
    }
    const result = claimRun(root, {
      taskId,
      id: readOption(args, '--id') || undefined,
      title: readOption(args, '--title') || undefined,
      branch: readOption(args, '--branch') || undefined,
      owner: readOption(args, '--owner') || undefined,
      agent: readOption(args, '--agent') || undefined,
      currentTask: readOption(args, '--current-task') || undefined,
      intent: readOption(args, '--intent') || undefined,
      note: readOption(args, '--note') || undefined,
      now: readOption(args, '--date') || undefined,
    });
    console.log(`${result.created ? '已登记运行态' : '已更新运行态'}：${result.run.id} ${result.run.branch} -> ${result.run.current_task}`);
    console.log(`runtime: ${result.storePath}`);
    return 0;
  }

  if (subcommand === 'release') {
    const positional = readPositional(args, 1);
    const root = positional[0] || process.cwd();
    const result = releaseRun(root, {
      id: readOption(args, '--id') || undefined,
      branch: readOption(args, '--branch') || undefined,
      taskId: readOption(args, '--task') || undefined,
      status: readOption(args, '--status') || undefined,
      pr: readOption(args, '--pr') || undefined,
      mergeCommit: readOption(args, '--merge-commit') || undefined,
      note: readOption(args, '--note') || undefined,
      now: readOption(args, '--date') || undefined,
      endedAt: readOption(args, '--ended-at') || undefined,
    });
    console.log(`已更新运行态：${result.run.id} ${result.run.branch} -> ${result.run.status}`);
    console.log(`runtime: ${result.storePath}`);
    return 0;
  }

  console.error(`未知 run 子命令：${subcommand || ''}`);
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
  const port = portValue ? Number(portValue) : 7777;
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
  const port = portValue ? Number(portValue) : 7777;
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

  if (command === 'static') {
    return runStatic(args.slice(1));
  }

  if (command === 'project') {
    return runProject(args.slice(1));
  }

  if (command === 'run') {
    return runRun(args.slice(1));
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
  runRun,
  runStatic,
  runValidate,
};
