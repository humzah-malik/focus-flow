// server/models/focusSession.js
const mongoose = require('mongoose');

// Each record = one Timer run from startTime to endTime
const focusSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    // not required, because user might not pick a task
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0 // store in seconds
  }
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
