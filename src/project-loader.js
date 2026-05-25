const fs = require('node:fs');
const path = require('node:path');

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

function parseRun(raw, sourceFile) {
  const run = parseKeyValueBlock(raw);
  run.source_file = sourceFile;
  run.tasks = toArray(run.tasks);
  return run;
}

function parseChecklistItem(line) {
  const match = line.trim().match(/^-\s+([A-Za-z0-9_.-]+)\s+\[([a-z_]+)\]\s+([^|]*?)(?:\s*\|\s*(.*))?$/);
  if (!match) {
    return { raw: line.trim(), parse_error: true };
  }

  const item = {
    id: match[1],
    status: match[2],
    title: match[3].trim(),
    evidence: [],
  };

  const meta = match[4] || '';
  for (const part of meta.split('|')) {
    const separator = part.indexOf(':');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) continue;
    item[key] = key === 'evidence' ? toArray(parseScalar(value)) : value;
  }

  return item;
}

function parseChecklist(raw, sourceFile) {
  const checklist = { task_id: '', items: [], source_file: sourceFile };
  let inItems = false;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed === 'items:') {
      inItems = true;
      continue;
    }
    if (inItems && trimmed.startsWith('- ')) {
      checklist.items.push(parseChecklistItem(trimmed));
      continue;
    }
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1);
    checklist[key] = parseScalar(value);
  }

  return checklist;
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
  const root = path.dirname(ganttRoot);
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

  const runsPath = path.join(ganttRoot, 'runs.md');
  const runsText = readTextIfExists(runsPath);
  const runs = extractBlocks(runsText, 'ganttmd-run')
    .map((block) => parseRun(block, 'runs.md'));

  const checklists = [];
  for (const filePath of taskFiles) {
    const relativeFile = path.relative(ganttRoot, filePath);
    const text = readTextIfExists(filePath);
    for (const block of extractBlocks(text, 'ganttmd-checklist')) {
      checklists.push(parseChecklist(block, relativeFile));
    }
  }

  return {
    root,
    ganttRoot,
    hasGanttRoot: fs.existsSync(ganttRoot),
    hasConfig: fs.existsSync(path.join(ganttRoot, 'config.yaml')),
    taskFileCount: taskFiles.length,
    config: parseConfig(readTextIfExists(path.join(ganttRoot, 'config.yaml'))),
    tasks,
    followups,
    runs,
    checklists,
  };
}

module.exports = {
  resolveGanttRoot,
  readTextIfExists,
  listMarkdownFiles,
  extractBlocks,
  parseScalar,
  parseKeyValueBlock,
  toArray,
  parseTask,
  parseFollowup,
  parseRun,
  parseChecklistItem,
  parseChecklist,
  parseConfig,
  loadProject,
};
