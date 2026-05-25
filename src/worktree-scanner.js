const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function runGit(args, cwd, options = {}) {
  const exec = options.execFileSync || execFileSync;
  return exec('git', args, { cwd, encoding: 'utf8' }).trim();
}

function parseWorktreeList(text) {
  const entries = [];
  let current = null;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      current = null;
      continue;
    }
    const separator = line.indexOf(' ');
    const key = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1);

    if (key === 'worktree') {
      current = { path: value, branch: '', head: '', detached: false, bare: false };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    if (key === 'HEAD') current.head = value;
    if (key === 'branch') current.branch = value.replace(/^refs\/heads\//, '');
    if (key === 'detached') current.detached = true;
    if (key === 'bare') current.bare = true;
  }

  return entries;
}

function scanWorktree(entry, options = {}) {
  const root = entry.path;
  let status = '';
  try {
    status = runGit(['status', '--porcelain'], root, options);
  } catch (_error) {
    status = '';
  }

  return {
    root,
    branch: entry.branch || '(detached)',
    head: entry.head || '',
    detached: Boolean(entry.detached),
    bare: Boolean(entry.bare),
    isDirty: status.length > 0,
    hasGanttmd: fs.existsSync(path.join(root, '.ganttmd')),
  };
}

function scanGitWorktrees(projectRoot, options = {}) {
  const output = runGit(['worktree', 'list', '--porcelain'], projectRoot, options);
  return parseWorktreeList(output).map((entry) => scanWorktree(entry, options));
}

module.exports = {
  parseWorktreeList,
  scanGitWorktrees,
  scanWorktree,
};
