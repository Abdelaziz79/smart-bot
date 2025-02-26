// config/config.js
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  mongoURI: process.env.MONGODB_URI || "mongodb://localhost:27017/telegramBot",
  port: process.env.PORT || 3000,
  uploadsDir: "uploads/", // Define the uploads directory here
};
