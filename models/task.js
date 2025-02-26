// models/task.js
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
