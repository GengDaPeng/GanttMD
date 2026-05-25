const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function defaultStatePath() {
  return process.env.GANTTMD_SERVER_STATE || path.join(os.homedir(), '.ganttmd', 'server.json');
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function isProcessAlive(pid) {
  if (!pid || !Number.isInteger(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function readServerState(statePath = defaultStatePath()) {
  const state = readJson(statePath, null);
  if (!state) {
    return {
      running: false,
      statePath,
      message: 'GanttMD Local 未启动',
    };
  }
  const running = state.status !== 'stopped' && isProcessAlive(state.pid);
  return {
    ...state,
    running,
    statePath,
    message: running ? 'GanttMD Local 正在运行' : 'GanttMD Local 未启动',
  };
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // 同步 CLI stop 只等待很短时间，避免引入异步控制流。
  }
}

function startServerProcess(options = {}) {
  const statePath = options.statePath || defaultStatePath();
  const existing = readServerState(statePath);
  if (existing.running) {
    return {
      ...existing,
      alreadyRunning: true,
    };
  }

  const port = options.port || 7777;
  const host = options.host || '127.0.0.1';
  const cliPath = options.cliPath || path.join(__dirname, '..', 'bin', 'ganttmd.js');
  const args = [cliPath, 'serve', '--port', String(port)];
  const env = {
    ...process.env,
  };
  if (options.registryPath || process.env.GANTTMD_REGISTRY_PATH) {
    env.GANTTMD_REGISTRY_PATH = options.registryPath || process.env.GANTTMD_REGISTRY_PATH;
  }

  const child = spawn(process.execPath, args, {
    cwd: options.cwd || path.join(__dirname, '..'),
    detached: true,
    stdio: 'ignore',
    env,
  });
  child.unref();

  const state = {
    status: 'running',
    pid: child.pid,
    port,
    host,
    url: `http://${host}:${port}`,
    startedAt: new Date().toISOString(),
  };
  writeJson(statePath, state);
  return {
    ...state,
    running: true,
    statePath,
    alreadyRunning: false,
  };
}

function waitUntilStopped(pid, timeoutMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!isProcessAlive(pid)) return true;
    sleepSync(50);
  }
  return !isProcessAlive(pid);
}

function stopServerProcess(options = {}) {
  const statePath = options.statePath || defaultStatePath();
  const state = readJson(statePath, null);
  if (!state || !state.pid || !isProcessAlive(state.pid)) {
    const stopped = {
      ...(state || {}),
      status: 'stopped',
      running: false,
      statePath,
      stoppedAt: new Date().toISOString(),
    };
    writeJson(statePath, stopped);
    return stopped;
  }

  try {
    process.kill(Number(state.pid), 'SIGTERM');
  } catch {
    // 进程可能已经退出，后面统一写入 stopped 状态。
  }
  if (!waitUntilStopped(Number(state.pid))) {
    try {
      process.kill(Number(state.pid), 'SIGKILL');
    } catch {
      // 进程可能在 SIGTERM 等待后刚好退出。
    }
    waitUntilStopped(Number(state.pid), 1000);
  }

  const stopped = {
    ...state,
    status: 'stopped',
    running: false,
    statePath,
    stoppedAt: new Date().toISOString(),
  };
  writeJson(statePath, stopped);
  return stopped;
}

function openUrl(url) {
  if (!url) return;
  const platform = os.platform();
  if (platform === 'darwin') {
    const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
  } else if (platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
  }
}

module.exports = {
  defaultStatePath,
  isProcessAlive,
  openUrl,
  readServerState,
  sleepSync,
  startServerProcess,
  stopServerProcess,
  waitUntilStopped,
};
