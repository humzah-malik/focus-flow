const express = require('express');
const router = express.Router();
const Task = require('../models/task');

// Bring in the same `ensureAuthenticated` function from your app.js or create a small wrapper
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
}

// CREATE a new task
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    // We expect { "title": "Study math" } in the request body
    const newTask = new Task({
      title: req.body.title,
      user: req.user._id  // The logged-in user
    });
    await newTask.save();
    res.json({ success: true, task: newTask });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all tasks for the logged-in user
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a task (completed status, title, etc.)
router.put('/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findOneAndUpdate(
      { _id: taskId, user: req.user._id },
      { $set: req.body }, // e.g. { title: "New title", completed: true }
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found or not owned by user' });
    }
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task
router.delete('/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const deletedTask = await Task.findOneAndDelete({ _id: taskId, user: req.user._id });
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found or not owned by user' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
