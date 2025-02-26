// controllers/noteController.js
const Note = require("../models/note");

const createNote = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const title = match[1];
  const content = match[2];

  try {
    const newNote = new Note({
      chatId,
      title,
      content,
    });
    await newNote.save();
    bot.sendMessage(chatId, `📝 Note saved: "${title}"`);
  } catch (error) {
    console.error("Error saving note:", error);
    bot.sendMessage(chatId, "❌ Error saving note. Please try again.");
  }
};

const listNotes = async (msg, bot) => {
  const chatId = msg.chat.id;

  try {
    const notes = await Note.find({ chatId }).sort({ createdAt: -1 });

    if (notes.length === 0) {
      return bot.sendMessage(
        chatId,
        "You don't have any notes yet. Use /note [title] [content] to create one."
      );
    }

    let message = "📝 Your notes:\n\n";
    notes.forEach((note, index) => {
      message += `${index + 1}. "${note.title}" - ${new Date(
        note.createdAt
      ).toLocaleString()}\n`;
    });
    message += "\nUse /get_note [number] to view a specific note.";

    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error("Error fetching notes:", error);
    bot.sendMessage(chatId, "❌ Error fetching notes. Please try again.");
  }
};

const getNote = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const noteIndex = parseInt(match[1]) - 1;

  try {
    const notes = await Note.find({ chatId }).sort({ createdAt: -1 });

    if (noteIndex < 0 || noteIndex >= notes.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid note number. Use /notes to see your notes."
      );
    }

    const note = notes[noteIndex];

    bot.sendMessage(
      chatId,
      `📝 *${note.title}*\n\n${note.content}\n\nCreated: ${new Date(
        note.createdAt
      ).toLocaleString()}`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error retrieving note:", error);
    bot.sendMessage(chatId, "❌ Error retrieving note. Please try again.");
  }
};

const deleteNote = async (msg, match, bot) => {
  const chatId = msg.chat.id;
  const noteIndex = parseInt(match[1]) - 1;

  try {
    const notes = await Note.find({ chatId }).sort({ createdAt: -1 });

    if (noteIndex < 0 || noteIndex >= notes.length) {
      return bot.sendMessage(
        chatId,
        "❌ Invalid note number. Use /notes to see your notes."
      );
    }

    const note = notes[noteIndex];
    await Note.deleteOne({ _id: note._id });

    bot.sendMessage(chatId, `🗑️ Note "${note.title}" deleted.`);
  } catch (error) {
    console.error("Error deleting note:", error);
    bot.sendMessage(chatId, "❌ Error deleting note. Please try again.");
  }
};

module.exports = {
  createNote,
  listNotes,
  getNote,
  deleteNote,
};
