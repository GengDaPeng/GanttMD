const http = require('node:http');
const { URL } = require('node:url');

const Registry = require('./project-registry.js');
const { buildRuntimeState } = require('./runtime-state.js');
const { scanGitWorktrees } = require('./worktree-scanner.js');

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function findProject(registry, id) {
  return registry.projects.find((project) => project.id === id || project.root === id);
}

function safeScanWorktrees(projectRoot) {
  try {
    return scanGitWorktrees(projectRoot);
  } catch (error) {
    return [{
      root: projectRoot,
      branch: '',
      head: '',
      detached: false,
      bare: false,
      isDirty: false,
      hasGanttmd: true,
      scanError: error.message,
    }];
  }
}

function buildStateForProject(project, options = {}) {
  const worktrees = options.worktrees || safeScanWorktrees(project.root);
  return buildRuntimeState(project.root, { worktrees });
}

function createRequestHandler(options = {}) {
  const registryPath = options.registryPath || Registry.defaultRegistryPath();

  return async function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');

    try {
      if (req.method === 'GET' && url.pathname === '/') {
        sendText(res, 200, 'GanttMD Local\n');
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/projects') {
        sendJson(res, 200, Registry.loadRegistry(registryPath));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/projects') {
        const payload = JSON.parse(await readBody(req) || '{}');
        if (!payload.root) {
          sendJson(res, 400, { error: '缺少 root' });
          return;
        }
        const registry = Registry.addProject(payload.root, {
          id: payload.id,
          name: payload.name,
        }, registryPath);
        sendJson(res, 200, registry);
        return;
      }

      if ((req.method === 'GET' && url.pathname === '/api/state') || (req.method === 'POST' && url.pathname === '/api/refresh')) {
        const registry = Registry.loadRegistry(registryPath);
        const projectId = url.searchParams.get('project');
        const project = projectId ? findProject(registry, projectId) : registry.projects[0];
        if (!project) {
          sendJson(res, 404, { error: '未找到项目，请先运行 ganttmd project add <path>' });
          return;
        }
        sendJson(res, 200, buildStateForProject(project, options));
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/worktrees') {
        const registry = Registry.loadRegistry(registryPath);
        const project = findProject(registry, url.searchParams.get('project') || '');
        if (!project) {
          sendJson(res, 404, { error: '未找到项目' });
          return;
        }
        sendJson(res, 200, { worktrees: safeScanWorktrees(project.root) });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  };
}

function startServer(options = {}) {
  const port = options.port !== undefined ? options.port : 7777;
  const host = options.host || '127.0.0.1';
  const server = http.createServer(createRequestHandler(options));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({ server, port: actualPort, host, url: `http://${host}:${actualPort}` });
    });
  });
}

module.exports = {
  buildStateForProject,
  createRequestHandler,
  startServer,
};
