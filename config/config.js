// config/config.js
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  mongoURI:
    process.env.MONGODB_URI ||
    "mongodb://root:abc123@localhost:27017/telegramBot?authSource=admin",
  port: process.env.PORT || 3000,
  uploadsDir: "uploads/", // Define the uploads directory here
};
