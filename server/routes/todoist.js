// server/routes/todoist.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const Task = require('../models/task');

// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login.html');
}

// 1) Start OAuth
router.get('/todoist/connect', ensureAuthenticated, (req, res) => {
  const clientId = process.env.TODOIST_CLIENT_ID;
  const redirectURI = 'http://localhost:3000/auth/todoist/callback';

  const authURL = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=data:read_write&state=xyz&redirect_uri=${encodeURIComponent(redirectURI)}`;
  res.redirect(authURL);
});

// 2) Callback to exchange code
router.get('/auth/todoist/callback', ensureAuthenticated, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code returned from Todoist');

  try {
    const response = await axios.post('https://todoist.com/oauth/access_token', {
      client_id: process.env.TODOIST_CLIENT_ID,
      client_secret: process.env.TODOIST_CLIENT_SECRET,
      code,
      redirect_uri: process.env.TODOIST_REDIRECT_URI
    });

    const accessToken = response.data.access_token;
    console.log('Received Todoist access token:', accessToken);

    req.user.todoistToken = accessToken;

    console.log('Saving user with Todoist token:', req.user);

    await req.user.save();

    console.log('Token saved successfully for user:', req.user);

    //res.send('Todoist connected successfully! <a href="/index.html">Go back</a>');
    // near the end of your GET /auth/todoist/callback 
    res.redirect('/index.html');
  } catch (err) {
    console.error('Error exchanging code for token:', err);
    res.status(500).send('Failed to connect to Todoist');
  }
});

// 3) Fetch and Group Todoist Tasks by Project
router.get('/todoist/tasks', ensureAuthenticated, async (req, res) => {
  console.log('Fetching Todoist tasks for user:', req.user);
  console.log('User Todoist Token:', req.user.todoistToken);
  if (!req.user.todoistToken) {
    return res.status(400).json({ message: 'User is not connected to Todoist.' });
  }

  try {
    // Fetch Projects
    const projectsResponse = await axios.get('https://api.todoist.com/rest/v2/projects', {
      headers: { Authorization: `Bearer ${req.user.todoistToken}` },
    });
    const projects = projectsResponse.data; // Array of projects

    // Fetch Tasks
    const tasksResponse = await axios.get('https://api.todoist.com/rest/v2/tasks', {
      headers: { Authorization: `Bearer ${req.user.todoistToken}` },
    });
    const tasks = tasksResponse.data; // Array of tasks

    // Create a map from project_id to project name
    const projectMap = {};
    projects.forEach(project => {
      projectMap[project.id] = project.name;
    });

    // Group tasks by project
    const groupedTasks = {};
    tasks.forEach(task => {
      const projectName = projectMap[task.project_id] || 'No Project';
      if (!groupedTasks[projectName]) {
        groupedTasks[projectName] = [];
      }
      groupedTasks[projectName].push(task);
    });

    // Convert to array format
    const responseData = Object.keys(groupedTasks).map(projectName => ({
      projectName,
      tasks: groupedTasks[projectName],
    }));

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching Todoist tasks:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch Todoist tasks' });
  }
});

// 4) Import Tasks from Todoist
router.post('/todoist/import', ensureAuthenticated, async (req, res) => {
  const { tasks } = req.body; // Expect an array of selected task objects with { id, title }
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ message: 'Invalid task selection' });
  }

  try {
    const importedTasks = [];
    for (const task of tasks) {
      // Ensure task.id is a number
      const todoistTaskId = Number(task.id);
      if (isNaN(todoistTaskId)) {
        console.warn(`Invalid Todoist task ID: ${task.id}. Skipping task.`);
        continue; // Skip invalid task IDs
      }

      // Check if the task already exists to prevent duplicates
      const existingTask = await Task.findOne({ todoistId: todoistTaskId, user: req.user._id });
      if (existingTask) {
        console.log(`Task with Todoist ID ${todoistTaskId} already exists. Skipping.`);
        continue;
      }

      const newTask = new Task({
        user: req.user._id,
        title: task.title,
        completed: false,
        timeSpent: 0,
        projectName: task.projectName,
        todoistId: todoistTaskId, // Store Todoist Task ID
      });
      await newTask.save();
      importedTasks.push(newTask);
    }
    res.json({ importedTasks });
  } catch (err) {
    console.error('Error saving tasks to database:', err);
    res.status(500).json({ message: 'Failed to save tasks' });
  }
});


// 5) Complete Task on Todoist
router.post('/todoist/complete', ensureAuthenticated, async (req, res) => {
  const { taskId } = req.body; // Expect todoistId (number)
  
  // Validate taskId
  if (!taskId || isNaN(taskId)) {
    return res.status(400).json({ message: 'Valid Todoist Task ID is required' });
  }

  try {
    // 1. Mark the task as completed on Todoist
    await axios.post(
      `https://api.todoist.com/rest/v2/tasks/${taskId}/close`,
      null, // No body required
      {
        headers: { Authorization: `Bearer ${req.user.todoistToken}` },
      }
    );

    // 2. Update the task in the application's database to mark it as completed
    const updatedTask = await Task.findOneAndUpdate(
      { todoistId: taskId, user: req.user._id },
      { completed: true },
      { new: true } // Return the updated document
    );
    console.log(`Task with Todoist ID ${taskId} marked as completed on Todoist.`);
    // 3. Handle case where task is not found in the database
    if (!updatedTask) {
      console.warn(`Task with Todoist ID ${taskId} not found in the database for user ${req.user._id}.`);
      return res.status(404).json({ message: 'Task not found in your database.' });
    }

    console.log(`Task with Todoist ID ${taskId} marked as completed in the database.`);
    res.json({ success: true, message: 'Task completed on Todoist and updated in the database.', task: updatedTask });
  } catch (err) {
    console.error('Error completing task on Todoist:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to complete task on Todoist.' });
  }
});

// 6) Delete Task Route
router.delete('/todoist/delete', ensureAuthenticated, async (req, res) => {
  const { taskId } = req.body; // Expect todoistId (number)
  if (!taskId || isNaN(taskId)) {
    return res.status(400).json({ message: 'Valid Todoist Task ID is required' });
  }

  try {
    // Delete the task on Todoist
    await axios.delete(`https://api.todoist.com/rest/v2/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${req.user.todoistToken}` },
    });

    // Remove the task from the application's database
    const deletedTask = await Task.findOneAndDelete({ todoistId: taskId, user: req.user._id });

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found in your database' });
    }

    res.json({ success: true, message: 'Task deleted from Todoist', task: deletedTask });
  } catch (err) {
    console.error('Error deleting task from Todoist:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to delete task from Todoist' });
  }
});


module.exports = router;
