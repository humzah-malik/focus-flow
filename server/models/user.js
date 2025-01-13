const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  todoistToken: { type: String },
  settings: { // New field for user settings
    workDuration: { type: Number, default: 25 }, // in minutes
    shortBreak: { type: Number, default: 5 },    // in minutes
    longBreak: { type: Number, default: 15 },    // in minutes
    sessionsBeforeLongBreak: { type: Number, default: 4 },
    autoStartBreaks: { type: Boolean, default: false },
    autoStartTimer: { type: Boolean, default: false },
  },
});

// Pre-save middleware to hash the password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    console.log('Comparing password:', candidatePassword, this.password); // Log password comparison
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
