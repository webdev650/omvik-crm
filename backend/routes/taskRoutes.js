const express = require('express');
const router = express.Router();
const { getMyTasks, createTask, completeTask } = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');

router.use(protect);

// GET  /api/tasks/me       — all tasks (pending + completed) for logged-in user
// POST /api/tasks          — create a new task
// PATCH /api/tasks/:id/complete — mark a task as completed

router.get('/me', getMyTasks);
router.post('/', createTask);
router.patch('/:id/complete', completeTask);

module.exports = router;
