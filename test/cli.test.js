const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const cliPath = path.join(__dirname, '..', 'bin', 'ganttmd.js');
const minimalPath = path.join(__dirname, '..', 'examples', 'minimal');

test('ganttmd --version 输出 package 版本', () => {
  const result = spawnSync(process.execPath, [cliPath, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), require('../package.json').version);
});

test('ganttmd validate --json 输出机器可读校验结果', () => {
  const result = spawnSync(process.execPath, [cliPath, 'validate', minimalPath, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const data = JSON.parse(result.stdout);
  assert.equal(data.root, minimalPath);
  assert.equal(data.taskCount, 5);
  assert.equal(data.followupCount, 2);
  assert.equal(data.warningCount, 0);
  assert.ok(Array.isArray(data.issues));
});
