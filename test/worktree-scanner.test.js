const assert = require('node:assert/strict');
const test = require('node:test');

const { parseWorktreeList } = require('../src/worktree-scanner.js');

test('parseWorktreeList 能解析 git worktree porcelain 输出', () => {
  const entries = parseWorktreeList(`worktree /repo/main
HEAD abc123
branch refs/heads/main

worktree /repo/feature
HEAD def456
branch refs/heads/feat/demo

worktree /repo/detached
HEAD 000000
detached
`);

  assert.equal(entries.length, 3);
  assert.deepEqual(entries[0], {
    path: '/repo/main',
    head: 'abc123',
    branch: 'main',
    detached: false,
    bare: false,
  });
  assert.equal(entries[1].branch, 'feat/demo');
  assert.equal(entries[2].detached, true);
  assert.equal(entries[2].branch, '');
});
