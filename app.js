// app.js
const express = require("express");
const mongoose = require("mongoose");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const config = require("./config/config"); // Import configuration
const botRoutes = require("./routes/botRoutes");
const reminderService = require("./services/reminderService");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(config.mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Telegram Bot initialization
const bot = new TelegramBot(config.telegramBotToken, { polling: true });

// Initialize bot routes
botRoutes(bot);

// Load active reminders on startup
const loadReminders = async () => {
  try {
    await reminderService.loadReminders(bot);
  } catch (error) {
    console.error("Error loading reminders:", error);
  }
};

// Clean up completed reminders cron job (runs daily at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    // Delete reminders that are completed and older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const result = await Reminder.deleteMany({
      completed: true,
      scheduledTime: { $lt: cutoffDate },
    });

    console.log(`Cleaned up ${result.deletedCount} old reminders`);
  } catch (error) {
    console.error("Error cleaning up reminders:", error);
  }
});

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Bot is running...");
  loadReminders(); // Load reminders after bot is running
});
