// models/reminder.js
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  text: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  cronId: String,
});

module.exports = mongoose.model("Reminder", reminderSchema);
