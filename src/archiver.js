// GanttMD 自动归档：把超阈值的终态任务原地写 archived_at。
// 复用 migrator 的安全写回骨架（乐观锁 + 备份）；validate 保持只读，写操作只在此。

const fs = require('node:fs');
const path = require('node:path');

const { loadProject, readTextIfExists } = require('./project-loader.js');
const Rules = require('./rules.js');
const { backupDirName } = require('./fs-safety.js');

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 与 rules.js 的归档日期候选顺序保持一致。
function archiveDateOf(task) {
  const candidates = task.status === 'done'
    ? [task.completed_date, task.closed_at, task.updated_at]
    : [task.closed_at, task.cancelled_at, task.completed_date, task.updated_at];
  for (const c of candidates) {
    const d = Rules.parseDate(c);
    if (d) return d;
  }
  return null;
}

// 在含指定 id 的 ganttmd-task 代码块内追加 archived_at / archived_reason。
function insertArchiveFields(content, taskId, dateStr, threshold) {
  const re = /```ganttmd-task\s*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const body = m[1];
    const idRe = new RegExp('^\\s*id:\\s*' + escapeRegExp(taskId) + '\\s*$', 'm');
    if (idRe.test(body)) {
      const addition = 'archived_at: ' + dateStr + '\narchived_reason: 自动归档：关闭超 ' + threshold + ' 天';
      const newBlock = '```ganttmd-task\n' + body + '\n' + addition + '\n```';
      return content.slice(0, m.index) + newBlock + content.slice(re.lastIndex);
    }
  }
  return content;
}

function planArchive(projectRoot = process.cwd(), options = {}) {
  const now = options.now || new Date();
  const project = loadProject(projectRoot);
  const ganttRoot = project.ganttRoot;
  const validation = project.config.validation || {};
  const threshold = Number(validation.auto_archive_after_days);
  if (!Number.isFinite(threshold) || threshold < 0) {
    return { ganttRoot, configured: false, changes: [] };
  }

  const byFile = new Map();
  for (const task of project.tasks) {
    if (!task.id) continue;
    if (task.status !== 'done' && task.status !== 'cancelled') continue;
    if (task.archived_at) continue;
    const archiveDate = archiveDateOf(task);
    if (!archiveDate) continue;
    if (Rules.daysBetween(archiveDate, now) <= threshold) continue;
    if (!byFile.has(task.source_file)) byFile.set(task.source_file, []);
    byFile.get(task.source_file).push(task);
  }

  const dateStr = ymd(now);
  const changes = [];
  for (const [relFile, tasks] of byFile) {
    const abs = path.join(ganttRoot, relFile);
    const previousContent = readTextIfExists(abs);
    let nextContent = previousContent;
    for (const task of tasks) {
      nextContent = insertArchiveFields(nextContent, task.id, dateStr, threshold);
    }
    changes.push({ file: abs, taskIds: tasks.map((t) => t.id), previousContent, nextContent });
  }
  return { ganttRoot, configured: true, threshold, changes };
}

function applyArchive(projectRoot = process.cwd(), options = {}) {
  const plan = planArchive(projectRoot, options);
  if (!plan.configured || plan.changes.length === 0) {
    return { ...plan, applied: false, backupRoot: '' };
  }
  const backupRoot = path.join(plan.ganttRoot, '.backup', backupDirName(options.now));
  for (const change of plan.changes) {
    const current = readTextIfExists(change.file);
    if (current !== change.previousContent) {
      throw new Error('文件在归档计划后发生变化，停止写入：' + change.file);
    }
    const relative = path.relative(plan.ganttRoot, change.file);
    const backupPath = path.join(backupRoot, relative);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(change.file, backupPath);
    fs.writeFileSync(change.file, change.nextContent);
  }
  return { ...plan, applied: true, backupRoot };
}

module.exports = { planArchive, applyArchive };
