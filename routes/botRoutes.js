// routes/botRoutes.js
const taskController = require("../controllers/taskController");
const reminderController = require("../controllers/reminderController");
const noteController = require("../controllers/noteController");
const fileController = require("../controllers/fileController");
const { handleText, handleHelp } = require("../controllers/botController");
const aiController = require("../controllers/aiController");

module.exports = (bot) => {
  // Start command
  bot.onText(/\/start/, (msg) => handleText(msg, bot));

  // Help command
  bot.onText(/\/help/, (msg) => handleHelp(msg, bot));

  // AI response command
  bot.onText(/\/ai (.+)/, (msg, match) =>
    aiController.handleAICommand(msg, match, bot)
  );

  // Handle /ai with no parameters
  bot.onText(/^\/ai$/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "Please provide a prompt after /ai command. Example: /ai Explain how AI works"
    );
  });

  // Task commands
  bot.onText(/\/task (.+)/, (msg, match) =>
    taskController.createTask(msg, match, bot)
  );
  bot.onText(/\/tasks/, (msg) => taskController.listTasks(msg, bot));
  bot.onText(/\/complete (\d+)/, (msg, match) =>
    taskController.completeTask(msg, match, bot)
  );
  bot.onText(/\/delete_task (\d+)/, (msg, match) =>
    taskController.deleteTask(msg, match, bot)
  );

  // Reminder commands
  bot.onText(/\/reminder (.+?) (.+)/, (msg, match) =>
    reminderController.createReminder(msg, match, bot)
  );
  bot.onText(/\/reminders/, (msg) =>
    reminderController.listReminders(msg, bot)
  );
  bot.onText(/\/delete_reminder (\d+)/, (msg, match) =>
    reminderController.deleteReminder(msg, match, bot)
  );

  // Note commands
  bot.onText(/\/note (.+?) (.+)/, (msg, match) =>
    noteController.createNote(msg, match, bot)
  );
  bot.onText(/\/notes/, (msg) => noteController.listNotes(msg, bot));
  bot.onText(/\/get_note (\d+)/, (msg, match) =>
    noteController.getNote(msg, match, bot)
  );
  bot.onText(/\/delete_note (\d+)/, (msg, match) =>
    noteController.deleteNote(msg, match, bot)
  );

  // File commands
  bot.onText(/\/files/, (msg) => fileController.listFiles(msg, bot));
  // Photo
  bot.on("photo", (msg) => fileController.handlePhoto(msg, bot));
  // document
  bot.on("document", (msg) => fileController.handleDocument(msg, bot));
  // video
  bot.on("video", (msg) => fileController.handleVideo(msg, bot));

  // Specific file type commands
  bot.onText(/\/photos/, (msg) => fileController.getPhotos(msg, bot));
  bot.onText(/\/videos/, (msg) => fileController.getVideos(msg, bot));

  // Send file command
  bot.onText(/\/send_file (\d+)/, (msg, match) =>
    fileController.sendFileToUser(msg, match, bot)
  );
  // download command
  bot.onText(/\/download (.+)/, (msg, match) =>
    fileController.handleDownload(msg, match, bot)
  );

  // Handle regular messages
  bot.on("message", (msg) => {
    const chatId = msg.chat.id;

    // Only respond to text messages that aren't commands
    if (msg.text && !msg.text.startsWith("/")) {
      bot.sendMessage(
        chatId,
        `I'm here to help! Use /help to see what I can do.`
      );
    }
  });

  // Error handler
  bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
  });
};
