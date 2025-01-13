const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {type: String, required: true},
  completed: {type: Boolean, default: false},
  timeSpent: {type: Number, default: 0},  
  dueDate: { type: Date }, // Optional: Add due date for tasks
  priority: { type: Number, default: 4 }, // Optional: Todoist tasks have priority levels 1-4
  todoistId: { type: Number, unique: true, sparse: true },
  // Add fields like timeSpent if you want to store that, etc.
});

module.exports = mongoose.model('Task', taskSchema);