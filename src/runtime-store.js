const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function defaultRuntimeStorePath() {
  return process.env.GANTTMD_RUNTIME_STORE || path.join(os.homedir(), '.ganttmd', 'runtime.jsonl');
}

function normalizeRoot(root) {
  return path.resolve(root || process.cwd());
}

function runtimeStorePath(options = {}) {
  return options.storePath || options.runtimeStorePath || defaultRuntimeStorePath();
}

function appendRuntimeEvent(event, options = {}) {
  const storePath = runtimeStorePath(options);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const payload = {
    schema_version: 1,
    recorded_at: new Date().toISOString(),
    ...event,
  };
  fs.appendFileSync(storePath, JSON.stringify(payload) + '\n');
  return { event: payload, storePath };
}

function loadRuntimeEvents(options = {}) {
  const storePath = runtimeStorePath(options);
  if (!fs.existsSync(storePath)) return [];
  const events = [];
  const text = fs.readFileSync(storePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      events.push({ type: 'parse_error', raw: line });
    }
  }
  return events;
}

function eventTasks(event) {
  if (Array.isArray(event.tasks)) return event.tasks;
  if (event.task_id) return [event.task_id];
  return [];
}

function findRunByEvent(runs, event) {
  if (event.run_id && runs.has(event.run_id)) return runs.get(event.run_id);
  if (event.branch) {
    for (const run of runs.values()) {
      if (run.branch === event.branch && run.status !== 'merged' && run.status !== 'abandoned') return run;
    }
  }
  const tasks = eventTasks(event);
  if (tasks.length) {
    for (const run of runs.values()) {
      if (run.status !== 'merged' && run.status !== 'abandoned' && tasks.some((taskId) => run.tasks.includes(taskId))) {
        return run;
      }
    }
  }
  return null;
}

function replayRuntimeEvents(events, options = {}) {
  const rootFilter = options.root ? normalizeRoot(options.root) : '';
  const runs = new Map();
  for (const event of events) {
    if (event.type === 'parse_error') continue;
    const eventRoot = event.project_root ? normalizeRoot(event.project_root) : '';
    if (rootFilter && eventRoot !== rootFilter) continue;

    if (event.type === 'run_claimed') {
      const runId = event.run_id;
      const existing = runId ? runs.get(runId) : null;
      const tasks = Array.from(new Set([...(existing?.tasks || []), ...eventTasks(event)].filter(Boolean)));
      runs.set(runId, {
        ...(existing || {}),
        id: runId,
        title: event.title || existing?.title || `${event.current_task || tasks[0] || runId} 运行态`,
        status: 'active',
        branch: event.branch || existing?.branch || '',
        owner: event.owner || event.agent || existing?.owner || '',
        agent: event.agent || existing?.agent || '',
        tasks,
        current_task: event.current_task || tasks[0] || existing?.current_task || '',
        started_at: existing?.started_at || event.started_at || event.event_date || '',
        updated_at: event.updated_at || event.event_date || '',
        intent: event.intent || existing?.intent || '',
        note: event.note || existing?.note || '',
        source: 'runtime',
      });
      continue;
    }

    if (event.type === 'run_released') {
      const existing = findRunByEvent(runs, event);
      if (!existing) continue;
      runs.set(existing.id, {
        ...existing,
        status: event.status || existing.status,
        updated_at: event.updated_at || event.event_date || existing.updated_at || '',
        ended_at: event.ended_at || event.event_date || existing.ended_at || '',
        pr: event.pr || existing.pr || '',
        merge_commit: event.merge_commit || existing.merge_commit || '',
        note: event.note || existing.note || '',
      });
    }
  }
  return Array.from(runs.values());
}

function runtimeRunsForRoot(projectRoot, options = {}) {
  return replayRuntimeEvents(loadRuntimeEvents(options), { root: projectRoot });
}

module.exports = {
  appendRuntimeEvent,
  defaultRuntimeStorePath,
  loadRuntimeEvents,
  normalizeRoot,
  replayRuntimeEvents,
  runtimeRunsForRoot,
  runtimeStorePath,
};
