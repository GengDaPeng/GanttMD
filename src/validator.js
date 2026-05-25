const fs = require('node:fs');
const path = require('node:path');

const Rules = require('./rules.js');
const { loadProject } = require('./project-loader.js');

const TASK_STATUSES = Rules.TASK_STATUSES;
const TASK_KINDS = Rules.TASK_KINDS;
const FOLLOWUP_STATUSES = Rules.FOLLOWUP_STATUSES;
const FOLLOWUP_KINDS = Rules.FOLLOWUP_KINDS;
const TASK_TRACKS = Rules.TASK_TRACKS;
const TRACK_ALIASES = Rules.TRACK_ALIASES;
const ENGINEERING_TRACKS = Rules.ENGINEERING_TRACKS;
const DEFAULT_REVIEW_STALE_DAYS = Rules.DEFAULT_REVIEW_STALE_DAYS;
const DEFAULT_ARCHIVE_AFTER_DAYS = Rules.DEFAULT_ARCHIVE_AFTER_DAYS;

// 把共享规则模块输出的 issue（{level,id,text,field,sourceFile}）
// 翻译成 CLI 历史输出格式（{level,id,message,sourceFile,field}）。
// 保留 message 字段是为了兼容现有测试和 JSON 消费者。
function toCliIssue(ruleIssue) {
  return {
    level: ruleIssue.level,
    id: ruleIssue.id,
    message: ruleIssue.text,
    sourceFile: ruleIssue.sourceFile,
    field: ruleIssue.field,
  };
}

function validateProject(project, options = {}) {
  const issues = [];
  const taskById = new Map();
  const milestoneIds = new Set(project.config.milestones.map((m) => m.id).filter(Boolean));
  const context = {
    now: options.now || new Date(),
    reviewStaleDays: options.reviewStaleDays != null ? options.reviewStaleDays : DEFAULT_REVIEW_STALE_DAYS,
    archiveAfterDays: options.archiveAfterDays != null ? options.archiveAfterDays : DEFAULT_ARCHIVE_AFTER_DAYS,
    milestoneIds: milestoneIds,
    sourceDocExists: (relPath) => fs.existsSync(path.resolve(project.root, relPath)),
  };

  if (!project.hasGanttRoot) {
    issues.push({ level: 'warn', id: '(project)', message: '未找到 .ganttmd 目录', sourceFile: '', field: 'ganttRoot' });
  }
  if (!project.hasConfig) {
    issues.push({ level: 'warn', id: '(project)', message: '缺少 .ganttmd/config.yaml', sourceFile: '', field: 'config' });
  }
  if (project.taskFileCount === 0) {
    issues.push({ level: 'warn', id: '(project)', message: '未找到 .ganttmd/tasks/*.md；旧项目可继续使用 .ganttmd/modules/*.md', sourceFile: '', field: 'tasks' });
  }
  if (project.taskFileCount > 0 && project.tasks.length === 0) {
    issues.push({ level: 'warn', id: '(project)', message: '任务文件存在，但未解析到 ganttmd-task 代码块', sourceFile: '', field: 'tasks' });
  }

  for (const task of project.tasks) {
    if (!task.id) {
      issues.push({ level: 'warn', id: '(missing id)', message: '任务缺少 id', sourceFile: task.source_file, field: 'id' });
      continue;
    }
    if (taskById.has(task.id)) {
      issues.push({ level: 'warn', id: task.id, message: '任务 ID 重复', sourceFile: task.source_file, field: 'id' });
    }
    taskById.set(task.id, task);
  }

  const childrenByDep = new Map();
  for (const task of project.tasks) {
    for (const dep of task.dependencies) {
      if (!childrenByDep.has(dep)) childrenByDep.set(dep, []);
      childrenByDep.get(dep).push(task.id);
    }
  }

  for (const task of project.tasks) {
    if (!task.id) continue;
    task._openDeps = task.dependencies.filter((d) => taskById.has(d) && taskById.get(d).status !== 'done');
    task._missingDeps = task.dependencies.filter((d) => !taskById.has(d));
    task._downstreamCount = (childrenByDep.get(task.id) || []).length;
  }

  for (const task of project.tasks) {
    if (!task.id) continue;
    const ruleIssues = Rules.checkTask(task, context);
    for (const ri of ruleIssues) issues.push(toCliIssue(ri));
  }

  for (const followup of project.followups) {
    const ruleIssues = Rules.checkFollowup(followup, context);
    for (const ri of ruleIssues) issues.push(toCliIssue(ri));
  }

  return issues;
}

module.exports = {
  TASK_STATUSES,
  TASK_KINDS,
  FOLLOWUP_STATUSES,
  FOLLOWUP_KINDS,
  TASK_TRACKS,
  TRACK_ALIASES,
  ENGINEERING_TRACKS,
  loadProject,
  validateProject,
};
