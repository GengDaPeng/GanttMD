#!/usr/bin/env node

const { loadProject, validateProject } = require('../src/validator.js');

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
      issueCount: issues.length,
      warningCount: warnings.length,
      issues,
    }, null, 2));
    return warnings.length > 0 ? 1 : 0;
  }

  console.log(`GanttMD 校验：${project.ganttRoot}`);
  console.log(`任务 ${project.tasks.length} 个，follow-up ${project.followups.length} 个，警告 ${warnings.length} 个，提示 ${issues.length - warnings.length} 个。`);

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
  ganttmd --help
  ganttmd --version
`);
}

function main(argv) {
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

  console.error(`未知命令：${command}`);
  printHelp();
  return 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = {
  main,
  parseRootAndFlags,
  printValidateResult,
  runValidate,
};
