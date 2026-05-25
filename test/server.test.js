const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const Registry = require('../src/project-registry.js');
const { startServer } = require('../src/server.js');

function writeProject(root) {
  fs.mkdirSync(path.join(root, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ganttmd', 'config.yaml'), `project:
  id: api-demo
  name: API Demo
`);
  fs.writeFileSync(path.join(root, '.ganttmd', 'tasks', 'main.md'), `# Tasks

\`\`\`ganttmd-task
id: API-1
title: API 任务
status: todo
dependencies: []
track: backend
source_docs: [docs/spec.md]
next_action: 验证 API
acceptance: [完成]
\`\`\`
`);
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'spec.md'), '# spec');
}

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.text();
}

test('本地服务提供项目列表和项目运行时状态 API', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-server-'));
  const registryPath = path.join(tmp, 'projects.json');
  const projectRoot = path.join(tmp, 'project');
  writeProject(projectRoot);
  Registry.addProject(projectRoot, { id: 'api-demo', name: 'API Demo' }, registryPath);

  const { server, url } = await startServer({
    port: 0,
    registryPath,
    worktrees: [{
      root: projectRoot,
      branch: 'main',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });
  t.after(() => server.close());

  const html = await getText(`${url}/`);
  assert.match(html, /GanttMD Local/);
  assert.doesNotMatch(html, /GanttMD V6/);

  const projects = await getJson(`${url}/api/projects`);
  assert.equal(projects.projects.length, 1);
  assert.equal(projects.projects[0].id, 'api-demo');

  const state = await getJson(`${url}/api/state?project=api-demo`);
  assert.equal(state.source.projectId, 'api-demo');
  assert.equal(state.main.taskCount, 1);
  assert.equal(state.tasks[0].id, 'API-1');
  assert.equal(state.config.project.id, 'api-demo');
  assert.ok(state.version > 0);

  const unchanged = await getJson(`${url}/api/events?project=api-demo&since=${state.version}&timeout=5`);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.version, state.version);

  await new Promise((resolve) => setTimeout(resolve, 5));
  fs.appendFileSync(path.join(projectRoot, '.ganttmd', 'tasks', 'main.md'), '\n<!-- changed -->\n');
  const changed = await getJson(`${url}/api/events?project=api-demo&since=${state.version}`);
  assert.equal(changed.changed, true);
  assert.ok(changed.version > state.version);
});
