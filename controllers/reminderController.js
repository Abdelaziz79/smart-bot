// controllers/reminderController.js
const Reminder = require("../models/reminder");
const reminderService = require("../services/reminderService");

const createReminder = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const timeSpec = match[1];
  const reminderText = match[2];

  try {
    const { scheduledTime, cronId } =
      await reminderService.parseAndScheduleReminder(
        chatId,
        timeSpec,
        reminderText,
        bot
      );

    const newReminder = new Reminder({
      chatId,
      text: reminderText,
      scheduledTime,
      cronId,
    });
    await newReminder.save();

    bot.sendMessage(
      chatId,
      `⏰ Reminder set: "${reminderText}" for ${new Date(
        scheduledTime
      ).toLocaleString()}`
    );
  } catch (error) {
    console.error("Error creating reminder:", error);
    bot.sendMessage(chatId, "❌ Error creating reminder. Please try again.");
  }
};

const listReminders = async (msg, bot) => {
  const chatId = msg.chat.id;

  try {
    const reminders = await Reminder.find({
      chatId,
      completed: false,
    }).sort({ scheduledTime: 1 });

    if (reminders.length === 0) {
      return bot.sendMessage(
        chatId,
        "You don't have any active reminders. Use /reminder [time] [message] to create one."
      );
    }

    let message = "⏰ Your reminders:\n\n";
    reminders.forEach((reminder, index) => {
      message += `${index + 1}. "${reminder.text}" - ${new Date(
        reminder.scheduledTime
      ).toLocaleString()}\n`;
    });

    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    bot.sendMessage(chatId, "❌ Error fetching reminders. Please try again.");
  }
};

const deleteReminder = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const reminderIndex = parseInt(match[1]) - 1;

  try {
    const reminders = await Reminder.find({
      chatId,
      completed: false,
    }).sort({ scheduledTime: 1 });

    if (reminderIndex < 0 || reminderIndex >= reminders.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid reminder number. Use /reminders to see your reminders."
      );
    }

    const reminder = reminders[reminderIndex];

    await reminderService.cancelReminder(reminder); // Use the service

    bot.sendMessage(chatId, `🗑️ Reminder "${reminder.text}" deleted.`);
  } catch (error) {
    console.error("Error deleting reminder:", error);
    bot.sendMessage(chatId, "❌ Error deleting reminder. Please try again.");
  }
};

module.exports = {
  createReminder,
  listReminders,
  deleteReminder,
};
