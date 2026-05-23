const fs = require('node:fs');
const path = require('node:path');

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'cancelled', 'blocked'];
const FOLLOWUP_STATUSES = ['open', 'accepted', 'converted', 'done', 'wontfix'];
const FOLLOWUP_KINDS = ['followup', 'decision', 'deferred', 'external_wait', 'risk'];
const ENGINEERING_TRACKS = ['backend', 'frontend', 'infra'];

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
  const modulesRoot = path.join(ganttRoot, 'modules');
  const moduleFiles = listMarkdownFiles(modulesRoot);

  const tasks = [];
  for (const filePath of moduleFiles) {
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

function issue(level, id, message, sourceFile, field) {
  return { level, id, message, sourceFile, field };
}

function validateProject(project) {
  const issues = [];
  const taskById = new Map();
  const milestoneIds = new Set(project.config.milestones.map((milestone) => milestone.id).filter(Boolean));

  for (const task of project.tasks) {
    if (!task.id) {
      issues.push(issue('warn', '(missing id)', '任务缺少 id', task.source_file, 'id'));
      continue;
    }
    if (taskById.has(task.id)) {
      issues.push(issue('warn', task.id, '任务 ID 重复', task.source_file, 'id'));
    }
    taskById.set(task.id, task);
  }

  for (const task of project.tasks) {
    validateTask(task, taskById, milestoneIds, project.root, issues);
  }

  for (const followup of project.followups) {
    validateFollowup(followup, issues);
  }

  return issues;
}

function validateTask(task, taskById, milestoneIds, projectRoot, issues) {
  const id = task.id || '(missing id)';

  if (!task.title) issues.push(issue('warn', id, '任务缺少 title', task.source_file, 'title'));
  if (!task.status) issues.push(issue('warn', id, '任务缺少 status', task.source_file, 'status'));
  if (task.status && !TASK_STATUSES.includes(task.status)) {
    issues.push(issue('warn', id, `任务 status 非法：${task.status}`, task.source_file, 'status'));
  }

  if (!task.track) {
    issues.push(issue('warn', id, '任务缺少 track，无法挂载到主线视图', task.source_file, 'track'));
  }

  if (!task.milestone) {
    issues.push(issue('warn', id, '任务缺少 milestone，无法挂载到里程碑视图', task.source_file, 'milestone'));
  } else if (milestoneIds.size > 0 && !milestoneIds.has(task.milestone)) {
    issues.push(issue('warn', id, `任务引用未知里程碑：${task.milestone}`, task.source_file, 'milestone'));
  }

  for (const dependency of task.dependencies) {
    if (!taskById.has(dependency)) {
      issues.push(issue('warn', id, `依赖指向不存在任务：${dependency}`, task.source_file, 'dependencies'));
    }
  }

  if (task.status === 'blocked' && !task.blocked_reason) {
    issues.push(issue('warn', id, '显式 blocked 任务必须填写 blocked_reason', task.source_file, 'blocked_reason'));
  }

  if (task.status === 'done' && task.evidence.length === 0) {
    issues.push(issue('warn', id, 'done 任务缺少 evidence，不能只靠口头确认闭环', task.source_file, 'evidence'));
  }

  if (task.status === 'done' && ENGINEERING_TRACKS.includes(task.track) && !task.verification) {
    issues.push(issue('warn', id, '工程类 done 任务缺少 verification', task.source_file, 'verification'));
  }

  if (task.status === 'review' && !task.review_status) {
    issues.push(issue('warn', id, 'review 任务缺少 review_status', task.source_file, 'review_status'));
  }

  if (task.status === 'cancelled' && !task.cancel_reason && !task.resolution) {
    issues.push(issue('warn', id, 'cancelled 任务缺少 cancel_reason 或 resolution', task.source_file, 'cancel_reason'));
  }

  for (const sourceDoc of task.source_docs) {
    const sourcePath = sourceDoc.split('§')[0].trim();
    if (!sourcePath || sourcePath.startsWith('PR#') || sourcePath.startsWith('commit:')) continue;
    if (!fs.existsSync(path.resolve(projectRoot, sourcePath))) {
      issues.push(issue('warn', id, `来源文档不存在：${sourcePath}`, task.source_file, 'source_docs'));
    }
  }

  if (!task.next_action && !['done', 'cancelled'].includes(task.status)) {
    issues.push(issue('info', id, '未填写 next_action，Agent 接手时上下文会偏弱', task.source_file, 'next_action'));
  }

  if (toArray(task.acceptance).length === 0 && !['done', 'cancelled'].includes(task.status)) {
    issues.push(issue('info', id, '未填写 acceptance，任务完成边界不清晰', task.source_file, 'acceptance'));
  }
}

function validateFollowup(followup, issues) {
  const id = followup.id || '(missing followup id)';
  const requiredFields = ['id', 'title', 'kind', 'status', 'source_type', 'created_by', 'created_at', 'reason', 'suggestion', 'severity'];

  for (const field of requiredFields) {
    if (!followup[field]) {
      issues.push(issue('warn', id, `follow-up 缺少 ${field}`, followup.source_file, field));
    }
  }

  if (followup.status && !FOLLOWUP_STATUSES.includes(followup.status)) {
    issues.push(issue('warn', id, `follow-up status 非法：${followup.status}`, followup.source_file, 'status'));
  }

  if (followup.kind && !FOLLOWUP_KINDS.includes(followup.kind)) {
    issues.push(issue('warn', id, `follow-up kind 非法：${followup.kind}`, followup.source_file, 'kind'));
  }

  if (followup.source_type === 'pr_review' && (!followup.source_pr || !followup.source_rr)) {
    issues.push(issue('warn', id, 'PR 审查来源 follow-up 必须填写 source_pr 和 source_rr', followup.source_file, 'source_pr'));
  }

  if (followup.kind === 'decision' && !followup.decision_owner) {
    issues.push(issue('warn', id, '用户裁决类 follow-up 缺少 decision_owner', followup.source_file, 'decision_owner'));
  }

  const needsReviewDate = followup.status === 'accepted'
    || (['open', 'accepted'].includes(followup.status) && (followup.kind === 'deferred' || followup.kind === 'external_wait'));
  if (needsReviewDate && !followup.next_review_at) {
    issues.push(issue('warn', id, '延期或外部等待 follow-up 必须填写 next_review_at', followup.source_file, 'next_review_at'));
  }

  if (followup.status === 'accepted') {
    for (const field of ['accepted_by', 'accepted_at', 'decision']) {
      if (!followup[field]) {
        issues.push(issue('warn', id, `accepted follow-up 缺少 ${field}`, followup.source_file, field));
      }
    }
  }

  if (followup.status === 'converted' && (!followup.converted_task || !followup.resolution)) {
    issues.push(issue('warn', id, 'converted follow-up 必须填写 converted_task 和 resolution', followup.source_file, 'converted_task'));
  }

  if ((followup.status === 'done' || followup.status === 'wontfix') && !followup.resolution) {
    issues.push(issue('warn', id, '已关闭 follow-up 必须填写 resolution', followup.source_file, 'resolution'));
  }
}

module.exports = {
  TASK_STATUSES,
  FOLLOWUP_STATUSES,
  FOLLOWUP_KINDS,
  extractBlocks,
  loadProject,
  parseConfig,
  parseFollowup,
  parseTask,
  validateProject,
};
