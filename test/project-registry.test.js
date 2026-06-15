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

test('loadRegistry 会忽略损坏的项目记录', () => {
  const registryPath = tempRegistryPath();
  const invalid = {
    projects: [
      { id: 'ok', root: fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-project-')) },
      { id: 'bad/id', root: '/tmp' },
      { root: '/tmp' },
    ],
  };
  fs.writeFileSync(registryPath, JSON.stringify(invalid));

  const registry = Registry.loadRegistry(registryPath);
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].id, 'ok');
});

test('addProject 会拒绝不存在的目录路径', () => {
  const registryPath = tempRegistryPath();
  assert.throws(() => {
    Registry.addProject('/tmp/ganttmd-should-not-exist', { id: 'bad' }, registryPath);
  }, /项目路径不存在/);
});

test('内置样例只在空登记表中写入，不覆盖已有用户项目', () => {
  const registryPath = tempRegistryPath();
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-project-'));
  const sampleRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-sample-'));
  fs.mkdirSync(path.join(sampleRoot, '.ganttmd'), { recursive: true });
  fs.writeFileSync(path.join(sampleRoot, '.ganttmd', 'config.yaml'), 'project:\n  id: sample\n');

  Registry.addProject(projectRoot, {
    id: 'user-project',
    name: '用户项目',
    lastOpenedAt: '2026-05-24T00:00:00.000Z',
  }, registryPath);

  const registry = Registry.ensureSampleProject(registryPath, sampleRoot);
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].id, 'user-project');
  assert.equal(registry.projects[0].root, projectRoot);
});

test('loadRegistry 对超大 registry 文件采用降级策略', () => {
  const registryPath = tempRegistryPath();
  fs.writeFileSync(registryPath, JSON.stringify({
    projects: new Array(100000).fill({ id: 'x'.repeat(200), root: '/tmp' }),
  }));

  const registry = Registry.loadRegistry(registryPath);
  assert.equal(registry.projects.length, 0);
});
