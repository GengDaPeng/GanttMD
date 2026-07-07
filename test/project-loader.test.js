const assert = require('node:assert/strict');
const test = require('node:test');

const { parseConfig } = require('../src/project-loader.js');

test('parseConfig 解析 validation 段的数组与标量', () => {
  const config = parseConfig(`validation:
  source_docs_missing_exempt_statuses: [done, cancelled]
  warning_detail_limit: 10
  archive_after_days: 7
  auto_archive_after_days: 3
`);
  assert.deepEqual(config.validation.source_docs_missing_exempt_statuses, ['done', 'cancelled']);
  assert.equal(config.validation.warning_detail_limit, '10');
  assert.equal(config.validation.archive_after_days, '7');
  assert.equal(config.validation.auto_archive_after_days, '3');
});

test('parseConfig 未写 validation 段时该字段为空对象', () => {
  const config = parseConfig('project:\n  name: X\n');
  assert.deepEqual(config.validation, {});
});
