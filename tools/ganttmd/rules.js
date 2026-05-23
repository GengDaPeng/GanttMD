// GanttMD 共享规则模块
// 同一份规则给浏览器健康检查（tools/ganttmd/index.html）和 CLI 校验器（src/validator.js）使用。
//
// 设计原则：纯函数 + 显式上下文。规则函数本身不做 IO，不计算派生字段。
// 调用方需要先把任务派生字段（_openDeps / _missingDeps / _downstreamCount）算好再传入。
// 来源文档存在性检查通过 ctx.sourceDocExists 回调注入；浏览器端可以传 null 跳过该检查。

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GanttMDRules = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'cancelled', 'blocked'];
  const TASK_KINDS = ['task', 'bugfix', 'ad_hoc', 'review', 'harness'];
  const FOLLOWUP_STATUSES = ['open', 'accepted', 'converted', 'done', 'wontfix'];
  const FOLLOWUP_KINDS = ['followup', 'decision', 'deferred', 'external_wait', 'risk'];
  const ENGINEERING_TRACKS = ['backend', 'frontend', 'infra'];
  const DEFAULT_REVIEW_STALE_DAYS = 7;
  const DEFAULT_ARCHIVE_AFTER_DAYS = 30;

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysBetween(from, to) {
    return Math.floor((to.getTime() - from.getTime()) / 86400000);
  }

  function toArray(v) {
    if (Array.isArray(v)) return v;
    if (v == null || v === '') return [];
    return [String(v)];
  }

  function makeIssueFactory(id, sourceFile, sink) {
    return {
      warn: function (text, field) { sink.push({ level: 'warn', id: id, text: text, field: field, sourceFile: sourceFile }); },
      info: function (text, field) { sink.push({ level: 'info', id: id, text: text, field: field, sourceFile: sourceFile }); },
    };
  }

  // checkTask(task, ctx) -> Array<Issue>
  //
  // task 字段：标准 schema + 派生 _openDeps / _missingDeps / _downstreamCount
  // ctx: { now: Date, reviewStaleDays, archiveAfterDays, milestoneIds: Set,
  //        sourceDocExists: (relPath) => boolean | null }
  function checkTask(task, ctx) {
    const issues = [];
    const id = task.id || '(missing id)';
    const make = makeIssueFactory(id, task.source_file, issues);
    const reviewStaleDays = ctx.reviewStaleDays != null ? ctx.reviewStaleDays : DEFAULT_REVIEW_STALE_DAYS;
    const archiveAfterDays = ctx.archiveAfterDays != null ? ctx.archiveAfterDays : DEFAULT_ARCHIVE_AFTER_DAYS;

    if (!task.title) make.warn('任务缺少 title', 'title');
    if (!task.status) make.warn('任务缺少 status', 'status');
    if (task.status && TASK_STATUSES.indexOf(task.status) === -1) {
      make.warn('任务 status 非法：' + task.status, 'status');
    }
    if (task.kind && TASK_KINDS.indexOf(task.kind) === -1) {
      make.warn('任务 kind 非法：' + task.kind, 'kind');
    }

    if (task.status === 'in_progress' && !task.owner && !task.agent) {
      make.warn('in_progress 任务缺少 owner/agent，容易造成多 Agent 撞车', 'owner');
    }
    if (task.owner && task.agent && task.owner !== task.agent) {
      make.warn('owner 与 agent 不一致：' + task.owner + ' / ' + task.agent, 'agent');
    }

    if (!task.track) make.warn('任务缺少 track，无法挂载到主线视图', 'track');
    if (!task.milestone) {
      make.warn('任务缺少 milestone，无法挂载到里程碑视图', 'milestone');
    } else if (ctx.milestoneIds && ctx.milestoneIds.size > 0 && !ctx.milestoneIds.has(task.milestone)) {
      make.warn('任务引用未知里程碑：' + task.milestone, 'milestone');
    }

    if (task._missingDeps && task._missingDeps.length) {
      make.warn('依赖指向不存在任务：' + task._missingDeps.join(', '), 'dependencies');
    }

    if (task.status === 'blocked' && !task.blocked_reason) {
      make.warn('显式 blocked 任务必须填写 blocked_reason', 'blocked_reason');
    }

    const evArr = toArray(task.evidence);
    if (task.status === 'done' && evArr.length === 0) {
      make.warn('done 任务缺少 evidence，不能只靠口头确认闭环', 'evidence');
    }
    if (task.status === 'done' && ENGINEERING_TRACKS.indexOf(task.track) !== -1 && !task.verification) {
      make.warn('工程类 done 任务缺少 verification', 'verification');
    }
    if (task.status === 'review' && !task.review_status) {
      make.warn('review 任务缺少 review_status', 'review_status');
    }
    if (task.status === 'review') {
      const updatedAt = parseDate(task.updated_at);
      if (updatedAt) {
        const age = daysBetween(updatedAt, ctx.now);
        if (age > reviewStaleDays) {
          make.warn('review 状态超过 ' + reviewStaleDays + ' 天未更新，请复核或退回', 'updated_at');
        }
      }
    }
    if (task.status === 'cancelled' && !task.cancel_reason && !task.resolution) {
      make.warn('cancelled 任务缺少 cancel_reason 或 resolution', 'cancel_reason');
    }

    const archiveDate = task.status === 'done'
      ? parseDate(task.completed_date || task.closed_at)
      : parseDate(task.closed_at || task.cancelled_at || task.completed_date);
    if ((task.status === 'done' || task.status === 'cancelled') && archiveDate) {
      const age = daysBetween(archiveDate, ctx.now);
      if (age > archiveAfterDays) {
        make.info(
          task.status + ' 任务已关闭 ' + age + ' 天，可归档到历史任务文件',
          task.status === 'done' ? 'completed_date' : 'closed_at'
        );
      }
    }

    const srcDocs = toArray(task.source_docs);
    if (typeof ctx.sourceDocExists === 'function') {
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

    if (!task.next_action && ['done', 'cancelled'].indexOf(task.status) === -1) {
      make.info('未填写 next_action，Agent 接手时上下文会偏弱', 'next_action');
    }
    if (toArray(task.acceptance).length === 0 && ['done', 'cancelled'].indexOf(task.status) === -1) {
      make.info('未填写 acceptance，任务完成边界不清晰', 'acceptance');
    }

    const downstream = task._downstreamCount || 0;
    const constraints = toArray(task.downstream_constraints);
    if (downstream >= 2 && constraints.length === 0 && task.status !== 'done') {
      make.info(
        '有 ' + downstream + ' 个下游任务但未填写 downstream_constraints，Agent 实现时可能做出对下游不兼容的设计决策',
        'downstream_constraints'
      );
    }

    return issues;
  }

  // checkFollowup(followup, ctx) -> Array<Issue>
  function checkFollowup(f, ctx) {
    const issues = [];
    const id = f.id || '(missing followup id)';
    const make = makeIssueFactory(id, f.source_file, issues);

    const required = ['id', 'title', 'kind', 'status', 'source_type', 'created_by', 'created_at', 'reason', 'suggestion', 'severity'];
    for (let i = 0; i < required.length; i++) {
      if (!f[required[i]]) make.warn('follow-up 缺少 ' + required[i], required[i]);
    }
    if (f.status && FOLLOWUP_STATUSES.indexOf(f.status) === -1) {
      make.warn('follow-up status 非法：' + f.status, 'status');
    }
    if (f.kind && FOLLOWUP_KINDS.indexOf(f.kind) === -1) {
      make.warn('follow-up kind 非法：' + f.kind, 'kind');
    }
    if (f.source_type === 'pr_review' && (!f.source_pr || !f.source_rr)) {
      make.warn('PR 审查来源 follow-up 必须填写 source_pr 和 source_rr', 'source_pr');
    }
    if (f.kind === 'decision' && !f.decision_owner) {
      make.warn('用户裁决类 follow-up 缺少 decision_owner', 'decision_owner');
    }
    const needsReviewDate = f.status === 'accepted'
      || (['open', 'accepted'].indexOf(f.status) !== -1 && (f.kind === 'deferred' || f.kind === 'external_wait'));
    if (needsReviewDate && !f.next_review_at) {
      make.warn('延期或外部等待 follow-up 必须填写 next_review_at', 'next_review_at');
    }
    if (['open', 'accepted'].indexOf(f.status) !== -1 && f.next_review_at) {
      const nrt = parseDate(f.next_review_at);
      if (nrt && nrt.getTime() < ctx.now.getTime()) {
        make.warn('follow-up 已超过 next_review_at：' + f.next_review_at, 'next_review_at');
      }
    }
    if (f.status === 'accepted') {
      const acc = ['accepted_by', 'accepted_at', 'decision'];
      for (let i = 0; i < acc.length; i++) {
        if (!f[acc[i]]) make.warn('accepted follow-up 缺少 ' + acc[i], acc[i]);
      }
    }
    if (f.status === 'converted' && (!f.converted_task || !f.resolution)) {
      make.warn('converted follow-up 必须填写 converted_task 和 resolution', 'converted_task');
    }
    if ((f.status === 'done' || f.status === 'wontfix') && !f.resolution) {
      make.warn('已关闭 follow-up 必须填写 resolution', 'resolution');
    }

    return issues;
  }

  function defaultContext(overrides) {
    const ctx = {
      now: new Date(),
      reviewStaleDays: DEFAULT_REVIEW_STALE_DAYS,
      archiveAfterDays: DEFAULT_ARCHIVE_AFTER_DAYS,
      milestoneIds: null,
      sourceDocExists: null,
    };
    if (overrides) {
      for (const k in overrides) ctx[k] = overrides[k];
    }
    return ctx;
  }

  return {
    TASK_STATUSES: TASK_STATUSES,
    TASK_KINDS: TASK_KINDS,
    FOLLOWUP_STATUSES: FOLLOWUP_STATUSES,
    FOLLOWUP_KINDS: FOLLOWUP_KINDS,
    ENGINEERING_TRACKS: ENGINEERING_TRACKS,
    DEFAULT_REVIEW_STALE_DAYS: DEFAULT_REVIEW_STALE_DAYS,
    DEFAULT_ARCHIVE_AFTER_DAYS: DEFAULT_ARCHIVE_AFTER_DAYS,
    parseDate: parseDate,
    daysBetween: daysBetween,
    checkTask: checkTask,
    checkFollowup: checkFollowup,
    defaultContext: defaultContext,
  };
}));
