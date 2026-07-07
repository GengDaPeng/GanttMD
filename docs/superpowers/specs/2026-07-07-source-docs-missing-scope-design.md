# source_docs 断链分层 + warning 折叠 + 自动归档命令

日期：2026-07-07
状态：待实现

本轮三件相关但独立的事，代码上是三个清晰模块：

- **A 校验豁免**：`source_docs` 断链校验按任务状态分层，历史旧路径不污染看板。
- **B warning 折叠**：CLI `validate` 文本输出对同类大量 warning 折叠，防 Agent 上下文爆炸。
- **C archive 命令**：独立的 `ganttmd archive`，把超阈值的终态任务原地写 `archived_at`。

## 关键事实（现状）

- 任务状态：`todo / in_progress / review / done / cancelled / blocked`。
  **无** `active` / `archived` 状态。"active" 是概念分组（非 `done`/`cancelled`）；
  "归档" 由 `archived_at` 字段表达（`SCHEMA.md`：不要把 `status` 改成 `archived`）。
- 看板过滤只看 `archived_at` 字段（`web/index.html:1129-1130`）：有该字段的任务从活跃视图隐藏。
  → **归档 = 写 `archived_at` 字段即可，无需搬文件**。
- `source_docs` 存在性校验只在 `src/rules.js` `checkTask`（当前 `rules.js:159-168`），且只对任务。
  follow-up 无此校验；Web 端传 `sourceDocExists: null` 整体跳过 → 配置只对 CLI `validate` 生效。
- 归档判定（`archiveDate` / `age > archiveAfterDays`）已在 `rules.js:136-157` 算好，可复用。
- 现有 `archive_after_days` 没有 config.yaml 入口（`validator.js:39` 只从 options 取，恒为默认 7）
  → 本轮补上 `validation.archive_after_days` 入口。
- `migrator.js` 提供成熟的安全写回骨架：`plan`（收集 `{file, previousContent, nextContent}`）
  → `apply`（乐观锁校验文件未变 → 备份到 `.backup/<ts>/` → 写）。archive 复用同款。
- `parseScalar`（`project-loader.js:37`）已支持 `[a, b]` 数组语法。
- CLI 命令在 `bin/ganttmd.js` 平铺 dispatch（`if (command === 'xxx')`）；
  `migrate` 命令默认 dry-run，`--apply` 才写并报备份目录——archive 沿用同款 UX。

## 配置总览（新增 `validation` 段）

```yaml
validation:
  source_docs_missing_exempt_statuses: [done, cancelled]  # 模块A，默认 []
  warning_detail_limit: 10                                 # 模块B，默认 10
  archive_after_days: 7        # 「可归档」提示 + 模块A 豁免时间门槛，默认 7
  auto_archive_after_days: 3   # 模块C archive 命令实际归档门槛，未配置则不归档
```

`archive_after_days` 本轮补上 config 入口（现状恒为默认 7、无入口）；
`options.archiveAfterDays` 优先（测试注入），其次 config，其次默认 7。

`validation` 段复用现有 kv + `parseScalar` 解析（`project-loader.js` parseConfig 加 `validation` 分支）。

---

## 模块 A：source_docs 断链校验分层

### 判定（`rules.js` `checkTask`）

```
命中 = task.status ∈ source_docs_missing_exempt_statuses
且   ( task.archived_at 非空  OR  已过 archive_after_days 阈值 )
命中 → 完全静默（不产生任何 issue）
未命中 → 严格校验（不存在则 warn，与现状一致）
```

- **默认 `[]`（空名单）**：未配置的现有项目保持当前严格行为（向后兼容零风险）。规则 2/3 是 opt-in。
- jwxt 显式配 `[done, cancelled]` 即达成「历史旧路径不污染」。
- 时间门槛复用 `archive_after_days`（相对天数，本轮开放 config，默认 7），**不引入绝对日期**（会腐烂）。
- **最近关闭**（状态命中但未归档、未超阈值）→ 仍严格校验（刚关闭的断链值得看一眼）。
- 豁免**完全静默**，不降级 info（归档/可归档的初衷就是清出看板）。
- 超阈值任务原有的「可归档」info（`rules.js:149-157`）保持不变。
- follow-up 无 source_docs 存在性校验 → 无需改动。

| 需求规则 | 落地 |
|---|---|
| 1. active 严格 | active 态默认不在名单 → 永远严格 |
| 2. done/cancelled + archived_at | 命中 + archived_at 非空 → 豁免 |
| 3. done/cancelled 超阈值未归档 | 命中 + 超阈值 → 豁免；「可归档」info 照常 |
| 4. closed/converted follow-up | follow-up 无该校验 → 无需改动 |
| 5. 项目配置 | `source_docs_missing_exempt_statuses` 名单；jwxt 配 `[done, cancelled]` |

### 软护栏

名单里配了活跃态（`todo`/`in_progress`/`review`/`blocked`）时，validator 在配置解析处
（trust boundary）输出一条 `(project)` 级 **info**：
"validation.source_docs_missing_exempt_statuses 豁免了活跃态 X，会削弱当前看板校验"。
不阻断、只提醒——守住「当前可执行任务严格校验」的硬目标。

---

## 模块 B：warning 通用折叠（CLI 文本输出）

痛点：规范重构后同类 warning（尤其断链）成批出现，Agent 读 stdout 时上下文爆炸。

### 设计（`bin/ganttmd.js` `printValidateResult`）

- rules/validator **照常产全量 issue**，折叠只发生在**人类文本输出层**。
- 按 `(level, field)` 分组。某组条数 > `warning_detail_limit` 时：
  只打印前 `limit` 条，末尾追加一行汇总：
  `…… 本组（level field）共 X 条，其余 M 条已折叠，加 --verbose 查看全部`。
- `--verbose`（别名 `--full`）flag → 不折叠，全量打印。
- `--json` → **始终全量**，不受折叠影响（机器消费；Agent 要全量可显式 --json）。
- `warning_detail_limit` 默认 10，可由 `validation.warning_detail_limit` 覆盖。
  非正数或未配置 → 用默认 10。

作用于所有级别（warn 与 info 同样按组折叠），因为爆炸风险对任何重复类都存在。

---

## 模块 C：`ganttmd archive` 命令（写 archived_at）

独立显式命令；validate 保持只读。

### 行为

- 配置 `validation.auto_archive_after_days`（整数天）。**未配置 → 命令不归档**，
  打印提示「未配置 validation.auto_archive_after_days，跳过自动归档」并退出 0（opt-in 安全）。
- 归档条件：`status ∈ {done, cancelled}` 且 `!archived_at` 且有 `archiveDate`
  且 `age > auto_archive_after_days`。范围 done + cancelled（与「可归档」提示对齐）。
- 写入：在该任务的 ```ganttmd-task 代码块内追加两行：
  `archived_at: <运行日期>` 和 `archived_reason: 自动归档：关闭超 N 天`。
- UX 沿用 migrate：`ganttmd archive [path]` 默认 dry-run 列出将归档任务；
  `--apply` 才写入并报备份目录；`--json` 输出 plan。

### 实现（新 `src/archiver.js`）

- `planArchive(root, {now})`：用 `loadProject` 拿任务清单选出待归档任务；
  **按文件聚合**——同一文件多个待归档任务合并为一个 change，`nextContent` 是该文件
  所有目标任务都插好字段后的最终文本（避免多 change 对同文件的乐观锁冲突）。
- 回写用**原文操作**，不依赖 loader 解析产物：重读文件，正则定位含目标 `id:` 的
  ```ganttmd-task 块，在块内插字段行，保留其余内容与缩进。
- `applyArchive`：复用 `fs-safety` 备份 + 乐观锁（`previousContent` 比对未变才写），
  与 `migrator.applyMigration` 同款。
- `now` 可注入，便于测试。

---

## 改动点汇总

| 文件 | 模块 | 改动 |
|---|---|---|
| `src/project-loader.js` | A/B/C | parseConfig 增 `validation` 段（复用 kv + parseScalar）。 |
| `src/rules.js` | A | `checkTask` 按名单+时间门槛豁免；ctx 默认 `[]`。 |
| `src/validator.js` | A | ctx 增 `sourceDocsMissingExemptStatuses`（默认 `[]`）+ 活跃态软护栏；`archiveAfterDays` 增读 `validation.archive_after_days`（options 优先 → config → 默认 7）。 |
| `bin/ganttmd.js` | B/C | `printValidateResult` 折叠 + `--verbose`；新增 `runArchive` + `archive` dispatch。 |
| `src/archiver.js` | C | 新文件：planArchive / applyArchive。 |
| `test/rules.test.js` | A | 豁免用例。 |
| `test/validator.test.js` | A | 配置解析 + 软护栏用例。 |
| `test/cli.test.js` | B | 折叠 / --verbose 输出用例。 |
| `test/archiver.test.js` | C | 新文件：plan/apply/dry-run/备份/未配置跳过用例。 |
| `SCHEMA.md` / 用户文档 | A/C | 记录三个 `validation.*` 配置语义。 |

无新依赖、无新抽象。

## 测试

**模块 A**（`rules.test.js`，注入 `sourceDocExists` 返回 false 模拟断链）：

- active 任务断链 → warn（默认空名单）。
- 名单 `[done]`，done + archived_at → 无 issue（规则2）。
- 名单 `[done]`，done + 超阈值未归档 → 无断链 warn，且仍有「可归档」info（规则3）。
- 名单 `[done]`，done + 未归档未超阈值（最近关闭）→ warn（仍严格）。
- 默认空名单，done + archived + 断链 → warn（opt-in 未开启，向后兼容）。

**模块 A 护栏**（`validator.test.js`）：名单含 `in_progress` → 输出 `(project)` 级软护栏 info。
`validation.archive_after_days: 3` → 关闭第 4 天的 done 命中超阈值豁免（验证 config 生效）。

**模块 B**（`cli.test.js`）：构造某组 > limit 条 warning → 默认折叠且含汇总行；
`--verbose` → 全量；`--json` → 全量不折叠。

**模块 C**（`archiver.test.js`）：

- 未配置 auto_archive_after_days → 不归档。
- done + 超阈值未归档 → plan 含该任务；apply 后文件含 `archived_at`，且有备份。
- dry-run 不写文件。
- 已有 archived_at / 未超阈值 / active → 不归档。
- 同文件多任务 → 一次 apply 全部写入。

## 不做

- 不引入绝对日期 cutoff；不引入每状态独立时间阈值的规则 DSL（YAGNI）。
- validate 不写文件（保持只读）；归档只走独立 `archive` 命令。
- 归档不搬文件（只写字段）；不改 follow-up、不改 Web 端存在性校验。
- 不改「缺少 source_docs」warning（`rules.js:169` 已豁免 done/cancelled）。
- `--json` 输出不折叠（机器消费保持全量）。
