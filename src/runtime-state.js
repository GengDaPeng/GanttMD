const { loadProject } = require('./project-loader.js');
const { validateProject } = require('./validator.js');

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
      sourceFile: checklist.source_file,
    };
  });
}

function loadWorktreeProjects(worktrees) {
  return worktrees
    .filter((worktree) => worktree.hasGanttmd)
    .map((worktree) => ({
      worktree,
      project: loadProject(worktree.root),
    }));
}

function buildRuntimeState(projectRoot, options = {}) {
  const mainProject = loadProject(projectRoot);
  const worktrees = options.worktrees || [];
  const worktreeProjects = options.worktreeProjects || loadWorktreeProjects(worktrees);
  const appearances = buildTaskAppearances(mainProject, worktreeProjects);
  const health = [
    ...validateProject(mainProject),
    ...worktreeProjects.flatMap((item) => validateProject(item.project).map((issue) => ({
      ...issue,
      worktree: item.worktree.root,
      branch: item.worktree.branch,
    }))),
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
    worktreeProjects: worktreeProjects.map((item) => ({
      worktree: item.worktree,
      taskStatus: Object.fromEntries(taskStatusMap(item.project)),
      checklistSummary: checklistSummary(item.project),
    })),
    health,
    conflicts: findTaskConflicts(appearances),
  };
}

module.exports = {
  buildRuntimeState,
  buildTaskAppearances,
  checklistSummary,
  findTaskConflicts,
  loadWorktreeProjects,
  taskStatusMap,
};
