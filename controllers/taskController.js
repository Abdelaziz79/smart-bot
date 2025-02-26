// controllers/taskController.js
const Task = require("../models/task");

const createTask = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const taskText = match[1];

  try {
    const newTask = new Task({
      chatId,
      text: taskText,
    });
    await newTask.save();
    bot.sendMessage(chatId, `✅ Task created: "${taskText}"`);
  } catch (error) {
    console.error("Error creating task:", error);
    bot.sendMessage(chatId, "❌ Error creating task. Please try again.");
  }
};

const listTasks = async (msg, bot) => {
  const chatId = msg.chat.id;

  try {
    const tasks = await Task.find({ chatId }).sort({ createdAt: -1 });

    if (tasks.length === 0) {
      return bot.sendMessage(
        chatId,
        "You don't have any tasks yet. Use /task [text] to create one."
      );
    }

    let message = "📋 Your tasks:\n\n";
    tasks.forEach((task, index) => {
      const status = task.completed ? "✅" : "⬜";
      message += `${index + 1}. ${status} ${task.text}\n`;
    });

    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    bot.sendMessage(chatId, "❌ Error fetching tasks. Please try again.");
  }
};

const completeTask = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const taskIndex = parseInt(match[1]) - 1;

  try {
    const tasks = await Task.find({ chatId }).sort({ createdAt: -1 });

    if (taskIndex < 0 || taskIndex >= tasks.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid task number. Use /tasks to see your tasks."
      );
    }

    const task = tasks[taskIndex];
    task.completed = true;
    await task.save();

    bot.sendMessage(chatId, `✅ Task "${task.text}" marked as completed.`);
  } catch (error) {
    console.error("Error completing task:", error);
    bot.sendMessage(chatId, "❌ Error completing task. Please try again.");
  }
};

const deleteTask = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const taskIndex = parseInt(match[1]) - 1;

  try {
    const tasks = await Task.find({ chatId }).sort({ createdAt: -1 });

    if (taskIndex < 0 || taskIndex >= tasks.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid task number. Use /tasks to see your tasks."
      );
    }

    const task = tasks[taskIndex];
    await Task.deleteOne({ _id: task._id });

    bot.sendMessage(chatId, `🗑️ Task "${task.text}" deleted.`);
  } catch (error) {
    console.error("Error deleting task:", error);
    bot.sendMessage(chatId, "❌ Error deleting task. Please try again.");
  }
};

module.exports = {
  createTask,
  listTasks,
  completeTask,
  deleteTask,
};
