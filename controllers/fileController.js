const File = require("../models/file");
const fileService = require("../services/fileService");
const fs = require("fs"); // Required for sending files
const path = require("path"); // Required for constructing file paths

const {
  downloadVideo,
  detectPlatform,
  getVideoInfo,
} = require("../services/videoDownloader");

/**
 * Handle /download command to download videos
 * @param {object} msg - Telegram message object
 * @param {object} match - Regex match result
 * @param {object} bot - Telegram bot instance
 */
async function handleDownload(msg, match, bot) {
  const chatId = msg.chat.id;
  const url = match[1];

  try {
    // Send initial status message
    const statusMsg = await bot.sendMessage(
      chatId,
      `🔍 Analyzing link from ${detectPlatform(url)}...`
    );

    // Get video info first
    try {
      const videoInfo = await getVideoInfo(url);
      await bot.editMessageText(
        `📹 Found: ${videoInfo.title}\n⏱️ Duration: ${videoInfo.duration}\n💾 Estimated size: ${videoInfo.filesize}\n\n🔄 Downloading...`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        }
      );
    } catch (error) {
      // Continue even if getting info fails
      await bot.editMessageText(
        `🔄 Starting download from ${detectPlatform(url)}...`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        }
      );
    }

    // Download the video
    const filePath = await downloadVideo(url);

    // Check file size for Telegram limits (50MB)
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);

    if (fileSizeMB > 50) {
      await bot.editMessageText(
        `⚠️ Video downloaded but it's too large (${fileSizeMB.toFixed(
          2
        )}MB) for Telegram (50MB limit).\n\nThe file has been saved on the server.`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
        }
      );
      return;
    }

    // Send the video file
    await bot.sendVideo(chatId, fs.createReadStream(filePath), {
      caption: `✅ Downloaded from: ${url}`,
    });

    // Update status message
    await bot.editMessageText("✅ Download complete!", {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  } catch (error) {
    console.error("Download error:", error);
    bot.sendMessage(chatId, `❌ Failed to download: ${error.message}`);
  }
}

const listFiles = async (msg, bot) => {
  const chatId = msg.chat.id;
  try {
    const files = await File.find({ chatId }).sort({ uploadedAt: -1 });
    if (files.length === 0) {
      return bot.sendMessage(
        chatId,
        "You don't have any files yet. Send me a photo, video, or document to store it."
      );
    }

    let message = "📁 Your files:\n\n";
    let fileFound = false; // Flag to track if any existing files are found

    files.forEach((file, index) => {
      // Construct absolute file path using path.resolve
      const absoluteFilePath = path.resolve(file.filePath);

      if (fs.existsSync(absoluteFilePath)) {
        fileFound = true; // Set the flag to true if at least one file exists
        const fileSize = (file.fileSize / 1024).toFixed(2) + " KB";
        message += `${index + 1}. ${
          file.originalName
        } (${fileSize}) - ${new Date(file.uploadedAt).toLocaleString()}\n`;
      } else {
        console.warn(
          `File not found (DB entry present, but file missing): ${absoluteFilePath}`
        );
        message += `${index + 1}. ${
          file.originalName
        } (FILE MISSING) - ${new Date(file.uploadedAt).toLocaleString()}\n`;
      }
    });

    if (fileFound) {
      bot.sendMessage(chatId, message);
    } else {
      bot.sendMessage(chatId, "❌ No stored files were found on the server.");
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    bot.sendMessage(chatId, "❌ Error fetching files. Please try again.");
  }
};

const deleteFile = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const fileIndex = parseInt(match[1]) - 1;

  try {
    const files = await File.find({ chatId }).sort({ uploadedAt: -1 });

    if (fileIndex < 0 || fileIndex >= files.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid file number. Use /files to see your files."
      );
    }

    const file = files[fileIndex];
    await fileService.deleteFile(file);

    bot.sendMessage(chatId, `🗑️ File "${file.originalName}" deleted.`);
  } catch (error) {
    console.error("Error deleting file:", error);
    bot.sendMessage(chatId, "❌ Error deleting file. Please try again.");
  }
};

const handlePhoto = async (msg, bot) => {
  const chatId = msg.chat.id;
  try {
    const fileData = await fileService.downloadPhoto(msg, bot); // Use fileService

    if (fileData) {
      bot.sendMessage(chatId, "📸 Photo saved successfully!");
    } else {
      bot.sendMessage(chatId, "❌ Error saving photo. Please try again.");
    }
  } catch (error) {
    console.error("Error saving photo:", error);
    bot.sendMessage(chatId, "❌ Error saving photo. Please try again.");
  }
};

const handleDocument = async (msg, bot) => {
  const chatId = msg.chat.id;
  try {
    const fileData = await fileService.downloadDocument(msg, bot);

    if (fileData) {
      bot.sendMessage(
        chatId,
        `📄 File "${fileData.originalName}" saved successfully!`
      );
    } else {
      bot.sendMessage(chatId, "❌ Error saving document. Please try again.");
    }
  } catch (error) {
    console.error("Error saving document:", error);
    bot.sendMessage(chatId, "❌ Error saving document. Please try again.");
  }
};

const handleVideo = async (msg, bot) => {
  const chatId = msg.chat.id;
  try {
    const fileData = await fileService.downloadVideo(msg, bot);

    if (fileData) {
      bot.sendMessage(
        chatId,
        `🎥 Video "${fileData.originalName}" saved successfully!`
      );
    } else {
      bot.sendMessage(chatId, "❌ Error saving video. Please try again.");
    }
  } catch (error) {
    console.error("Error saving video:", error);
    bot.sendMessage(chatId, "❌ Error saving video. Please try again.");
  }
};

const getFilesByType = async (msg, fileType, bot) => {
  const chatId = msg.chat.id;

  try {
    const files = await File.find({ chatId, fileType }).sort({
      uploadedAt: -1,
    });

    if (files.length === 0) {
      return bot.sendMessage(
        chatId,
        `You don't have any ${fileType} files yet.`
      );
    }

    let message = `📁 Your ${fileType} files:\n\n`;
    files.forEach((file, index) => {
      const fileSize = (file.fileSize / 1024).toFixed(2) + " KB";
      message += `${index + 1}. ${file.originalName} (${fileSize}) - ${new Date(
        file.uploadedAt
      ).toLocaleString()}\n`;
    });

    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error(`Error fetching ${fileType} files:`, error);
    bot.sendMessage(
      chatId,
      `❌ Error fetching ${fileType} files. Please try again.`
    );
  }
};

const getPhotos = async (msg, bot) => {
  await getFilesByType(msg, "image/jpeg", bot); // Assuming all photos are JPEG
};

const getVideos = async (msg, bot) => {
  await getFilesByType(msg, "video/mp4", bot); // Assuming all videos are MP4. Adapt if needed
};

const sendFileToUser = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const fileIndex = parseInt(match[1]) - 1;

  try {
    const files = await File.find({ chatId }).sort({ uploadedAt: -1 });

    if (fileIndex < 0 || fileIndex >= files.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid file number. Use /files to see your files."
      );
    }

    const file = files[fileIndex];
    // Check if the file exists
    if (!fs.existsSync(file.filePath)) {
      console.error(`File not found: ${file.filePath}`);
      return bot.sendMessage(chatId, "❌ File not found on the server.");
    }

    // Determine the file type for sending
    let sendMethod;
    if (file.fileType.startsWith("image")) {
      sendMethod = "sendPhoto";
    } else if (file.fileType.startsWith("video")) {
      sendMethod = "sendVideo";
    } else {
      sendMethod = "sendDocument";
    }

    // Send the file
    bot[sendMethod](chatId, file.filePath, {
      caption: `Here's your file: ${file.originalName}`,
    })
      .then(() => {
        console.log(`File "${file.originalName}" sent to chat ${chatId}`);
      })
      .catch((error) => {
        console.error("Error sending file:", error);
        bot.sendMessage(chatId, "❌ Error sending file. Please try again.");
      });
  } catch (error) {
    console.error("Error retrieving or sending file:", error);
    bot.sendMessage(
      chatId,
      "❌ Error retrieving or sending file. Please try again."
    );
  }
};

module.exports = {
  listFiles,
  deleteFile,
  handlePhoto,
  handleDocument,
  handleVideo,
  getPhotos,
  getVideos,
  sendFileToUser,
  handleDownload,
};
