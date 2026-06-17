const fs = require('node:fs');
const path = require('node:path');

const { resolveGanttRoot, readTextIfExists } = require('./project-loader.js');
const { backupDirName } = require('./fs-safety.js');

function hasSchemaVersion(configText) {
  return /^ganttmd:\s*\n(?:\s+[a-zA-Z_]+:\s*.*\n)*\s+schema_version:\s*\d+/m.test(configText);
}

function planMigration(projectRoot = process.cwd()) {
  const ganttRoot = resolveGanttRoot(projectRoot);
  const configPath = path.join(ganttRoot, 'config.yaml');
  const changes = [];
  const configText = readTextIfExists(configPath);

  if (!configText) {
    changes.push({
      type: 'create',
      file: configPath,
      description: '创建缺失的 config.yaml 并写入 schema_version',
      nextContent: `ganttmd:\n  schema_version: 1\nproject:\n  id: ${path.basename(path.dirname(ganttRoot))}\n  name: ${path.basename(path.dirname(ganttRoot))}\n`,
    });
  } else if (!hasSchemaVersion(configText)) {
    changes.push({
      type: 'modify',
      file: configPath,
      description: '为 config.yaml 增加 ganttmd.schema_version: 1',
      previousContent: configText,
      nextContent: `ganttmd:\n  schema_version: 1\n\n${configText}`,
    });
  }

  return { ganttRoot, changes };
}

function applyMigration(projectRoot = process.cwd()) {
  const plan = planMigration(projectRoot);
  if (plan.changes.length === 0) return { ...plan, applied: false, backupRoot: '' };

  const backupRoot = path.join(plan.ganttRoot, '.backup', backupDirName());
  for (const change of plan.changes) {
    const current = readTextIfExists(change.file);
    if (change.previousContent !== undefined && current !== change.previousContent) {
      throw new Error(`文件在迁移计划后发生变化，停止写入：${change.file}`);
    }
    if (fs.existsSync(change.file)) {
      const relative = path.relative(plan.ganttRoot, change.file);
      const backupPath = path.join(backupRoot, relative);
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(change.file, backupPath);
    }
    fs.mkdirSync(path.dirname(change.file), { recursive: true });
    fs.writeFileSync(change.file, change.nextContent);
  }

  return { ...plan, applied: true, backupRoot };
}

module.exports = {
  applyMigration,
  hasSchemaVersion,
  planMigration,
};
