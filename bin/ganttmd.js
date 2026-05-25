#!/usr/bin/env node

const { loadProject, validateProject } = require('../src/validator.js');
const Registry = require('../src/project-registry.js');
const { startServer } = require('../src/server.js');

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
  ganttmd validate [path] [--json]
  ganttmd project add <path> [--id <id>] [--name <name>]
  ganttmd project list [--json]
  ganttmd project remove <id-or-path>
  ganttmd serve [--port 7777]
  ganttmd --help
  ganttmd --version
`);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return '';
  return args[index + 1] || '';
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

async function runServe(args) {
  const portValue = readOption(args, '--port');
  const port = portValue ? Number(portValue) : 7777;
  if (!Number.isInteger(port) || port <= 0) {
    console.error('port 必须是正整数');
    return 1;
  }
  const result = await startServer({ port });
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

  if (command === 'validate') {
    return runValidate(args.slice(1));
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
  runValidate,
};
