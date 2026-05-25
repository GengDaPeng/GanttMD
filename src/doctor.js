const { loadProject, validateProject } = require('./validator.js');

const CURRENT_SCHEMA_VERSION = 1;

function readSchemaVersion(project) {
  const value = project.config.ganttmd && project.config.ganttmd.schema_version;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function doctorProject(projectRoot = process.cwd()) {
  const project = loadProject(projectRoot);
  const schemaVersion = readSchemaVersion(project);
  const issues = validateProject(project);
  const warnings = issues.filter((issue) => issue.level === 'warn');
  const doctorIssues = [];

  if (schemaVersion === 0) {
    doctorIssues.push({ level: 'warn', message: '缺少 ganttmd.schema_version，建议运行 ganttmd migrate' });
  } else if (schemaVersion < CURRENT_SCHEMA_VERSION) {
    doctorIssues.push({ level: 'warn', message: `项目 schema ${schemaVersion} 落后于工具 schema ${CURRENT_SCHEMA_VERSION}，建议运行 ganttmd migrate` });
  } else if (schemaVersion > CURRENT_SCHEMA_VERSION) {
    doctorIssues.push({ level: 'warn', message: `项目 schema ${schemaVersion} 高于当前工具支持的 ${CURRENT_SCHEMA_VERSION}` });
  }

  return {
    root: project.root,
    ganttRoot: project.ganttRoot,
    toolSchemaVersion: CURRENT_SCHEMA_VERSION,
    projectSchemaVersion: schemaVersion,
    taskCount: project.tasks.length,
    followupCount: project.followups.length,
    runCount: project.runs.length,
    checklistCount: project.checklists.length,
    warningCount: warnings.length + doctorIssues.filter((issue) => issue.level === 'warn').length,
    issues,
    doctorIssues,
  };
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  doctorProject,
  readSchemaVersion,
};
