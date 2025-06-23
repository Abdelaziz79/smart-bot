# Multi-Purpose Telegram Bot

A powerful and feature-rich Telegram bot built with Node.js that serves as a personal assistant for task management, reminders, notes, file storage, and AI conversation capabilities.

## 🚀 Features

### ✅ Task Management

- Create a task: `/task [text]`
- List all tasks: `/tasks`
- Mark a task as completed: `/complete [task number]`
- Delete a task: `/delete_task [task number]`

### ⏰ Reminders

- Set a reminder: `/reminder [time] [message]`
  - Supported formats:
    - Relative time: `30m`, `2h`, `1d`
    - Specific time: `18:30`
- List active reminders: `/reminders`
- Delete a reminder: `/delete_reminder [reminder number]`

### 📝 Notes Management

- Create a note: `/note [title] [content]`
- List all notes: `/notes`
- Retrieve a specific note: `/get_note [note number]`
- Delete a note: `/delete_note [note number]`

### 📁 File Management

- Upload and store photos, videos, and documents
- List all files: `/files`
- List only photos: `/photos`
- List only videos: `/videos`
- Retrieve a file: `/send_file [file number]`

### 🌐 Web Scraper

- Scrape content from a URL: `/scrape [URL]`

### 🎬 Video Downloader

- Download videos from multiple platforms: `/download [URL]`
- Supported platforms:
  - YouTube
  - TikTok
  - Instagram
  - Facebook
  - Twitter/X

### 🤖 AI Integration

- Generate AI responses: `/ai [prompt]`
- Engage in a natural conversation powered by **Google Gemini AI**

---

## 📥 Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Abdelaziz79/smart-bot
   cd smart-bot
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Create a `.env` file** and add the following variables:
   ```ini
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. **Create required directories:**
   ```sh
   mkdir uploads downloads temp
   ```

---

## 🛠️ Environment Setup

### Prerequisites

- **Node.js** (14+ recommended)
- **MongoDB** (for storing tasks, reminders, and notes)
- **FFmpeg** (for video processing)
- **Python** (required by `youtube-dl-exec` for some operations)

### Required API Keys

- **Telegram Bot Token** (Get from [@BotFather](https://t.me/BotFather))
- **Google Gemini API Key** (For AI-powered interactions)
- **MongoDB Connection String** (For database operations)

---

## 🔧 Usage

1. **Start the bot:**
   ```sh
   node app.js
   ```
2. **Interact with the bot on Telegram:**
   - Start a conversation: `/start`
   - View available commands: `/help`

---

## 📂 Project Structure

```
├── app.js              # Main application file
├── config/
│   └── config.js       # Configuration settings
├── controllers/        # Command handlers
├── models/            # Database models
├── routes/            # Bot route definitions
├── services/          # Business logic
├── storage/           # For session and request queues
├── temp/              # For temporary files
├── uploads/           # File storage for user uploads
└── downloads/         # For downloaded videos
```

---

## ⚙️ Technical Details

### 📦 Dependencies

- `node-telegram-bot-api` - Telegram Bot API wrapper
- `mongoose` - MongoDB ORM
- `@google/generative-ai` - Google Gemini AI integration
- `youtube-dl-exec` - Video downloading utility
- `node-cron` - Scheduling for reminders
- `express` - Lightweight web server
- `dotenv` - Environment variable management

### 🗃️ Database Schema

- **User model:** Store user details
- **Task model:** Manage to-do list tasks
- **Note model:** Store personal notes
- **Reminder model:** Handle scheduled reminders
- **File model:** Keep track of uploaded files

---

## 🛡️ Error Handling & Security

- **Robust error handling** for API failures and invalid user inputs
- **Graceful failure** management for file operations
- **AI response fallback** for better user experience
- **File validation & size limitations** to prevent abuse
- **Environment variables** to store sensitive data securely

---

## 🎯 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature-branch`)
3. **Commit your changes** (`git commit -m "Add new feature"`)
4. **Push to your branch** (`git push origin feature-branch`)
5. **Create a Pull Request**

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

[Abdelaziz79](https://github.com/Abdelaziz79)

---

This Telegram bot is designed to be your personal assistant, managing tasks, reminders, and files while offering AI-powered conversations. Feel free to customize and contribute!
