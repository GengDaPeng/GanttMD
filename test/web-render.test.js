const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('任务卡区分活跃分支和完成分支', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  assert.ok(html.includes('completed_branch'), '任务卡必须读取 completed_branch');
  assert.ok(html.includes('完成分支'), '任务卡必须用中文标识完成分支');
  assert.ok(html.includes('completed-branch-tag'), '完成分支必须使用独立样式，不能复用活跃分支样式');
});
