const { loadProject } = require('./project-loader.js');
const { validateProject } = require('./validator.js');
const path = require('node:path');

function taskStatusMap(project) {
  const map = new Map();
  for (const task of project.tasks) {
    if (task.id) map.set(task.id, task.status);
  }
  return map;
}

function buildTaskAppearances(mainProject, worktreeProjects) {
  const appearances = new Map();

  function add(source, project) {
    for (const task of project.tasks) {
      if (!task.id) continue;
      if (!appearances.has(task.id)) appearances.set(task.id, []);
      appearances.get(task.id).push({
        source,
        status: task.status,
        title: task.title,
        sourceFile: task.source_file,
      });
    }
  }

  add({ type: 'main', root: mainProject.root, branch: 'main' }, mainProject);
  for (const item of worktreeProjects) {
    add({ type: 'worktree', root: item.worktree.root, branch: item.worktree.branch }, item.project);
  }

  return appearances;
}

function findTaskConflicts(appearances) {
  const conflicts = [];
  for (const [taskId, entries] of appearances.entries()) {
    const statuses = new Set(entries.map((entry) => entry.status));
    if (statuses.size <= 1) continue;
    conflicts.push({
      type: 'task_status',
      taskId,
      entries,
    });
  }
  return conflicts;
}

function checklistSummary(project) {
  return project.checklists.map((checklist) => {
    const total = checklist.items.length;
    const done = checklist.items.filter((item) => item.status === 'done' || item.status === 'skipped').length;
    return {
      taskId: checklist.task_id,
      total,
      done,
      open: total - done,
      items: checklist.items,
      sourceFile: checklist.source_file,
    };
  });
}

function claimedTaskIds(project) {
  const ids = new Set();
  for (const run of project.runs) {
    for (const taskId of run.tasks || []) {
      if (taskId) ids.add(taskId);
    }
    if (run.current_task) ids.add(run.current_task);
  }
  for (const checklist of project.checklists) {
    if (checklist.task_id) ids.add(checklist.task_id);
  }
  return ids;
}

function loadWorktreeProjects(worktrees) {
  return worktrees
    .filter((worktree) => worktree.hasGanttmd)
    .map((worktree) => ({
      worktree,
      project: loadProject(worktree.root),
    }));
}

function checkWorktreePolicy(project, worktree, mainTaskIds) {
  const issues = [];

  for (const task of project.tasks) {
    issues.push({
      level: 'warn',
      id: task.id || '(missing task id)',
      message: 'worktree 不得写 ganttmd-task；请在主分支创建任务，在 worktree 只用 runs.md 领取任务并维护 checklist',
      sourceFile: task.source_file,
      field: 'ganttmd-task',
      worktree: worktree.root,
      branch: worktree.branch,
    });
  }

  for (const run of project.runs) {
    for (const taskId of run.tasks || []) {
      if (mainTaskIds.has(taskId)) continue;
      issues.push({
        level: 'warn',
        id: run.id || '(missing run id)',
        message: 'worktree run 只能引用主分支已存在任务：' + taskId,
        sourceFile: run.source_file,
        field: 'tasks',
        worktree: worktree.root,
        branch: worktree.branch,
      });
    }
  }

  for (const checklist of project.checklists) {
    if (mainTaskIds.has(checklist.task_id)) continue;
    issues.push({
      level: 'warn',
      id: checklist.task_id || '(missing task_id)',
      message: 'worktree checklist 只能挂到主分支已存在任务',
      sourceFile: checklist.source_file,
      field: 'task_id',
      worktree: worktree.root,
      branch: worktree.branch,
    });
  }

  for (const followup of project.followups) {
    if (followup.status === 'open') continue;
    issues.push({
      level: 'warn',
      id: followup.id || '(missing followup id)',
      message: 'worktree follow-up 只能保持 open；接受、转任务、关闭必须由主控在主分支处理',
      sourceFile: followup.source_file,
      field: 'status',
      worktree: worktree.root,
      branch: worktree.branch,
    });
  }

  return issues;
}

function buildRuntimeState(projectRoot, options = {}) {
  const mainProject = loadProject(projectRoot);
  const worktrees = options.worktrees || [];
  const loadedWorktreeProjects = options.worktreeProjects || loadWorktreeProjects(worktrees);
  const mainRoot = path.resolve(mainProject.root);
  const worktreeProjects = loadedWorktreeProjects.filter((item) =>
    item.worktree?.root && path.resolve(item.worktree.root) !== mainRoot
  );
  const appearances = buildTaskAppearances(mainProject, worktreeProjects);
  const mainTaskIds = new Set(mainProject.tasks.map((task) => task.id).filter(Boolean));
  const health = [
    ...validateProject(mainProject),
    ...worktreeProjects.flatMap((item) => validateProject(item.project, {
      allowTasklessProject: true,
      externalTaskIds: mainTaskIds,
    }).map((issue) => ({
      ...issue,
      worktree: item.worktree.root,
      branch: item.worktree.branch,
    }))),
    ...worktreeProjects.flatMap((item) => checkWorktreePolicy(item.project, item.worktree, mainTaskIds)),
  ];

  return {
    project: mainProject.config.project,
    config: mainProject.config,
    source: {
      projectId: mainProject.config.project.id || mainProject.config.project.name || '',
      root: mainProject.root,
      servedAt: new Date().toISOString(),
    },
    main: {
      root: mainProject.root,
      ganttRoot: mainProject.ganttRoot,
      taskCount: mainProject.tasks.length,
      followupCount: mainProject.followups.length,
      runCount: mainProject.runs.length,
      checklistCount: mainProject.checklists.length,
    },
    worktrees,
    runs: mainProject.runs,
    tasks: mainProject.tasks,
    followups: mainProject.followups,
    checklists: checklistSummary(mainProject),
    worktreeProjects: worktreeProjects.map((item) => {
      const claimedIds = claimedTaskIds(item.project);
      return {
        worktree: item.worktree,
        tasks: item.project.tasks.filter((task) => claimedIds.has(task.id)).map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          owner: task.owner,
          agent: task.agent,
          track: task.track,
          domain: task.domain,
          milestone: task.milestone,
          priority: task.priority,
          sourceFile: task.source_file,
        })),
        runs: item.project.runs,
        taskStatus: Object.fromEntries(taskStatusMap(item.project)),
        checklistSummary: checklistSummary(item.project),
      };
    }),
    health,
    conflicts: findTaskConflicts(appearances),
  };
}

module.exports = {
  buildRuntimeState,
  buildTaskAppearances,
  checkWorktreePolicy,
  checklistSummary,
  claimedTaskIds,
  findTaskConflicts,
  loadWorktreeProjects,
  taskStatusMap,
};
