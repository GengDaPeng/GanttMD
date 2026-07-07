# source_docs 断链分层 + warning 折叠 + 自动归档命令 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 source_docs 断链校验按任务生命周期分层豁免、CLI 对同类大量 warning 折叠、并新增独立的 `ganttmd archive` 命令原地写 `archived_at`。

**Architecture:** 三个独立模块。A 改共享规则纯函数 `rules.js` 的 source_docs 存在性判定，配置经 `validator.js` 注入 ctx；B 只改 CLI 文本输出层 `bin/ganttmd.js`，规则照常产全量 issue；C 新增 `src/archiver.js`，复用 `migrator.js` 的 plan/apply/备份/乐观锁骨架，独立命令写文件、validate 保持只读。四个新配置集中在 `.ganttmd/config.yaml` 的 `validation` 段。

**Tech Stack:** Node.js（无框架）、`node:test` + `node:assert/strict`、CommonjS 模块、无新依赖。

## Global Constraints

- 无新依赖、无新抽象。
- `rules.js` 保持纯函数：无 IO、不算派生字段、通过 ctx 显式注入，且 ctx 缺省值安全（`defaultContext` 补默认）。
- `validate` 命令只读，绝不写文件；写操作只在 `archive` 命令。
- `validation` 段复用现有 `parseScalar`（`[a, b]` 解析数组、标量返回字符串，天数需 `Number()` 转换）。
- 中文输出与注释风格与现有代码一致。
- 测试用 `node:test` + `node:assert/strict`，不引入测试框架。
- commit message 用中文 conventional 前缀（`feat:` / `test:` / `docs:`），结尾加：
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 配置默认值：`source_docs_missing_exempt_statuses` 默认 `[]`；`warning_detail_limit` 默认 `10`；
  `archive_after_days` 默认 `7`；`auto_archive_after_days` 未配置则不归档。

---

## File Structure

- `src/project-loader.js` — parseConfig 增 `validation` 段（模块 A/B/C 共用配置入口）。
- `src/rules.js` — `checkTask` 的 source_docs 豁免判定 + `defaultContext` 默认（模块 A）。
- `src/validator.js` — ctx 注入 exempt 名单、`archive_after_days` 读配置、活跃态软护栏（模块 A）。
- `bin/ganttmd.js` — `printValidateResult` 折叠 + `--verbose`；`runArchive` + `archive` dispatch + help（模块 B/C）。
- `src/archiver.js` — 新文件：`planArchive` / `applyArchive`（模块 C）。
- `test/project-loader.test.js` — 新文件：validation 段解析。
- `test/rules.test.js` / `test/validator.test.js` / `test/cli.test.js` / `test/archiver.test.js` — 各模块测试。
- `SCHEMA.md` + `docs/user/安装更新卸载与迁移.md` — 配置文档。

---

## Task 1: config `validation` 段解析

**Files:**
- Modify: `src/project-loader.js:252`（config 初始化）、`src/project-loader.js:267`（section 白名单）
- Test: `test/project-loader.test.js`（新建）

**Interfaces:**
- Produces: `parseConfig(text).validation` 为对象；数组值（如 `[done, cancelled]`）解析为字符串数组，标量（如 `7`）解析为字符串。

- [ ] **Step 1: 写失败测试**

新建 `test/project-loader.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/project-loader.test.js`
Expected: FAIL（`config.validation` 为 `undefined`）

- [ ] **Step 3: 实现**

`src/project-loader.js` 第 252 行 config 初始化，加入 `validation: {}`：

```js
  const config = { ganttmd: {}, project: {}, views: {}, validation: {}, milestones: [], agent_command: parseAgentCommandConfig(text) };
```

第 267 行 section 白名单加入 `'validation'`：

```js
    if (section === 'ganttmd' || section === 'project' || section === 'views' || section === 'validation') {
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/project-loader.test.js`
Expected: PASS（2 tests）

- [ ] **Step 5: commit**

```bash
git add src/project-loader.js test/project-loader.test.js
git commit -m "feat: config 增加 validation 段解析

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 模块 A — rules.js source_docs 断链豁免

**Files:**
- Modify: `src/rules.js:159-171`（source_docs 校验块）、`src/rules.js:345-353`（defaultContext）
- Test: `test/rules.test.js`

**Interfaces:**
- Consumes: `ctx.sourceDocsMissingExemptStatuses`（字符串数组，缺省 `[]`）、`ctx.archiveAfterDays`、`ctx.now`、`ctx.sourceDocExists`。
- Produces: 命中豁免（状态在名单 且 已归档或超阈值）时不产生 source_docs `warn`。

- [ ] **Step 1: 写失败测试**

在 `test/rules.test.js` 末尾追加。用一个工厂减少重复：

```js
test('source_docs 断链按状态+归档门槛分层豁免', () => {
  const now = new Date('2026-07-07T00:00:00Z');
  function run(overrides, exemptStatuses) {
    const ctx = Rules.defaultContext({
      now,
      archiveAfterDays: 7,
      sourceDocExists: () => false, // 一律视为断链
      sourceDocsMissingExemptStatuses: exemptStatuses,
    });
    const task = Object.assign({
      id: 'T', title: 't', kind: 'task', track: 'backend', milestone: '',
      dependencies: [], source_docs: ['docs/missing.md'], next_action: 'x',
      acceptance: ['a'], evidence: ['e'], verification: 'v',
      _openDeps: [], _missingDeps: [], _downstreamCount: 0,
    }, overrides);
    return Rules.checkTask(task, ctx).filter((i) => i.field === 'source_docs');
  }
  const has = (issues) => issues.some((i) => i.text.indexOf('来源文档不存在') === 0);

  // 规则1：active 任务始终严格
  assert.ok(has(run({ status: 'in_progress' }, ['done', 'cancelled'])));
  // 规则2：done + archived_at 命中 → 豁免
  assert.ok(!has(run({ status: 'done', completed_date: '2026-07-06', archived_at: '2026-07-06' }, ['done'])));
  // 规则3：done + 超阈值未归档 → 豁免
  assert.ok(!has(run({ status: 'done', completed_date: '2026-06-01' }, ['done'])));
  // 最近关闭：done + 未归档未超阈值 → 仍严格
  assert.ok(has(run({ status: 'done', completed_date: '2026-07-06' }, ['done'])));
  // 默认空名单：done + archived + 断链 → 仍 warn（opt-in 未开启）
  assert.ok(has(run({ status: 'done', completed_date: '2026-06-01', archived_at: '2026-06-01' }, [])));
});

test('规则3 豁免时仍保留可归档 info', () => {
  const now = new Date('2026-07-07T00:00:00Z');
  const ctx = Rules.defaultContext({
    now, archiveAfterDays: 7, sourceDocExists: () => false,
    sourceDocsMissingExemptStatuses: ['done'],
  });
  const task = {
    id: 'T', title: 't', status: 'done', kind: 'task', track: 'backend', milestone: '',
    dependencies: [], source_docs: ['docs/missing.md'], completed_date: '2026-06-01',
    next_action: '', acceptance: [], evidence: ['e'], verification: 'v',
    _openDeps: [], _missingDeps: [], _downstreamCount: 0,
  };
  const issues = Rules.checkTask(task, ctx);
  assert.ok(issues.some((i) => i.text.indexOf('可归档') !== -1));
  assert.ok(!issues.some((i) => i.text.indexOf('来源文档不存在') === 0));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/rules.test.js`
Expected: FAIL（豁免用例仍报「来源文档不存在」）

- [ ] **Step 3: 实现豁免判定**

替换 `src/rules.js` 第 159-171 行（原 source_docs 块）为：

```js
    const exemptStatuses = Array.isArray(ctx.sourceDocsMissingExemptStatuses)
      ? ctx.sourceDocsMissingExemptStatuses
      : [];
    const sourceDocsExempt = exemptStatuses.indexOf(task.status) !== -1
      && (!!task.archived_at
          || (archiveDate != null && daysBetween(archiveDate, ctx.now) > archiveAfterDays));

    const srcDocs = toArray(task.source_docs);
    if (typeof ctx.sourceDocExists === 'function' && !sourceDocsExempt) {
      for (let i = 0; i < srcDocs.length; i++) {
        const p = String(srcDocs[i]).split('§')[0].trim();
        if (!p || p.indexOf('PR#') === 0 || p.indexOf('commit:') === 0) continue;
        if (ctx.sourceDocExists(p) === false) {
          make.warn('来源文档不存在：' + p, 'source_docs');
        }
      }
    }
    if (srcDocs.length === 0 && ['done', 'cancelled'].indexOf(task.status) === -1) {
      make.warn('任务缺少 source_docs，Agent 接手时无法追溯正式依据', 'source_docs');
    }
```

> `archiveDate` 与 `archiveAfterDays` 已在同函数上文（约 139/67 行）定义，直接复用，不重复计算。

`defaultContext`（第 346-353 行的 ctx 对象）增加默认，紧跟 `sourceDocExists: null,` 之后：

```js
      sourceDocsMissingExemptStatuses: [],
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/rules.test.js`
Expected: PASS（含新增 2 个 test，且原有 rules 测试不回归）

- [ ] **Step 5: commit**

```bash
git add src/rules.js test/rules.test.js
git commit -m "feat: source_docs 断链按状态与归档门槛分层豁免

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 模块 A — validator 注入配置 + 软护栏

**Files:**
- Modify: `src/validator.js:36-47`（context）、`src/validator.js:60` 后（软护栏 issue）
- Test: `test/validator.test.js`

**Interfaces:**
- Consumes: `project.config.validation.{source_docs_missing_exempt_statuses, archive_after_days}`。
- Produces: ctx 含 `sourceDocsMissingExemptStatuses`；`archiveAfterDays` 支持 config（`options.archiveAfterDays` 优先 → config → 默认 7）；名单含活跃态时输出 `(project)` 级 info。

- [ ] **Step 1: 写失败测试**

在 `test/validator.test.js` 末尾追加（复用文件已有的 `createProject` helper）：

```js
test('validation 配置驱动 source_docs 豁免与 archive_after_days', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `validation:
  source_docs_missing_exempt_statuses: [done]
  archive_after_days: 3
`,
    '.ganttmd/tasks/main.md': `\`\`\`ganttmd-task
id: OLD
title: 旧任务
status: done
track: backend
completed_date: 2026-07-01
dependencies: []
source_docs: [docs/missing.md]
evidence: [e]
verification: v
\`\`\`
`,
  });
  const project = loadProject(root);
  const issues = validateProject(project, { now: new Date('2026-07-07T00:00:00Z') });
  // 关闭 6 天 > archive_after_days 3 且命中名单 → 断链豁免
  assert.ok(!issues.some((i) => i.id === 'OLD' && String(i.message).indexOf('来源文档不存在') === 0));
});

test('名单含活跃态时输出软护栏 info', () => {
  const root = createProject({
    '.ganttmd/config.yaml': `validation:
  source_docs_missing_exempt_statuses: [in_progress]
`,
    '.ganttmd/tasks/main.md': `\`\`\`ganttmd-task
id: A
title: t
status: todo
track: backend
milestone: M1
dependencies: []
source_docs: [docs/spec.md]
next_action: x
acceptance: [a]
\`\`\`
`,
  });
  const project = loadProject(root);
  const issues = validateProject(project, { now: new Date('2026-07-07T00:00:00Z') });
  assert.ok(issues.some((i) => i.id === '(project)'
    && String(i.message).indexOf('豁免了活跃态') !== -1));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/validator.test.js`
Expected: FAIL（豁免未生效 / 无软护栏 info）

- [ ] **Step 3: 实现 context 与软护栏**

`src/validator.js` 把第 36-47 行的 `const context = {...}` 替换为：

```js
  const validation = project.config.validation || {};
  const configArchiveDays = Number(validation.archive_after_days);
  const context = {
    now: options.now || new Date(),
    reviewStaleDays: options.reviewStaleDays != null ? options.reviewStaleDays : DEFAULT_REVIEW_STALE_DAYS,
    archiveAfterDays: options.archiveAfterDays != null
      ? options.archiveAfterDays
      : (Number.isFinite(configArchiveDays) && configArchiveDays >= 0 ? configArchiveDays : DEFAULT_ARCHIVE_AFTER_DAYS),
    reviewStatuses: Array.isArray(project.config.ganttmd.review_statuses) && project.config.ganttmd.review_statuses.length
      ? project.config.ganttmd.review_statuses
      : Rules.REVIEW_STATUSES,
    milestoneIds: milestoneIds,
    sourceDocExists: (relPath) => fs.existsSync(path.resolve(project.root, relPath)),
    sourceDocsMissingExemptStatuses: Array.isArray(validation.source_docs_missing_exempt_statuses)
      ? validation.source_docs_missing_exempt_statuses
      : [],
    taskIds: null,
    taskById: null,
  };

  const ACTIVE_STATUSES = ['todo', 'in_progress', 'review', 'blocked'];
  const exemptActive = context.sourceDocsMissingExemptStatuses.filter((s) => ACTIVE_STATUSES.indexOf(s) !== -1);
  if (exemptActive.length > 0) {
    issues.push({
      level: 'info', id: '(project)',
      message: `validation.source_docs_missing_exempt_statuses 豁免了活跃态 ${exemptActive.join(', ')}，会削弱当前看板校验`,
      sourceFile: '', field: 'config',
    });
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/validator.test.js`
Expected: PASS（含新增 2 个 test，原有不回归）

- [ ] **Step 5: 全量回归**

Run: `node --test`
Expected: 全绿

- [ ] **Step 6: commit**

```bash
git add src/validator.js test/validator.test.js
git commit -m "feat: validator 注入 source_docs 豁免名单、archive_after_days 配置与活跃态软护栏

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 模块 B — CLI warning 折叠

**Files:**
- Modify: `bin/ganttmd.js`（`printValidateResult` 文本分支、`runValidate`、`printHelp`）
- Test: `test/cli.test.js`

**Interfaces:**
- Consumes: `project.config.validation.warning_detail_limit`（字符串，`Number()` 转换，默认 10）、`--verbose`/`--full` flag。
- Produces: 文本输出对同 `(level, field)` 组超过 limit 的 issue 折叠为「样本 + 汇总行」；`--json` 不受影响。

- [ ] **Step 1: 写失败测试**

在 `test/cli.test.js` 末尾追加（构造 12 条同类断链）：

```js
test('validate 文本输出折叠同类大量 warning，--verbose 展开', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-fold-'));
  fs.mkdirSync(path.join(tmp, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'config.yaml'), 'project:\n  name: Fold\n');
  let md = '';
  for (let i = 0; i < 12; i++) {
    md += `\`\`\`ganttmd-task
id: T${i}
title: t${i}
status: todo
track: backend
milestone: M1
dependencies: []
source_docs: [docs/missing-${i}.md]
next_action: x
acceptance: [a]
\`\`\`

`;
  }
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'tasks', 'main.md'), md);

  const folded = spawnSync(process.execPath, [cliPath, 'validate', tmp], { encoding: 'utf8' });
  assert.ok(folded.stdout.indexOf('已折叠') !== -1, folded.stdout);

  const verbose = spawnSync(process.execPath, [cliPath, 'validate', tmp, '--verbose'], { encoding: 'utf8' });
  assert.ok(verbose.stdout.indexOf('已折叠') === -1, verbose.stdout);
  assert.equal((verbose.stdout.match(/来源文档不存在/g) || []).length, 12);

  const json = spawnSync(process.execPath, [cliPath, 'validate', tmp, '--json'], { encoding: 'utf8' });
  const data = JSON.parse(json.stdout);
  assert.equal(data.issues.filter((i) => String(i.message).indexOf('来源文档不存在') === 0).length, 12);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/cli.test.js`
Expected: FAIL（未折叠，无「已折叠」字样）

- [ ] **Step 3: 实现折叠**

`bin/ganttmd.js` `runValidate` 替换为：

```js
function runValidate(args) {
  const options = parseRootAndFlags(args);
  options.verbose = args.includes('--verbose') || args.includes('--full');
  const project = loadProject(options.root);
  const rawLimit = Number(project.config.validation && project.config.validation.warning_detail_limit);
  options.detailLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const issues = validateProject(project);
  return printValidateResult(project, issues, options);
}
```

`printValidateResult` 文本分支里，把 `else { for (const item of issues) {...} }` 整段替换为：

```js
  } else if (options.verbose) {
    for (const item of issues) printIssueLine(item);
  } else {
    const limit = options.detailLimit || 10;
    const total = {};
    for (const item of issues) {
      const k = item.level + ' ' + (item.field || '');
      total[k] = (total[k] || 0) + 1;
    }
    const shown = {};
    for (const item of issues) {
      const k = item.level + ' ' + (item.field || '');
      if (total[k] <= limit) { printIssueLine(item); continue; }
      shown[k] = (shown[k] || 0) + 1;
      if (shown[k] <= limit) {
        printIssueLine(item);
      } else if (shown[k] === limit + 1) {
        const fieldLabel = item.field ? ` [${item.field}]` : '';
        console.log(`  …… 本组（${levelLabel(item.level)}${fieldLabel}）共 ${total[k]} 条，其余 ${total[k] - limit} 条已折叠，加 --verbose 查看全部`);
      }
    }
  }
```

并在 `printValidateResult` 上方新增打印辅助（复用原逐条格式）：

```js
function printIssueLine(item) {
  const location = item.sourceFile ? ` ${item.sourceFile}` : '';
  const field = item.field ? ` [${item.field}]` : '';
  console.log(`- ${levelLabel(item.level)} ${item.id}${field}${location}：${item.message}`);
}
```

`printHelp` 的用法列表把 validate 行改为：

```
  ganttmd validate [path] [--json] [--verbose]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/cli.test.js`
Expected: PASS

- [ ] **Step 5: commit**

```bash
git add bin/ganttmd.js test/cli.test.js
git commit -m "feat: validate 文本输出折叠同类大量 warning 并支持 --verbose

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 模块 C — archiver 核心

**Files:**
- Create: `src/archiver.js`
- Test: `test/archiver.test.js`（新建）

**Interfaces:**
- Produces:
  - `planArchive(projectRoot, {now}) -> { ganttRoot, configured, threshold?, changes: [{file, taskIds, previousContent, nextContent}] }`
  - `applyArchive(projectRoot, {now}) -> { ...plan, applied, backupRoot }`
- Consumes: `project.config.validation.auto_archive_after_days`；`task.source_file`（相对 ganttRoot）；`Rules.daysBetween`；`fs-safety.backupDirName`。

- [ ] **Step 1: 写失败测试**

新建 `test/archiver.test.js`：

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { planArchive, applyArchive } = require('../src/archiver.js');

function createProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-arch-'));
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

const NOW = new Date('2026-07-07T00:00:00Z');

function doneTask(id, completed) {
  return `\`\`\`ganttmd-task
id: ${id}
title: ${id}
status: done
track: backend
completed_date: ${completed}
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`;
}

test('未配置 auto_archive_after_days 时不归档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'project:\n  name: X\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01'),
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.configured, false);
  assert.equal(plan.changes.length, 0);
});

test('超阈值 done 任务进入归档计划，apply 后写入 archived_at 并备份', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01') + '\n' + doneTask('B', '2026-07-06'),
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.configured, true);
  // A 超阈值应归档；B 关闭 1 天 < 3 天不归档
  assert.deepEqual(plan.changes.map((c) => c.taskIds).flat(), ['A']);

  const before = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  const result = applyArchive(root, { now: NOW });
  assert.equal(result.applied, true);
  const after = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  assert.ok(after.indexOf('archived_at: 2026-07-07') !== -1);
  assert.ok(after.indexOf('archived_reason: 自动归档：关闭超 3 天') !== -1);
  assert.ok(after.indexOf('id: B') !== -1 && after.split('archived_at:').length === 2); // 只归档 A
  // 备份保留原文
  assert.ok(fs.existsSync(result.backupRoot));
  const backupFile = path.join(result.backupRoot, 'tasks', 'main.md');
  assert.equal(fs.readFileSync(backupFile, 'utf8'), before);
});

test('planArchive 是 dry-run，不写文件', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': doneTask('A', '2026-06-01'),
  });
  const before = fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8');
  planArchive(root, { now: NOW });
  assert.equal(fs.readFileSync(path.join(root, '.ganttmd/tasks/main.md'), 'utf8'), before);
});

test('已有 archived_at 的任务不重复归档', () => {
  const root = createProject({
    '.ganttmd/config.yaml': 'validation:\n  auto_archive_after_days: 3\n',
    '.ganttmd/tasks/main.md': `\`\`\`ganttmd-task
id: A
title: A
status: done
track: backend
completed_date: 2026-06-01
archived_at: 2026-06-05
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`,
  });
  const plan = planArchive(root, { now: NOW });
  assert.equal(plan.changes.length, 0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/archiver.test.js`
Expected: FAIL（`Cannot find module '../src/archiver.js'`）

- [ ] **Step 3: 实现 `src/archiver.js`**

```js
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
```

> `Rules.parseDate` / `Rules.daysBetween` 已在 rules.js 导出。`readTextIfExists` 对不存在文件返回 `''`；任务文件必然存在，故 `previousContent` 非空。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/archiver.test.js`
Expected: PASS（4 tests）

- [ ] **Step 5: commit**

```bash
git add src/archiver.js test/archiver.test.js
git commit -m "feat: 新增 archiver 自动归档超阈值终态任务

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 模块 C — `ganttmd archive` CLI 命令

**Files:**
- Modify: `bin/ganttmd.js`（require、`runArchive`、`printArchivePlan`、dispatch、`printHelp`）
- Test: `test/cli.test.js`

**Interfaces:**
- Consumes: `planArchive` / `applyArchive`（Task 5）。
- Produces: `ganttmd archive [path] [--apply] [--json]`；默认 dry-run。

- [ ] **Step 1: 写失败测试**

在 `test/cli.test.js` 末尾追加：

```js
test('ganttmd archive 未配置阈值时跳过，配置后 dry-run 列出、--apply 写入', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ganttmd-arch-cli-'));
  fs.mkdirSync(path.join(tmp, '.ganttmd', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'config.yaml'), 'validation:\n  auto_archive_after_days: 3\n');
  fs.writeFileSync(path.join(tmp, '.ganttmd', 'tasks', 'main.md'), `\`\`\`ganttmd-task
id: A
title: A
status: done
track: backend
completed_date: 2020-01-01
dependencies: []
source_docs: [docs/x.md]
evidence: [e]
verification: v
\`\`\`
`);

  const dry = spawnSync(process.execPath, [cliPath, 'archive', tmp], { encoding: 'utf8' });
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(dry.stdout.indexOf('dry-run') !== -1, dry.stdout);
  // dry-run 不写文件
  assert.ok(fs.readFileSync(path.join(tmp, '.ganttmd/tasks/main.md'), 'utf8').indexOf('archived_at') === -1);

  const applied = spawnSync(process.execPath, [cliPath, 'archive', tmp, '--apply'], { encoding: 'utf8' });
  assert.equal(applied.status, 0, applied.stderr);
  assert.ok(fs.readFileSync(path.join(tmp, '.ganttmd/tasks/main.md'), 'utf8').indexOf('archived_at') !== -1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/cli.test.js`
Expected: FAIL（`未知命令：archive`）

- [ ] **Step 3: 实现命令**

`bin/ganttmd.js` 顶部 require 区加入：

```js
const { planArchive, applyArchive } = require('../src/archiver.js');
```

在 `runValidate` 附近新增：

```js
function printArchivePlan(plan) {
  console.log(`GanttMD 归档计划：${plan.ganttRoot}`);
  if (!plan.configured) {
    console.log('未配置 validation.auto_archive_after_days，跳过自动归档。');
    return;
  }
  if (plan.changes.length === 0) {
    console.log('没有需要归档的任务。');
    return;
  }
  for (const change of plan.changes) {
    console.log(`- 归档 ${change.file}：${change.taskIds.join(', ')}`);
  }
}

function runArchive(args) {
  const options = parseRootAndFlags(args);
  const shouldApply = args.includes('--apply');
  const result = shouldApply ? applyArchive(options.root) : planArchive(options.root);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  printArchivePlan(result);
  if (!shouldApply && result.configured && result.changes.length > 0) {
    console.log('这是 dry-run。确认后运行：ganttmd archive <path> --apply');
  }
  if (shouldApply && result.configured) {
    console.log(result.applied ? `已归档，备份目录：${result.backupRoot}` : '没有需要归档的任务。');
  }
  return 0;
}
```

`main` dispatch 里，在 `migrate` 分支附近加入：

```js
  if (command === 'archive') {
    return runArchive(args.slice(1));
  }
```

`printHelp` 用法列表在 migrate 行后加入：

```
  ganttmd archive [path] [--apply] [--json]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/cli.test.js`
Expected: PASS

- [ ] **Step 5: 全量回归**

Run: `node --test`
Expected: 全绿

- [ ] **Step 6: commit**

```bash
git add bin/ganttmd.js test/cli.test.js
git commit -m "feat: 新增 ganttmd archive 命令（dry-run + --apply）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 文档

**Files:**
- Modify: `SCHEMA.md`、`docs/user/安装更新卸载与迁移.md`
- 无测试（文档）

- [ ] **Step 1: SCHEMA.md 增配置说明**

在 `SCHEMA.md` 讲配置/归档的相邻位置（如 `archived_at` 段 `SCHEMA.md:189` 附近）补一段 `validation` 配置说明：

```markdown
### validation 配置

`.ganttmd/config.yaml` 的 `validation` 段控制校验与归档行为（均可选）：

- `source_docs_missing_exempt_statuses`：字符串数组，默认 `[]`。列出「source_docs 断链不计入 warning」的任务状态；仅当任务已 `archived_at` 或已过 `archive_after_days` 阈值时豁免生效（最近关闭仍严格）。名单含活跃态会输出软护栏提示。
- `archive_after_days`：整数，默认 `7`。「可归档」提示与上面豁免的时间门槛。
- `auto_archive_after_days`：整数，未配置则 `ganttmd archive` 不归档任何任务。超过该天数的 `done`/`cancelled` 任务会被 `archive` 命令原地写 `archived_at`。
- `warning_detail_limit`：整数，默认 `10`。`validate` 文本输出中同类 warning 超过该条数则折叠，`--verbose` 展开。
```

- [ ] **Step 2: 用户文档补 archive 命令**

在 `docs/user/安装更新卸载与迁移.md` 命令说明处补：

```markdown
- `ganttmd archive [path] [--apply]`：把关闭超过 `validation.auto_archive_after_days` 天的 `done`/`cancelled` 任务原地写入 `archived_at`（默认 dry-run，`--apply` 才写并在 `.ganttmd/.backup/` 留备份）。未配置该阈值时不执行。
```

- [ ] **Step 3: commit**

```bash
git add SCHEMA.md docs/user/安装更新卸载与迁移.md
git commit -m "docs: 记录 validation 配置与 archive 命令

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 收尾

- [ ] 全量测试：`node --test` 全绿。
- [ ] 自查：`ganttmd validate` 对本仓库 dogfood 数据运行无回归（退出码 0/1 均可，非崩溃）。
