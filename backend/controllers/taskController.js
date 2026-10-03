const Task = require('../models/Task');

// @desc    Get all pending tasks for the logged-in user
// @route   GET /api/tasks/me
// @access  Private
const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ owner: req.user._id })
      .populate('relatedOpportunity', 'leadCode stage')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private — any authenticated user; admins/team_leads can assign to others
const createTask = async (req, res, next) => {
  try {
    const { title, dueDate, relatedOpportunity, owner } = req.body;
    const callerRole = req.user.role;

    const PRIVILEGED_ROLES = ['super_admin', 'admin', 'director', 'team_lead'];

    // Determine the actual owner:
    // - Privileged roles can pass an explicit `owner` field to assign to someone else.
    // - Non-privileged users always own their own tasks.
    let resolvedOwner = req.user._id;
    if (owner && PRIVILEGED_ROLES.includes(callerRole)) {
      resolvedOwner = owner;
    }

    const task = await Task.create({
      title,
      dueDate: dueDate || null,
      relatedOpportunity: relatedOpportunity || null,
      owner: resolvedOwner,
      createdBy: req.user._id
    });

    const populated = await task.populate([
      { path: 'relatedOpportunity', select: 'leadCode stage' },
      { path: 'createdBy', select: 'name' }
    ]);

    res.status(201).json({ success: true, message: 'Task created.', task: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a task as completed
// @route   PATCH /api/tasks/:id/complete
// @access  Private — only the task owner (or privileged admin) can complete
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const PRIVILEGED_ROLES = ['super_admin', 'admin', 'director', 'team_lead'];
    const isOwner = task.owner.toString() === req.user._id.toString();
    const isPrivileged = PRIVILEGED_ROLES.includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Forbidden: you can only complete your own tasks' });
    }

    task.status = 'completed';
    await task.save();

    res.json({ success: true, message: 'Task marked as completed.', task });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyTasks, createTask, completeTask };
