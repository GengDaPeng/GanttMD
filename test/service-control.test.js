const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ServiceControl = require('../src/service-control.js');

test('service 控制支持脏状态文件的容错读取', () => {
  const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-state-')), 'server.json');
  fs.writeFileSync(statePath, 'not-json');

  const state = ServiceControl.readServerState(statePath);
  assert.equal(state.running, false);
  assert.equal(state.message, 'GanttMD Local 未启动');
});

test('startServerProcess 校验端口范围', () => {
  const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-state-')), 'server.json');
  assert.throws(() => ServiceControl.startServerProcess({ statePath, port: 70000 }), /端口号必须在 1 到 65535 之间/);
});

test('readServerState 对超大状态文件采用降级策略', () => {
  const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-state-')), 'server.json');
  const huge = JSON.stringify({ status: 'running', pid: 1, port: 7777, host: '127.0.0.1', command: 'node a' });
  fs.writeFileSync(statePath, huge.padEnd(130 * 1024, 'x'));

  const state = ServiceControl.readServerState(statePath);
  assert.equal(state.running, false);
  assert.equal(state.message, 'GanttMD Local 未启动');
});

test('startServerProcess 仅允许绑定本机回环地址', () => {
  const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-state-')), 'server.json');
  assert.throws(() => {
    ServiceControl.startServerProcess({ statePath, host: '0.0.0.0', port: 7777 });
  }, /仅允许绑定本机回环地址/);
});
