// controllers/userController.js
const User = require("../models/user");

const registerUser = async (msg, bot) => {
  try {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId });

    if (!user) {
      const newUser = new User({
        chatId,
        username: msg.from.username,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
      });
      await newUser.save();
      console.log(`New user registered: ${chatId}`);
    }
  } catch (error) {
    console.error("Error registering user:", error);
    bot.sendMessage(chatId, "❌ Error registering user. Please try again.");
  }
};

module.exports = {
  registerUser,
};
