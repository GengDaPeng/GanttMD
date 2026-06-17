const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const Registry = require('./project-registry.js');
const { buildRuntimeState } = require('./runtime-state.js');
const { scanGitWorktrees } = require('./worktree-scanner.js');

const watcherState = new Map();
const MAX_REQUEST_BYTES = 32 * 1024;
const MIN_EVENT_TIMEOUT_MS = 500;
const MAX_EVENT_TIMEOUT_MS = 120000;

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'content-security-policy': "default-src 'self';",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end(text);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-type': 'text/html; charset=utf-8',
  });
  res.end(html);
}

function readWebIndex() {
  return fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length']);
    if (Number.isInteger(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      reject(new Error('payload_too_large'));
      return;
    }

    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseSafeInt(value, options = {}) {
  const { min = -Infinity, max = Infinity, defaultValue = NaN } = options;
  if (value == null || value === '') return defaultValue;
  if (typeof value !== 'string') return NaN;
  if (!/^-?\d+$/.test(value)) return NaN;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return NaN;
  return parsed;
}

function parseBodyAsJson(req) {
  return readBody(req).then((raw) => {
    if (!raw) return {};
    return JSON.parse(raw);
  });
}

function normalizeProjectId(raw) {
  const id = String(raw || '').trim();
  if (!id) return '';
  return id.slice(0, 64);
}

function findProject(registry, id) {
  if (typeof id !== 'string') return undefined;
  const normalized = path.resolve(id);
  return registry.projects.find((project) => project.id === id || project.root === normalized);
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
  const state = buildRuntimeState(project.root, { worktrees });
  state.version = getProjectVersion(project.root);
  return state;
}

function computeGanttVersion(projectRoot) {
  const ganttRoot = path.join(projectRoot, '.ganttmd');
  let version = 0;

  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.backup') continue;
      const filePath = path.join(directory, entry.name);
      const stat = fs.statSync(filePath);
      version = Math.max(version, stat.mtimeMs);
      if (entry.isDirectory()) walk(filePath);
    }
  }

  try {
    walk(ganttRoot);
  } catch (error) {
    if (process.env.GANTTMD_DEBUG) {
      console.error(`[DEBUG] Failed to compute version for ${projectRoot}:`, error.message);
    }
    return Date.now();
  }
  return Math.floor(version);
}

function watchProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const current = watcherState.get(root);
  if (current) return current;
  const state = { version: computeGanttVersion(root), watcher: null };
  watcherState.set(root, state);
  const ganttRoot = path.join(root, '.ganttmd');
  if (!fs.existsSync(ganttRoot)) return state;
  try {
    state.watcher = fs.watch(ganttRoot, { recursive: true }, () => {
      state.version = Date.now();
    });
    state.watcher.on('error', () => {
      state.watcher?.close();
      state.watcher = null;
    });
    state.watcher.unref?.();
  } catch {
    // 不支持 recursive fs.watch 的平台会退回到 /api/events 的轮询版本比较。
  }
  return state;
}

function closeWatchers() {
  for (const state of watcherState.values()) {
    state.watcher?.close();
    state.watcher = null;
  }
  watcherState.clear();
}

function getProjectVersion(projectRoot) {
  const watched = watchProject(projectRoot);
  const diskVersion = computeGanttVersion(projectRoot);
  if (diskVersion > watched.version) watched.version = diskVersion;
  return watched.version;
}

function waitForProjectChange(projectRoot, since, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const version = getProjectVersion(projectRoot);
      if (String(version) !== String(since || '0')) {
        resolve({ changed: true, version });
        return;
      }
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) {
        resolve({ changed: false, version });
        return;
      }
      setTimeout(tick, Math.min(1000, Math.max(5, timeoutMs - elapsed)));
    };
    tick();
  });
}

function createRequestHandler(options = {}) {
  const registryPath = options.registryPath || Registry.defaultRegistryPath();
  Registry.ensureSampleProject(registryPath, options.sampleRoot);

  return async function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');

    try {
      if (req.method === 'GET' && url.pathname === '/rules.js') {
        const rulesPath = path.join(__dirname, 'rules.js');
        const content = fs.readFileSync(rulesPath, 'utf8');
        res.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        });
        res.end(content);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/') {
        sendHtml(res, readWebIndex());
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/project/')) {
        sendHtml(res, readWebIndex());
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/projects') {
        sendJson(res, 200, Registry.loadRegistry(registryPath));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/projects') {
        let payload;
        try {
          payload = await parseBodyAsJson(req);
        } catch (bodyError) {
          if (bodyError && bodyError.message === 'payload_too_large') {
            sendJson(res, 413, { error: '请求体过大' });
            return;
          }
          sendJson(res, 400, { error: '请求体不是合法 JSON' });
          return;
        }
        if (typeof payload.root !== 'string' || !payload.root.trim()) {
          sendJson(res, 400, { error: '缺少 root' });
          return;
        }

        try {
          const registry = Registry.addProject(payload.root, {
            id: normalizeProjectId(payload.id),
            name: payload.name,
          }, registryPath);
          sendJson(res, 200, registry);
        } catch (error) {
          sendJson(res, 400, { error: error.message });
        }
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

      if (req.method === 'GET' && url.pathname === '/api/events') {
        const registry = Registry.loadRegistry(registryPath);
        const project = findProject(registry, url.searchParams.get('project') || '');
        if (!project) {
          sendJson(res, 404, { error: '未找到项目' });
          return;
        }
        const since = parseSafeInt(url.searchParams.get('since'), {
          min: 0,
          max: Number.MAX_SAFE_INTEGER,
          defaultValue: 0,
        });
        const timeout = parseSafeInt(url.searchParams.get('timeout'), {
          min: MIN_EVENT_TIMEOUT_MS,
          max: MAX_EVENT_TIMEOUT_MS,
          defaultValue: 25000,
        });
        if (Number.isNaN(since) || Number.isNaN(timeout)) {
          sendJson(res, 400, { error: '参数无效：since 或 timeout' });
          return;
        }
        sendJson(res, 200, await waitForProjectChange(project.root, String(since), timeout));
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
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('仅允许在本机回环地址上监听服务');
  }
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
  closeWatchers,
  computeGanttVersion,
  createRequestHandler,
  getProjectVersion,
  startServer,
  waitForProjectChange,
  watchProject,
};
