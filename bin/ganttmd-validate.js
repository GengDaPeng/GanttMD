#!/usr/bin/env node

const { loadProject, validateProject } = require('./validator');

function parseArgs(argv) {
  const args = argv.slice(2);
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

function main() {
  const options = parseArgs(process.argv);
  const project = loadProject(options.root);
  const issues = validateProject(project);
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
  } else {
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
  }

  process.exitCode = warnings.length > 0 ? 1 : 0;
}

main();

