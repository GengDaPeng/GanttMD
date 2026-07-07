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

test('validate 文本输出折叠同类大量 warning，--verbose 展开', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-fold-'));
  fs.mkdirSync(path.join(tmp, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'config.yaml'), 'project:\n  name: Fold\n');
  let md = '';
  for (let i = 0; i < 12; i++) {
    md += `\`\`\`ganttmd-task
id: T${i}
title: t${i}
status: todo
track: backend
milestone: M1
dependencies: []
source_docs: [docs/missing-${i}.md]
next_action: x
acceptance: [a]
\`\`\`

`;
  }
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'tasks', 'main.md'), md);

  const folded = spawnSync(process.execPath, [cliPath, 'validate', tmp], { encoding: 'utf8' });
  assert.ok(folded.stdout.indexOf('已折叠') !== -1, folded.stdout);

  const verbose = spawnSync(process.execPath, [cliPath, 'validate', tmp, '--verbose'], { encoding: 'utf8' });
  assert.ok(verbose.stdout.indexOf('已折叠') === -1, verbose.stdout);
  assert.equal((verbose.stdout.match(/来源文档不存在/g) || []).length, 12);

  const json = spawnSync(process.execPath, [cliPath, 'validate', tmp, '--json'], { encoding: 'utf8' });
  const data = JSON.parse(json.stdout);
  assert.equal(data.issues.filter((i) => String(i.message).indexOf('来源文档不存在') === 0).length, 12);
});

test('validate 多分组独立性：一组超限折叠，另一组不超限全部打印', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-multi-fold-'));
  fs.mkdirSync(path.join(tmp, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'config.yaml'), 'project:\n  name: MultiGroup\n');

  // 创建一个存在的文件供第二组使用
  const docsDir = path.join(tmp, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'exists.md'), '# Exists\n');

  let md = '';

  // 第一组：12 条 source_docs warning（超过默认 limit 10）
  for (let i = 0; i < 12; i++) {
    md += `\`\`\`ganttmd-task
id: G1T${i}
title: Group1Task${i}
status: todo
track: backend
milestone: M1
dependencies: []
source_docs: [docs/missing-${i}.md]
next_action: x
acceptance: [a]
\`\`\`

`;
  }

  // 第二组：3 条 blocked_reason warning（不超限）
  for (let i = 0; i < 3; i++) {
    md += `\`\`\`ganttmd-task
id: G2T${i}
title: Group2Task${i}
status: blocked
track: backend
milestone: M1
dependencies: []
source_docs: [docs/exists.md]
next_action: x
acceptance: [a]
\`\`\`

`;
  }

  fs.writeFileSync(path.join(tmp, '.ganttmd', 'tasks', 'main.md'), md);

  const result = spawnSync(process.execPath, [cliPath, 'validate', tmp], { encoding: 'utf8' });

  // 断言 1：超限组出现折叠汇总行
  assert.ok(result.stdout.indexOf('已折叠') !== -1, `Expected folding summary, got:\n${result.stdout}`);

  // 断言 2：不超限组的 3 条 blocked_reason warning 全部打印
  const blockedReasonMatches = (result.stdout.match(/blocked_reason/g) || []).length;
  assert.ok(blockedReasonMatches >= 3, `Expected at least 3 blocked_reason warnings in output, got ${blockedReasonMatches}:\n${result.stdout}`);
});

test('ganttmd archive 未配置阈值时跳过，配置后 dry-run 列出、--apply 写入', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-arch-cli-'));
  fs.mkdirSync(path.join(tmp, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'config.yaml'), 'validation:\n  auto_archive_after_days: 3\n');
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'tasks', 'main.md'), `\`\`\`ganttmd-task
id: A
title: A
status: done
track: backend
completed_date: 2020-01-01
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`);

  const dry = spawnSync(process.execPath, [cliPath, 'archive', tmp], { encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(dry.stdout.indexOf('dry-run') !== -1, dry.stdout);
  // dry-run 不写文件
  assert.ok(fs.readFileSync(path.join(tmp, '.ganttmd/tasks/main.md'), 'utf8').indexOf('archived_at') === -1);

  const applied = spawnSync(process.execPath, [cliPath, 'archive', tmp, '--apply'], { encoding: 'utf8' });
  assert.equal(applied.status, 0, applied.stderr);
  assert.ok(fs.readFileSync(path.join(tmp, '.ganttmd/tasks/main.md'), 'utf8').indexOf('archived_at') !== -1);
});
