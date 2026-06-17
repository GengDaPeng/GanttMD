const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// 备份目录名：时间戳 + 随机后缀，避免同一毫秒内多次写盘撞目录。
// migrate、template eject 等需要备份的写命令共用。
function backupDirName(now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, '');
  return `${stamp}-${crypto.randomUUID().slice(0, 8)}`;
}

// 目标是否在 root 内（不含 .. 越界、不含绝对路径逃逸）。
function isInsideRoot(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// 写盘安全护栏：拒绝写到 .ganttmd 外部，并逐路径组件用 lstat 拦截 symlink，
// 防止通过符号链接把写操作穿透到外部文件。upgrade、template eject 等写命令共用。
function ensureManagedPath(ganttRoot, filePath, label = '写入目标') {
  const absoluteRoot = path.resolve(ganttRoot);
  const absoluteTarget = path.resolve(filePath);
  if (fs.existsSync(absoluteRoot)) {
    const rootStat = fs.lstatSync(absoluteRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new Error(`${label}必须位于 .ganttmd 目录内，且不能是指向外部的符号链接：${filePath}`);
    }
  }
  if (!isInsideRoot(absoluteRoot, absoluteTarget)) {
    throw new Error(`${label}必须位于 .ganttmd 目录内，且不能是指向外部的符号链接：${filePath}`);
  }

  const relative = path.relative(absoluteRoot, absoluteTarget);
  if (!relative) return;

  let current = absoluteRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      continue;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`${label}必须位于 .ganttmd 目录内，且不能是指向外部的符号链接：${filePath}`);
    }
  }
}

module.exports = {
  isInsideRoot,
  ensureManagedPath,
  backupDirName,
};
