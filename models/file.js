// models/file.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  originalName: String,
  fileName: String,
  filePath: String,
  fileType: String,
  fileSize: Number,
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", fileSchema);
