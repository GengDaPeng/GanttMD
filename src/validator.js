const fs = require('node:fs');
const path = require('node:path');

const Rules = require('../tools/ganttmd/rules.js');

const TASK_STATUSES = Rules.TASK_STATUSES;
const TASK_KINDS = Rules.TASK_KINDS;
const FOLLOWUP_STATUSES = Rules.FOLLOWUP_STATUSES;
const FOLLOWUP_KINDS = Rules.FOLLOWUP_KINDS;
const TASK_TRACKS = Rules.TASK_TRACKS;
const TRACK_ALIASES = Rules.TRACK_ALIASES;
const ENGINEERING_TRACKS = Rules.ENGINEERING_TRACKS;
const DEFAULT_REVIEW_STALE_DAYS = Rules.DEFAULT_REVIEW_STALE_DAYS;
const DEFAULT_ARCHIVE_AFTER_DAYS = Rules.DEFAULT_ARCHIVE_AFTER_DAYS;

function resolveGanttRoot(projectRoot) {
  const absoluteRoot = path.resolve(projectRoot || process.cwd());
  if (path.basename(absoluteRoot) === '.ganttmd') {
    return absoluteRoot;
  }
  return path.join(absoluteRoot, '.ganttmd');
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function listMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort()
    .map((fileName) => path.join(directory, fileName));
}

function extractBlocks(text, blockName) {
  const blocks = [];
  const pattern = new RegExp('```' + blockName + '\\s*\\n([\\s\\S]*?)\\n```', 'g');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return '';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const body = trimmed.slice(1, -1).trim();
    if (!body) return [];
    return body.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return trimmed;
}

function parseKeyValueBlock(raw) {
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1);
    data[key] = parseScalar(value);
  }
  return data;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function parseTask(raw, sourceFile) {
  const task = parseKeyValueBlock(raw);
  task.source_file = sourceFile;
  task.dependencies = toArray(task.dependencies);
  task.source_docs = toArray(task.source_docs);
  task.acceptance = toArray(task.acceptance);
  task.evidence = toArray(task.evidence);
  task.downstream_constraints = toArray(task.downstream_constraints);
  return task;
}

function parseFollowup(raw, sourceFile) {
  const followup = parseKeyValueBlock(raw);
  followup.source_file = sourceFile;
  return followup;
}

function parseConfig(text) {
  const config = { project: {}, views: {}, milestones: [] };
  let section = '';
  let currentMilestone = null;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^[a-zA-Z_]+:\s*$/.test(trimmed)) {
      section = trimmed.slice(0, -1);
      currentMilestone = null;
      continue;
    }

    if (section === 'project' || section === 'views') {
      const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (match) {
        config[section][match[1]] = parseScalar(match[2]);
      }
      continue;
    }

    if (section === 'milestones') {
      const itemMatch = trimmed.match(/^-\s+([a-zA-Z_]+):\s*(.*)$/);
      if (itemMatch) {
        currentMilestone = { [itemMatch[1]]: parseScalar(itemMatch[2]) };
        config.milestones.push(currentMilestone);
        continue;
      }
      const fieldMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (fieldMatch && currentMilestone) {
        currentMilestone[fieldMatch[1]] = parseScalar(fieldMatch[2]);
      }
    }
  }

  return config;
}

function loadProject(projectRoot = process.cwd()) {
  const ganttRoot = resolveGanttRoot(projectRoot);
  const tasksRoot = path.join(ganttRoot, 'tasks');
  const modulesRoot = path.join(ganttRoot, 'modules');
  const taskFiles = [
    ...listMarkdownFiles(tasksRoot),
    ...listMarkdownFiles(modulesRoot),
  ];

  const tasks = [];
  for (const filePath of taskFiles) {
    const relativeFile = path.relative(ganttRoot, filePath);
    const text = readTextIfExists(filePath);
    for (const block of extractBlocks(text, 'ganttmd-task')) {
      tasks.push(parseTask(block, relativeFile));
    }
  }

  const followupsPath = path.join(ganttRoot, 'followups.md');
  const followupsText = readTextIfExists(followupsPath);
  const followups = extractBlocks(followupsText, 'ganttmd-followup')
    .map((block) => parseFollowup(block, 'followups.md'));

  return {
    root: path.resolve(projectRoot || process.cwd()),
    ganttRoot,
    config: parseConfig(readTextIfExists(path.join(ganttRoot, 'config.yaml'))),
    tasks,
    followups,
  };
}

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

  // 第一遍：建索引、抓 ID 重复
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

  // 第二遍：计算每个任务的派生字段（共享规则需要）
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

  // 第三遍：跑共享规则
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
  extractBlocks,
  loadProject,
  parseConfig,
  parseFollowup,
  parseTask,
  validateProject,
};
