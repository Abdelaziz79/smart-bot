// services/reminderService.js
const cron = require("node-cron");

// Store active reminders in memory for cron jobs
const activeReminders = new Map();

const Reminder = require("../models/reminder"); // Import the Reminder model

const parseAndScheduleReminder = async (
  chatId,
  timeSpec,
  reminderText,
  bot
) => {
  // Calculate scheduled time
  let scheduledTime = new Date();

  // Handle different time formats
  if (timeSpec.includes(":")) {
    // Specific time format (e.g., 18:30)
    const [hours, minutes] = timeSpec.split(":").map(Number);
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time is in the past, schedule for tomorrow
    if (scheduledTime < new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
  } else {
    // Relative time format (e.g., 30m, 2h, 1d)
    const unit = timeSpec.slice(-1);
    const value = parseInt(timeSpec.slice(0, -1));

    switch (unit) {
      case "m":
        scheduledTime = new Date(scheduledTime.getTime() + value * 60000);
        break;
      case "h":
        scheduledTime = new Date(scheduledTime.getTime() + value * 3600000);
        break;
      case "d":
        scheduledTime = new Date(scheduledTime.getTime() + value * 86400000);
        break;
      default:
        throw new Error(
          "Invalid time format. Use 30m, 2h, 1d, or specific time like 18:30."
        );
    }
  }

  // Generate a unique ID for this cron job
  const cronId = `reminder_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Schedule the reminder using setTimeout
  const cronTime = scheduledTime.getTime() - Date.now();

  if (cronTime > 0) {
    const timeout = setTimeout(() => {
      bot.sendMessage(chatId, `⏰ REMINDER: ${reminderText}`);

      // Mark as completed
      Reminder.findByIdAndUpdate(newReminder._id, { completed: true }).catch(
        (err) => console.error("Error updating reminder status:", err)
      );

      // Remove from active reminders
      activeReminders.delete(cronId);
    }, cronTime);

    activeReminders.set(cronId, timeout);

    // Store in active reminders
  } else {
    throw new Error(
      "Cannot set reminder for past time. Please use a future time."
    );
  }

  return { scheduledTime, cronId };
};

const cancelReminder = async (reminder) => {
  if (activeReminders.has(reminder.cronId)) {
    clearTimeout(activeReminders.get(reminder.cronId));
    activeReminders.delete(reminder.cronId);
  }

  await Reminder.deleteOne({ _id: reminder._id });
};

const loadReminders = async (bot) => {
  try {
    const pendingReminders = await Reminder.find({
      completed: false,
      scheduledTime: { $gt: new Date() },
    });

    pendingReminders.forEach((reminder) => {
      const now = new Date();
      const scheduledTime = new Date(reminder.scheduledTime);
      const timeLeft = scheduledTime.getTime() - now.getTime();

      if (timeLeft > 0) {
        const timeout = setTimeout(() => {
          bot.sendMessage(reminder.chatId, `⏰ REMINDER: ${reminder.text}`);

          // Mark as completed
          Reminder.findByIdAndUpdate(reminder._id, { completed: true }).catch(
            (err) => console.error("Error updating reminder status:", err)
          );

          // Remove from active reminders
          activeReminders.delete(reminder.cronId);
        }, timeLeft);

        activeReminders.set(reminder.cronId, timeout);
        console.log(
          `Loaded reminder: "${reminder.text}" for ${new Date(
            scheduledTime
          ).toLocaleString()}`
        );
      }
    });

    console.log(`Loaded ${activeReminders.size} active reminders`);
  } catch (error) {
    console.error("Error loading reminders:", error);
  }
};

module.exports = {
  parseAndScheduleReminder,
  cancelReminder,
  loadReminders,
  activeReminders,
};
