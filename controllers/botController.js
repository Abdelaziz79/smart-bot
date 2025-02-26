const userController = require("../controllers/userController");

const handleText = async (msg, bot) => {
  const chatId = msg.chat.id;
  await userController.registerUser(msg, bot);

  bot.sendMessage(
    chatId,
    "👋 Welcome to your personal assistant bot! Here are the commands I understand:\n\n" +
      "/help - Show all available commands\n" +
      "/task [text] - Create a new task\n" +
      "/tasks - List all your tasks\n" +
      "/complete [task number] - Mark a task as completed\n" +
      "/delete_task [task number] - Delete a task\n" +
      "/reminder [time] [message] - Set a reminder (e.g. /reminder 30m Buy milk)\n" +
      "/reminders - List all your reminders\n" +
      "/delete_reminder [reminder number] - Delete a reminder\n" +
      "/note [title] [content] - Save a note\n" +
      "/notes - List all your notes\n" +
      "/get_note [note number] - Retrieve a specific note\n" +
      "/delete_note [note number] - Delete a note\n" +
      "/files - List all your files\n" +
      "/photos - List all your photos\n" + // Added
      "/videos - List all your videos\n" + // Added
      "/send_file [file number] - Send a file to the user\n" +
      "/delete_file [file number] - Delete a file\n" +
      "/download [URL] - Download a video from URL\n" +
      "/ai [prompt] - Generate AI response\n\n" +
      "You can also send me images, documents, or audio files, and I'll store them for you!"
  );
};

const handleHelp = (msg, bot) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "📚 Here are all available commands:\n\n" +
      "🔸 Tasks Management:\n" +
      "/task [text] - Create a new task\n" +
      "/tasks - List all your tasks\n" +
      "/complete [task number] - Mark a task as completed\n" +
      "/delete_task [task number] - Delete a task\n\n" +
      "🔸 Reminders:\n" +
      "/reminder [time] [message] - Set a reminder\n" +
      "  Time format examples: 30m, 2h, 1d, or specific like 18:30\n" +
      "/reminders - List all your reminders\n" +
      "/delete_reminder [reminder number] - Delete a reminder\n\n" +
      "🔸 Notes:\n" +
      "/note [title] [content] - Save a note\n" +
      "/notes - List all your notes\n" +
      "/get_note [note number] - Retrieve a specific note\n" +
      "/delete_note [note number] - Delete a note\n\n" +
      "🔸 Files:\n" +
      "Just send me any file to store it\n" +
      "/files - List all your files\n" +
      "/photos - List all your photos\n" + // Added
      "/videos - List all your videos\n" + // Added
      "/send_file [file number] - Send a file to the user\n" +
      "/delete_file [file number] - Delete a file\n\n" +
      "🔸 Downloader:\n" +
      "/download [URL] - Download a video from URL\n" +
      "🔸 Ai:\n" +
      "/ai [prompt] - Generate AI response\n" +
      "🔸 Other:\n" +
      "/start - Start the bot\n" +
      "/help - Show this help message"
  );
};

module.exports = {
  handleText,
  handleHelp,
};
