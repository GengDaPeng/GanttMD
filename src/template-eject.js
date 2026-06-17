const fs = require('node:fs');
const path = require('node:path');

const { resolveGanttRoot } = require('./project-loader.js');
const { ensureManagedPath, backupDirName } = require('./fs-safety.js');
const { BUILTIN_AGENT_COMMAND_TEMPLATES, ejectRelativePath } = require('./agent-command-templates.js');

// 解析 config.yaml 顶层 agent_command_templates 段，返回已映射的 key 集合。
function parseMappedKeys(configText) {
  const keys = new Set();
  const lines = configText.split(/\r?\n/);
  let inSection = false;
  for (const line of lines) {
    if (/^agent_command_templates:\s*$/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      // 段内为缩进的 `  key: path`；遇到非缩进非空行即段结束。
      const m = line.match(/^\s+([a-zA-Z_]+):\s*\S/);
      if (m) {
        keys.add(m[1]);
        continue;
      }
      if (line.trim() === '') continue;
      break;
    }
  }
  return keys;
}

// 把缺失 key 的映射追加进现有 agent_command_templates 段（保留已有项），
// 段不存在时新建。返回新的 config 文本；无需改动时返回 null。
function mergeMappingIntoConfig(configText, missingKeys) {
  if (missingKeys.length === 0) return null;
  const additions = missingKeys.map((key) => `  ${key}: ${ejectRelativePath(key)}`);

  if (!/^agent_command_templates:\s*$/m.test(configText)) {
    // 段不存在，整段追加到文件末尾。
    const sep = configText.endsWith('\n') ? '\n' : '\n\n';
    return configText + sep + ['agent_command_templates:', ...additions].join('\n') + '\n';
  }

  // 段存在：在该段最后一个缩进行后插入缺失项。
  const lines = configText.split(/\r?\n/);
  let sectionStart = -1;
  let insertAt = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (sectionStart === -1) {
      if (/^agent_command_templates:\s*$/.test(lines[i])) {
        sectionStart = i;
        insertAt = i + 1;
      }
      continue;
    }
    if (/^\s+\S/.test(lines[i])) {
      insertAt = i + 1; // 跟进到该段最后一个缩进行
      continue;
    }
    if (lines[i].trim() === '') continue;
    break; // 段结束
  }
  lines.splice(insertAt, 0, ...additions);
  return lines.join('\n');
}

// 计划：把内置 Agent 指令模板导出到 .ganttmd/templates/agent/<key>.md，
// 并在 config.yaml 写入 agent_command_templates 映射（若尚未存在）。
function planTemplateEject(projectRoot = process.cwd(), options = {}) {
  const ganttRoot = resolveGanttRoot(projectRoot);
  const force = Boolean(options.force);

  const files = Object.entries(BUILTIN_AGENT_COMMAND_TEMPLATES).map(([key, text]) => {
    const rel = ejectRelativePath(key);
    const abs = path.join(ganttRoot, rel);
    const exists = fs.existsSync(abs);
    return { key, rel, abs, text, exists, willWrite: force || !exists };
  });

  const configPath = path.join(ganttRoot, 'config.yaml');
  const configExists = fs.existsSync(configPath);
  const configText = configExists ? fs.readFileSync(configPath, 'utf8') : '';
  // 顶层是否已有 agent_command_templates: 段
  const hasMapping = /^agent_command_templates:\s*$/m.test(configText);

  return { ganttRoot, configPath, configExists, hasMapping, files, force };
}

// 执行导出。默认不覆盖已存在的模板文件（安全）；--force 时覆盖并备份。
function applyTemplateEject(projectRoot = process.cwd(), options = {}) {
  const plan = planTemplateEject(projectRoot, options);
  const backupRoot = path.join(plan.ganttRoot, '.backup', backupDirName());
  let backedUp = false;
  const written = [];
  const skipped = [];

  for (const file of plan.files) {
    if (!file.willWrite) {
      skipped.push(file.rel);
      continue;
    }
    // 写盘前用安全护栏拦截 symlink / 越界路径，避免 --force 写穿到 .ganttmd 外部。
    ensureManagedPath(plan.ganttRoot, file.abs, '指令模板写入目标');
    if (file.exists) {
      const backupPath = path.join(backupRoot, file.rel);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(file.abs, backupPath);
      backedUp = true;
    }
    fs.mkdirSync(path.dirname(file.abs), { recursive: true });
    fs.writeFileSync(file.abs, file.text.endsWith('\n') ? file.text : file.text + '\n');
    written.push(file.rel);
  }

  let configUpdated = false;
  // 补齐缺失 key 的映射：保留用户已有项，只追加尚未映射的状态，
  // 确保 eject 出的每个模板文件都被 config 引用、用户编辑后都能生效。
  if (plan.configExists) {
    ensureManagedPath(plan.ganttRoot, plan.configPath, '指令模板写入目标');
    const current = fs.readFileSync(plan.configPath, 'utf8');
    const mappedKeys = parseMappedKeys(current);
    const missingKeys = Object.keys(BUILTIN_AGENT_COMMAND_TEMPLATES).filter((key) => !mappedKeys.has(key));
    const nextConfig = mergeMappingIntoConfig(current, missingKeys);
    if (nextConfig !== null) {
      const backupPath = path.join(backupRoot, 'config.yaml');
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(plan.configPath, backupPath);
      backedUp = true;
      fs.writeFileSync(plan.configPath, nextConfig);
      configUpdated = true;
    }
  }

  return {
    ganttRoot: plan.ganttRoot,
    written,
    skipped,
    configUpdated,
    configExists: plan.configExists,
    hasMapping: plan.hasMapping,
    backupRoot: backedUp ? backupRoot : '',
  };
}

module.exports = {
  parseMappedKeys,
  mergeMappingIntoConfig,
  planTemplateEject,
  applyTemplateEject,
};
