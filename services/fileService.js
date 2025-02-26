const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const config = require("../config/config"); // Import the config
const File = require("../models/file"); // Import the File model

const uploadsDir = path.join(__dirname, "../", config.uploadsDir); // Use config.uploadsDir

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const downloadFile = async (fileUrl, fileName) => {
  const response = await fetch(fileUrl);
  const buffer = await response.buffer();
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const downloadPhoto = async (msg, bot) => {
  const chatId = msg.chat.id;
  try {
    // Get the largest photo size
    const photoSize = msg.photo[msg.photo.length - 1];
    const fileId = photoSize.file_id;

    // Get file path from Telegram
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${fileInfo.file_path}`; // Use config.telegramBotToken

    const fileName = `${Date.now()}-photo.jpg`;
    const filePath = await downloadFile(fileUrl, fileName); // Reuse downloadFile

    // Save file info to database
    const newFile = new File({
      chatId,
      originalName: "photo.jpg",
      fileName,
      filePath,
      fileType: "image/jpeg",
      fileSize: photoSize.file_size,
    });
    await newFile.save();

    return { originalName: "photo.jpg", fileName, filePath };
  } catch (error) {
    console.error("Error downloading or saving photo:", error);
    return null;
  }
};

const downloadDocument = async (msg, bot) => {
  const chatId = msg.chat.id;
  const doc = msg.document;

  try {
    // Get file path from Telegram
    const fileInfo = await bot.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${fileInfo.file_path}`;

    const fileName = `${Date.now()}-${doc.file_name}`;
    const filePath = await downloadFile(fileUrl, fileName);

    // Save file info to database
    const newFile = new File({
      chatId,
      originalName: doc.file_name,
      fileName,
      filePath,
      fileType: doc.mime_type,
      fileSize: doc.file_size,
    });
    await newFile.save();

    return { originalName: doc.file_name, fileName, filePath };
  } catch (error) {
    console.error("Error downloading or saving document:", error);
    return null;
  }
};

const downloadVideoLocally = async (msg, bot) => {
  const chatId = msg.chat.id;
  const video = msg.video;

  try {
    // Get file path from Telegram
    const fileInfo = await bot.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${fileInfo.file_path}`;

    const originalName = video.file_name || "video.mp4"; // Use original name if available
    const fileName = `${Date.now()}-${originalName}`; // Keep the extension

    const filePath = await downloadFile(fileUrl, fileName);

    // Save file info to database
    const newFile = new File({
      chatId,
      originalName: originalName,
      fileName,
      filePath,
      fileType: video.mime_type || "video/mp4",
      fileSize: video.file_size,
    });
    await newFile.save();

    return { originalName: originalName, fileName, filePath };
  } catch (error) {
    console.error("Error downloading or saving video:", error);
    return null;
  }
};

const deleteFile = async (file) => {
  // Delete the file from filesystem
  if (fs.existsSync(file.filePath)) {
    fs.unlinkSync(file.filePath);
  }

  // Delete from database
  await File.deleteOne({ _id: file._id });
};

module.exports = {
  downloadPhoto,
  downloadDocument,
  downloadVideoLocally,
  deleteFile,
};
