const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_PROJECT_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 200;
const MAX_REGISTRY_PAYLOAD_BYTES = 256 * 1024;

function defaultRegistryPath() {
  return path.join(os.homedir(), '.ganttmd', 'projects.json');
}

function defaultSampleRoot() {
  return path.resolve(__dirname, '..');
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_REGISTRY_PAYLOAD_BYTES) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (process.env.GANTTMD_DEBUG) {
      console.error(`[DEBUG] Failed to read ${filePath}:`, error.message);
    }
    return fallback;
  }
}

function normalizeProjectPath(projectPath) {
  if (typeof projectPath !== 'string' || !projectPath.trim()) {
    throw new Error('项目路径必须是非空字符串');
  }
  if (projectPath.includes('\0')) {
    throw new Error('项目路径非法');
  }
  return path.resolve(projectPath);
}

function normalizeProjectId(rawId) {
  const id = String(rawId || '').trim().slice(0, MAX_PROJECT_ID_LENGTH);
  if (!id) {
    throw new Error('项目 ID 不能为空');
  }
  if (id.includes('\0') || id.includes('\n') || id.includes('\r') || /[\\/]/.test(id)) {
    throw new Error('项目 ID 格式非法');
  }
  return id;
}

function normalizeProjectName(rawName, fallbackId) {
  return String(rawName || fallbackId || '').trim().slice(0, MAX_NAME_LENGTH) || fallbackId;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(value, null, 2) + '\n';
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tempPath, serialized);
  fs.renameSync(tempPath, filePath);
}

function normalizeProjectEntry(projectPath, options = {}) {
  const root = normalizeProjectPath(projectPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('项目路径不存在或不是目录');
  }

  const id = normalizeProjectId(options.id || path.basename(root));
  return {
    id,
    name: normalizeProjectName(options.name, id),
    root,
    lastOpenedAt: options.lastOpenedAt || new Date().toISOString(),
  };
}

function loadRegistry(filePath = defaultRegistryPath()) {
  const data = readJsonIfExists(filePath, { projects: [] });
  if (!data || !Array.isArray(data.projects)) return { projects: [] };

  const projects = [];
  for (const project of data.projects) {
    if (!project || !project.id || !project.root) continue;
    try {
      projects.push({
        id: normalizeProjectId(project.id),
        name: normalizeProjectName(project.name, project.id),
        root: normalizeProjectPath(project.root),
        lastOpenedAt: project.lastOpenedAt || '',
      });
    } catch {
      // 畸形项目记录应被跳过，防止单条坏记录拖垮整个注册表读取。
    }
  }

  return {
    projects,
  };
}

function saveRegistry(registry, filePath = defaultRegistryPath()) {
  const projects = [...registry.projects].sort((a, b) => a.id.localeCompare(b.id));
  writeJson(filePath, { projects });
  return { projects };
}

function addProject(projectPath, options = {}, filePath = defaultRegistryPath()) {
  const registry = loadRegistry(filePath);
  const entry = normalizeProjectEntry(projectPath, options);
  const existingIndex = registry.projects.findIndex((project) => project.id === entry.id || project.root === entry.root);
  if (existingIndex === -1) {
    registry.projects.push(entry);
  } else {
    registry.projects[existingIndex] = {
      ...registry.projects[existingIndex],
      ...entry,
    };
  }
  return saveRegistry(registry, filePath);
}

function ensureSampleProject(filePath = defaultRegistryPath(), sampleRoot = defaultSampleRoot()) {
  const registry = loadRegistry(filePath);
  if (registry.projects.length > 0) return registry;
  if (!fs.existsSync(path.join(sampleRoot, '.ganttmd', 'config.yaml'))) return registry;
  registry.projects.push(normalizeProjectEntry(sampleRoot, {
    id: 'acme-notes',
    name: 'Acme Notes 样例',
  }));
  return saveRegistry(registry, filePath);
}

function removeProject(idOrPath, filePath = defaultRegistryPath()) {
  const registry = loadRegistry(filePath);
  const absolute = path.resolve(idOrPath);
  const projects = registry.projects.filter((project) => project.id !== idOrPath && project.root !== absolute);
  return saveRegistry({ projects }, filePath);
}

module.exports = {
  defaultRegistryPath,
  defaultSampleRoot,
  ensureSampleProject,
  loadRegistry,
  saveRegistry,
  addProject,
  removeProject,
  normalizeProjectEntry,
};
