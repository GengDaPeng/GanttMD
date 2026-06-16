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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
  });
  return { response, body: await response.json() };
}

async function postRaw(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });
  return { response, body: await response.json() };
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

  const unchanged = await getJson(`${url}/api/events?project=api-demo&since=${state.version}&timeout=500`);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.version, state.version);

  await new Promise((resolve) => setTimeout(resolve, 5));
  fs.appendFileSync(path.join(projectRoot, '.ganttmd', 'tasks', 'main.md'), '\n<!-- changed -->\n');
  const changed = await getJson(`${url}/api/events?project=api-demo&since=${state.version}`);
  assert.equal(changed.changed, true);
  assert.ok(changed.version > state.version);
});

test('服务 API 对 /api/projects 进行安全输入校验', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-server-guard-'));
  const registryPath = path.join(tmp, 'projects.json');

  const { server, url } = await startServer({
    port: 0,
    registryPath,
    worktrees: [],
  });
  t.after(() => server.close());

  const badJson = await postJson(`${url}/api/projects`, '{root:"oops"');
  assert.equal(badJson.response.status, 400);
  assert.equal(badJson.body.error, '请求体不是合法 JSON');

  const missingRoot = await postJson(`${url}/api/projects`, JSON.stringify({}));
  assert.equal(missingRoot.response.status, 400);
  assert.equal(missingRoot.body.error, '缺少 root');

  const invalidPath = await postJson(`${url}/api/projects`, JSON.stringify({ root: path.join(tmp, 'nope') }));
  assert.equal(invalidPath.response.status, 400);
  assert.match(invalidPath.body.error, /项目路径不存在或不是目录/);

  const invalidEventParam = await fetch(`${url}/api/events?project=acme-notes&timeout=abc`);
  assert.equal(invalidEventParam.status, 400);

  const invalidSinceParam = await fetch(`${url}/api/events?project=acme-notes&since=1.5`);
  assert.equal(invalidSinceParam.status, 400);

  const exponentParam = await fetch(`${url}/api/events?project=acme-notes&timeout=1e3`);
  assert.equal(exponentParam.status, 400);

  const tooLarge = JSON.stringify({
    root: path.join(tmp, 'tmp'),
    data: 'x'.repeat(40000),
  });
  const largePayload = await postRaw(`${url}/api/projects`, tooLarge, {
    'content-type': 'application/json',
    'content-length': String(tooLarge.length),
  });
  assert.equal(largePayload.response.status, 413);
  assert.equal(largePayload.body.error, '请求体过大');
});

test('本地服务在空登记表中自动提供内置样例项目', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-server-sample-'));
  const registryPath = path.join(tmp, 'projects.json');
  const sampleRoot = path.join(tmp, 'sample');
  writeProject(sampleRoot);

  const { server, url } = await startServer({
    port: 0,
    registryPath,
    sampleRoot,
    worktrees: [{
      root: sampleRoot,
      branch: 'main',
      head: 'abc123',
      isDirty: false,
      hasGanttmd: true,
    }],
  });
  t.after(() => server.close());

  const projects = await getJson(`${url}/api/projects`);
  assert.equal(projects.projects.length, 1);
  assert.equal(projects.projects[0].id, 'acme-notes');
  assert.equal(projects.projects[0].root, sampleRoot);

  const state = await getJson(`${url}/api/state`);
  assert.equal(state.source.projectId, 'api-demo');
  assert.equal(state.main.taskCount, 1);
});

test('startServer 仅允许监听本机回环地址', () => {
  assert.throws(() => {
    startServer({ port: 0, host: '0.0.0.0', registryPath: path.join(os.tmpdir(), 'not-used') });
  }, /仅允许在本机回环地址上监听服务/);
});
