const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const Registry = require('../src/project-registry.js');

function tempRegistryPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-registry-')), 'projects.json');
}

test('project registry 支持 add/list/remove 且不依赖项目 Git', () => {
  const registryPath = tempRegistryPath();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-project-'));

  Registry.addProject(projectRoot, {
    id: 'demo',
    name: '示例',
    lastOpenedAt: '2026-05-24T00:00:00.000Z',
  }, registryPath);

  let registry = Registry.loadRegistry(registryPath);
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].id, 'demo');
  assert.equal(registry.projects[0].root, projectRoot);

  Registry.removeProject('demo', registryPath);
  registry = Registry.loadRegistry(registryPath);
  assert.equal(registry.projects.length, 0);
});
