const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function defaultRegistryPath() {
  return path.join(os.homedir(), '.ganttmd', 'projects.json');
}

function defaultSampleRoot() {
  return path.resolve(__dirname, '..');
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function normalizeProjectEntry(projectPath, options = {}) {
  const root = path.resolve(projectPath);
  const id = options.id || path.basename(root);
  return {
    id,
    name: options.name || id,
    root,
    lastOpenedAt: options.lastOpenedAt || new Date().toISOString(),
  };
}

function loadRegistry(filePath = defaultRegistryPath()) {
  const data = readJsonIfExists(filePath, { projects: [] });
  if (!Array.isArray(data.projects)) return { projects: [] };
  return {
    projects: data.projects
      .filter((project) => project && project.id && project.root)
      .map((project) => ({
        id: String(project.id),
        name: String(project.name || project.id),
        root: path.resolve(String(project.root)),
        lastOpenedAt: project.lastOpenedAt || '',
      })),
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
