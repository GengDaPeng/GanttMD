const fs = require('node:fs');
const path = require('node:path');

const { resolveGanttRoot, readTextIfExists } = require('./project-loader.js');
const { hasSchemaVersion } = require('./migrator.js');
const { README_CONTENT, LEGACY_README_CONTENT } = require('./project-init.js');
const { ensureManagedPath: ensureManagedPathSafe } = require('./fs-safety.js');

const DEPRECATED_FILES = [
  {
    relativePath: '.task-card.md',
    fingerprints: [
      '# 旧任务卡入口\n',
      '# 任务卡\n',
      '',
    ],
  },
  {
    relativePath: 'milestones/overview.md',
    fingerprints: [
      '# 里程碑总览\n',
      '',
    ],
  },
  {
    relativePath: 'views/timeline.json',
    fingerprints: [
      '{\n  "lanes": []\n}\n',
      '[]\n',
      '{}\n',
      '',
    ],
  },
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '').replace('T', 'T').replace('Z', 'Z');
}

// 共用 fs-safety 的护栏，保留 upgrade 原有错误文案。
function ensureManagedPath(ganttRoot, filePath) {
  ensureManagedPathSafe(ganttRoot, filePath, '升级目标');
}

function makeBaseResult(ganttRoot) {
  return {
    ganttRoot,
    created: [],
    modified: [],
    removed: [],
    warnings: [],
  };
}

function pushManagedReadme(plan, ganttRoot) {
  const readmePath = path.join(ganttRoot, 'README.md');
  const current = readTextIfExists(readmePath);

  if (!current) {
    plan.created.push({
      type: 'create',
      file: readmePath,
      description: '补齐缺失的 .ganttmd/README.md，并写入当前操作边界说明',
      nextContent: README_CONTENT,
    });
    return;
  }

  if (current === README_CONTENT) return;

  if (current === LEGACY_README_CONTENT) {
    plan.modified.push({
      type: 'modify',
      file: readmePath,
      description: '将托管的 .ganttmd/README.md 升级为当前说明，明确 runs.md 不再建议手工维护',
      previousContent: current,
      nextContent: README_CONTENT,
    });
  }
}

function pushSchemaUpgrade(plan, ganttRoot) {
  const configPath = path.join(ganttRoot, 'config.yaml');
  const configText = readTextIfExists(configPath);

  if (!configText) {
    plan.created.push({
      type: 'create',
      file: configPath,
      description: '创建缺失的 config.yaml 并写入 schema_version',
      nextContent: `ganttmd:\n  schema_version: 1\nproject:\n  id: ${path.basename(path.dirname(ganttRoot))}\n  name: ${path.basename(path.dirname(ganttRoot))}\n`,
    });
    return;
  }

  if (!hasSchemaVersion(configText)) {
    plan.modified.push({
      type: 'modify',
      file: configPath,
      description: '为 config.yaml 增加 ganttmd.schema_version: 1',
      previousContent: configText,
      nextContent: `ganttmd:\n  schema_version: 1\n\n${configText}`,
    });
  }
}

function pushDeprecatedCleanup(plan, ganttRoot) {
  for (const item of DEPRECATED_FILES) {
    const absolutePath = path.join(ganttRoot, item.relativePath);
    if (!fs.existsSync(absolutePath)) continue;

    const current = readTextIfExists(absolutePath);
    if (item.fingerprints.includes(current)) {
      plan.removed.push({
        type: 'remove',
        file: absolutePath,
        description: `删除已废弃文件 ${item.relativePath}`,
        previousContent: current,
      });
      continue;
    }

    plan.warnings.push({
      level: 'warn',
      file: absolutePath,
      message: `${item.relativePath} 已命中废弃白名单，但内容看起来已被用户修改；已跳过自动删除`,
    });
  }
}

function planUpgrade(projectRoot = process.cwd()) {
  const ganttRoot = resolveGanttRoot(projectRoot);
  const plan = makeBaseResult(ganttRoot);
  pushSchemaUpgrade(plan, ganttRoot);
  pushManagedReadme(plan, ganttRoot);
  pushDeprecatedCleanup(plan, ganttRoot);
  return plan;
}

function backupExistingFile(ganttRoot, backupRoot, filePath) {
  if (!fs.existsSync(filePath)) return;
  ensureManagedPath(ganttRoot, filePath);
  const relative = path.relative(ganttRoot, filePath);
  const backupPath = path.join(backupRoot, relative);
  ensureManagedPath(ganttRoot, backupPath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
}

function ensureUnchanged(change) {
  if (change.previousContent === undefined) return;
  const current = readTextIfExists(change.file);
  if (current !== change.previousContent) {
    throw new Error(`文件在升级计划后发生变化，停止写入：${change.file}`);
  }
}

function applyUpgrade(projectRoot = process.cwd()) {
  const plan = planUpgrade(projectRoot);
  const actionable = [...plan.created, ...plan.modified, ...plan.removed];
  if (actionable.length === 0) return { ...plan, applied: false, backupRoot: '' };

  const backupRoot = path.join(plan.ganttRoot, '.backup', timestamp(), 'upgrade');
  for (const change of actionable) {
    ensureManagedPath(plan.ganttRoot, change.file);
    ensureUnchanged(change);
    backupExistingFile(plan.ganttRoot, backupRoot, change.file);
    if (change.type === 'remove') {
      fs.unlinkSync(change.file);
      continue;
    }
    fs.mkdirSync(path.dirname(change.file), { recursive: true });
    fs.writeFileSync(change.file, change.nextContent);
  }

  return { ...plan, applied: true, backupRoot };
}

module.exports = {
  applyUpgrade,
  DEPRECATED_FILES,
  LEGACY_README_CONTENT,
  planUpgrade,
};
