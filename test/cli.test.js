const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join(__dirname, '..', 'bin', 'ganttmd.js');
const samplePath = path.join(__dirname, '..');

test('ganttmd --version 输出 package 版本', () => {
  const result = spawnSync(process.execPath, [cliPath, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), require('../package.json').version);
});

test('ganttmd validate --json 输出机器可读校验结果', () => {
  const result = spawnSync(process.execPath, [cliPath, 'validate', samplePath, '--json'], { encoding: 'utf8' });
  // validate 有 warning 时退出码为 1、无 warning 时为 0；两者都算正常运行（非崩溃）。
  // 不断言 warningCount/退出码的具体值，因为 dogfood 数据含 review 超期、follow-up
  // 到期等时间敏感规则，会随真实时间漂移；此测试只验证 JSON 输出格式与结构计数。
  assert.ok(result.status === 0 || result.status === 1, result.stderr || result.stdout);
  const data = JSON.parse(result.stdout);
  assert.equal(data.root, samplePath);
  assert.equal(data.taskCount, 17);
  assert.equal(data.followupCount, 6);
  assert.equal(data.runCount, 3);
  assert.equal(data.checklistCount, 2);
  assert.equal(typeof data.warningCount, 'number');
  assert.ok(Array.isArray(data.issues));
});


test('ganttmd start/status/stop 管理后台本地服务', {
  // GitHub Actions 会等待后台进程清理，容易让 detached 服务测试卡住；本地仍完整覆盖这条 CLI 链路。
  skip: process.env.CI ? 'CI 跳过后台服务进程测试，避免 runner 挂起' : false,
}, async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const http = require('node:http');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-service-cli-'));
  const statePath = path.join(tmp, 'server.json');
  const registryPath = path.join(tmp, 'projects.json');
  const port = 19000 + Math.floor(Math.random() * 1000);
  const env = {
    ...process.env,
    GANTTMD_SERVER_STATE: statePath,
    GANTTMD_REGISTRY_PATH: registryPath,
  };

  function cli(args) {
    return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8', env });
  }

  function get(pathname) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy(new Error('timeout'));
      });
    });
  }

  const start = cli(['start', '--port', String(port), '--no-open']);
  assert.equal(start.status, 0, start.stderr || start.stdout);
  assert.match(start.stdout, /GanttMD Local 已启动/);

  try {
    let statusData;
    for (let i = 0; i < 30; i++) {
      const status = cli(['status', '--json']);
      assert.equal(status.status, 0, status.stderr || status.stdout);
      statusData = JSON.parse(status.stdout);
      if (statusData.running) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(statusData.running, true);
    assert.equal(statusData.port, port);
    assert.equal(await get('/api/projects'), 200);
  } finally {
    const stop = cli(['stop']);
    assert.equal(stop.status, 0, stop.stderr || stop.stdout);
    assert.match(stop.stdout, /GanttMD Local 已停止/);
  }

  const stopped = cli(['status', '--json']);
  assert.equal(stopped.status, 0, stopped.stderr || stopped.stdout);
  assert.equal(JSON.parse(stopped.stdout).running, false);
});
