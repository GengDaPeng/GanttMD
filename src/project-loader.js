const fs = require('node:fs');
const path = require('node:path');

const { BUILTIN_AGENT_COMMAND_TEMPLATES } = require('./agent-command-templates.js');

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

function countIndent(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function collectBlockScalar(lines, startIndex, parentIndent) {
  const body = [];
  let index = startIndex + 1;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      body.push('');
      index += 1;
      continue;
    }
    const indent = countIndent(line);
    if (indent <= parentIndent) break;
    body.push(line.slice(Math.min(indent, parentIndent + 2)));
    index += 1;
  }
  return { text: body.join('\n').replace(/\s+$/, ''), nextIndex: index - 1 };
}

function parseAgentCommandConfig(text) {
  const agentCommand = { templates: {} };
  const lines = text.split(/\r?\n/);
  let inSection = false;
  let inTemplates = false;
  let currentTemplate = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!inSection) {
      if (/^agent_command:\s*$/.test(trimmed) && countIndent(line) === 0) {
        inSection = true;
      }
      continue;
    }

    const indent = countIndent(line);
    if (indent === 0) break;

    if (indent === 2 && /^templates:\s*$/.test(trimmed)) {
      inTemplates = true;
      currentTemplate = '';
      continue;
    }

    if (indent === 2 && !inTemplates) {
      const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2];
      if (value === '|') {
        const block = collectBlockScalar(lines, i, indent);
        agentCommand[key] = block.text;
        i = block.nextIndex;
      } else {
        agentCommand[key] = parseScalar(value);
      }
      continue;
    }

    if (!inTemplates) continue;

    if (indent === 4) {
      const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2];
      currentTemplate = key;
      if (value === '|') {
        const block = collectBlockScalar(lines, i, indent);
        agentCommand.templates[key] = { body: block.text };
        i = block.nextIndex;
      } else if (value) {
        agentCommand.templates[key] = { body: parseScalar(value) };
      } else {
        agentCommand.templates[key] = {};
      }
      continue;
    }

    if (indent === 6 && currentTemplate) {
      const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (!match) continue;
      const field = match[1];
      const value = match[2];
      if (!agentCommand.templates[currentTemplate] || typeof agentCommand.templates[currentTemplate] === 'string') {
        agentCommand.templates[currentTemplate] = {};
      }
      if (value === '|') {
        const block = collectBlockScalar(lines, i, indent);
        agentCommand.templates[currentTemplate][field] = block.text;
        i = block.nextIndex;
      } else {
        agentCommand.templates[currentTemplate][field] = parseScalar(value);
      }
    }
  }

  return agentCommand;
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
  task.verification_commands = toArray(task.verification_commands);
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
  const config = { ganttmd: {}, project: {}, views: {}, milestones: [], agent_command: parseAgentCommandConfig(text) };
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

    if (section === 'ganttmd' || section === 'project' || section === 'views') {
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

function loadAgentCommandTemplate(ganttRoot, config) {
  config.ganttmd.agent_command_templates = {};
  if (config.agent_command.execution_setup) {
    config.ganttmd.agent_command_execution_setup = config.agent_command.execution_setup;
  }
  if (config.agent_command.delivery_requirements) {
    config.ganttmd.agent_command_delivery_requirements = config.agent_command.delivery_requirements;
  }

  // 第 1 层：内置默认模板（单一真相源 src/agent-command-templates.js）。
  // 保证 serve 模式下页面经 /api/state 永远能拿到一套可用模板，且可被项目逐层覆盖；
  // 页面不再依赖自身硬编码 fallback。
  for (const [key, text] of Object.entries(BUILTIN_AGENT_COMMAND_TEMPLATES)) {
    config.ganttmd.agent_command_templates[key] = { text, builtin: true };
  }

  // 第 2 层：项目统一配置块 agent_command.templates。
  // 本地项目只维护 .ganttmd/config.yaml，一个入口决定复制指令形态。
  for (const [key, templateConfig] of Object.entries(config.agent_command.templates || {})) {
    if (typeof templateConfig === 'string') {
      config.ganttmd.agent_command_templates[key] = { text: templateConfig, inline: true };
      continue;
    }
    if (templateConfig && templateConfig.body) {
      config.ganttmd.agent_command_templates[key] = { text: templateConfig.body, inline: true };
    }
  }
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

  const config = parseConfig(readTextIfExists(path.join(ganttRoot, 'config.yaml')));
  loadAgentCommandTemplate(ganttRoot, config);

  return {
    root,
    ganttRoot,
    hasGanttRoot: fs.existsSync(ganttRoot),
    hasConfig: fs.existsSync(path.join(ganttRoot, 'config.yaml')),
    taskFileCount: taskFiles.length,
    config,
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
  parseAgentCommandConfig,
  loadAgentCommandTemplate,
  loadProject,
};
