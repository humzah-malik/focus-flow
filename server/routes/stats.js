// server/routes/stats.js
const express = require('express');
const router = express.Router();
const FocusSession = require('../models/focusSession');
const Task = require('../models/task');

// Utility to ensure user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
}

/**
 * POST /stats/focus-session
 * Creates a new FocusSession with startTime = now.
 * Request body can include { taskId } if the user has an active task.
 */
router.post('/focus-session', ensureAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.body;

    const newSession = new FocusSession({
      user: req.user._id,
      startTime: new Date(),
    });

    // If user passed a valid taskId, set it
    if (taskId) {
      newSession.task = taskId;
    }

    await newSession.save();
    return res.json(newSession);
  } catch (err) {
    console.error('Error creating FocusSession:', err);
    return res.status(500).json({ error: 'Failed to create FocusSession' });
  }
});

/**
 * PUT /stats/focus-session/:id
 * Finalizes the session by setting endTime=now, calculating duration in seconds
 */
router.put('/focus-session/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await FocusSession.findOne({ _id: id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ error: 'FocusSession not found' });
    }

    // If it's already got an endTime, skip
    if (!session.endTime) {
      session.endTime = new Date();
      // Calculate duration in seconds
      session.duration = Math.floor(
        (session.endTime.getTime() - session.startTime.getTime()) / 1000
      );
      await session.save();
    }

    return res.json({ success: true, session });
  } catch (err) {
    console.error('Error finalizing FocusSession:', err);
    return res.status(500).json({ error: 'Failed to finalize FocusSession' });
  }
});

/**
 * GET /stats/weekly
 * Returns day-by-day usage (past 7 days) plus "top tasks" in that same time window
 */
// server/routes/stats.js

/**
 * GET /stats/weekly
 * Returns:
 *   - dailyData[]: day-by-day usage (past 7 days)
 *   - topTasks[]: up to 5 tasks with the most usage
 *   - tasksUsed[]: all tasks used in the last 7 days (sorted by time desc)
 */
router.get('/weekly', ensureAuthenticated, async (req, res) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
      // 1) Day-by-day aggregator
      const sessions = await FocusSession.aggregate([
        {
          $match: {
            user: req.user._id,
            startTime: { $gte: sevenDaysAgo },
            duration: { $gt: 0 }
          }
        },
        {
          $project: {
            // Convert startTime into a day string "YYYY-MM-DD"
            day: {
              $dateToString: { format: "%Y-%m-%d", date: "$startTime" }
            },
            task: 1,
            duration: 1
          }
        },
        {
          $group: {
            _id: "$day",
            totalDuration: { $sum: "$duration" },
            sessions: { $push: { task: "$task", duration: "$duration" } }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      // Now transform aggregator data => a list of day/duration
      const dailyData = sessions.map(d => ({
        date: d._id,               // "YYYY-MM-DD"
        totalDuration: d.totalDuration // sum of durations (seconds) for that day
      }));
  
      // 2) Top 5 Tasks aggregator
      const topTasksAgg = await FocusSession.aggregate([
        {
          $match: {
            user: req.user._id,
            startTime: { $gte: sevenDaysAgo },
            duration: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: "$task",
            totalDuration: { $sum: "$duration" }
          }
        },
        { $sort: { totalDuration: -1 } },
        { $limit: 5 }
      ]);
  
      // Convert aggregator => array of { title, duration }
      const topTasks = [];
      for (const t of topTasksAgg) {
        if (!t._id) {
          // Means no task was selected
          topTasks.push({ title: "No Task Selected", duration: t.totalDuration });
          continue;
        }
        const foundTask = await Task.findById(t._id);
        if (foundTask) {
          topTasks.push({
            title: foundTask.title,
            duration: t.totalDuration
          });
        }
      }
  
      // 3) All tasks used aggregator (no limit)
      const tasksUsedAgg = await FocusSession.aggregate([
        {
          $match: {
            user: req.user._id,
            startTime: { $gte: sevenDaysAgo },
            duration: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: "$task",
            totalDuration: { $sum: "$duration" }
          }
        },
        { $sort: { totalDuration: -1 } }
      ]);
  
      // Convert aggregator => array of { title, duration }
      const tasksUsed = [];
      for (const t of tasksUsedAgg) {
        if (!t._id) {
          tasksUsed.push({ title: "No Task Selected", duration: t.totalDuration });
          continue;
        }
        const foundTask = await Task.findById(t._id);
        if (foundTask) {
          tasksUsed.push({
            title: foundTask.title,
            duration: t.totalDuration
          });
        }
      }
  
      return res.json({
        dailyData, // e.g. [ { date: "YYYY-MM-DD", totalDuration: <seconds> }, ...]
        topTasks,  // e.g. [ { title: "X", duration: <sec>}, ... up to 5 ]
        tasksUsed  // e.g. [ { title: "X", duration: <sec>}, ... for all tasks ]
      });
    } catch (err) {
      console.error('Error getting weekly stats:', err);
      return res.status(500).json({ error: 'Failed to get stats' });
    }
});  

module.exports = router;
