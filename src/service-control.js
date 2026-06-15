const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');

const MAX_STATE_PAYLOAD_BYTES = 128 * 1024;

function isLikelyGanttServerProcess(pid, expectedCommand) {
  const targetPid = Number(pid);
  if (!Number.isInteger(targetPid) || targetPid <= 0) return false;
  try {
    const result = spawnSync('ps', ['-p', String(targetPid), '-o', 'command='], { encoding: 'utf8' });
    if (result.error || result.status !== 0) return false;
    const command = (result.stdout || '').trim();
    if (command.includes('ganttmd.js serve')) return true;
    if (!expectedCommand) return false;
    return command.includes(expectedCommand);
  } catch (_error) {
    return false;
  }
}

function defaultStatePath() {
  return process.env.GANTTMD_SERVER_STATE || path.join(os.homedir(), '.ganttmd', 'server.json');
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_STATE_PAYLOAD_BYTES) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(value, null, 2) + '\n';
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, serialized);
  fs.renameSync(tempPath, filePath);
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
  const validManagedProcess = isLikelyGanttServerProcess(state.pid, state.command);
  const normalizedRunning = running && validManagedProcess;
  return {
    ...state,
    running: normalizedRunning,
    statePath,
    message: normalizedRunning ? 'GanttMD Local 正在运行' : 'GanttMD Local 未启动',
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
  const port = options.port || 7777;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('端口号必须在 1 到 65535 之间');
  }
  const existing = readServerState(statePath);
  if (existing.running) {
    return {
      ...existing,
      alreadyRunning: true,
    };
  }

  const host = options.host || '127.0.0.1';
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('仅允许绑定本机回环地址');
  }
  const cliPath = options.cliPath || path.join(__dirname, '..', 'bin', 'ganttmd.js');
  const command = `${process.execPath} ${cliPath} serve --port ${port}`;
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
    command,
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
  const pid = state && Number(state.pid);
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

  if (pid === process.pid) {
    const stopped = {
      ...(state || {}),
      status: 'stopped',
      running: false,
      statePath,
      stoppedAt: new Date().toISOString(),
      message: '当前进程不能用于 stop，避免误杀',
    };
    writeJson(statePath, stopped);
    return stopped;
  }

  if (!isLikelyGanttServerProcess(pid, state.command)) {
    const stopped = {
      ...(state || {}),
      status: 'stopped',
      running: false,
      statePath,
      stoppedAt: new Date().toISOString(),
      message: '状态文件中的进程非 GanttMD 服务，已中止 stop',
    };
    writeJson(statePath, stopped);
    return stopped;
  }

  try {
    process.kill(pid, 'SIGTERM');
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
  if (!/^https?:\/\//.test(url)) return;
  if (/[\r\n]/.test(url)) return;
  try {
    const parsed = new URL(url);
    if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) return;
  } catch {
    return;
  }
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
