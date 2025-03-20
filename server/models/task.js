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
  dueDate: { type: Date }, // Optional
  priority: { type: Number, default: 4 }, // Optional; Todoist tasks have priority levels 1-4
  todoistId: { type: Number, unique: true, sparse: true },
  projectName: { type: String, default: '' }
});

module.exports = mongoose.model('Task', taskSchema);
