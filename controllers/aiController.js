require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize the Google Generative AI with API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Handle /ai command to generate AI responses
 * @param {object} msg - Telegram message object
 * @param {object} match - Regex match result
 * @param {object} bot - Telegram bot instance
 */
async function handleAICommand(msg, match, bot) {
  const chatId = msg.chat.id;
  const prompt = match[1];

  if (!prompt || prompt.trim() === "") {
    bot.sendMessage(
      chatId,
      "Please provide a prompt after /ai command. Example: /ai Explain how AI works"
    );
    return;
  }

  let statusMsg;

  try {
    // Send typing action to indicate the bot is processing
    bot.sendChatAction(chatId, "typing");

    // Send initial status message
    statusMsg = await bot.sendMessage(chatId, "🧠 Thinking...");

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Format the response with HTML
    const formattedResponse = formatWithHTML(response);

    // Handle the response with HTML formatting
    if (formattedResponse.length <= 4000) {
      // Update the status message with the response
      await bot.editMessageText(
        `🤖 <b>AI Response:</b>\n\n${formattedResponse}`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "HTML",
        }
      );
    } else {
      // Delete the status message
      await bot.deleteMessage(chatId, statusMsg.message_id);

      // Send response in chunks
      const chunks = splitTextIntoChunks(formattedResponse, 4000);
      for (let i = 0; i < chunks.length; i++) {
        await bot.sendMessage(
          chatId,
          `🤖 <b>AI Response (Part ${i + 1}/${chunks.length}):</b>\n\n${
            chunks[i]
          }`,
          { parse_mode: "HTML" }
        );
      }
    }
  } catch (error) {
    console.error("AI generation error:", error);

    try {
      // Delete the thinking message if it exists
      if (statusMsg) {
        await bot.deleteMessage(chatId, statusMsg.message_id);
      }

      // If formatting fails, try again without formatting
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Send without any formatting as fallback
      if (response.length <= 4000) {
        await bot.sendMessage(chatId, `🤖 AI Response:\n\n${response}`);
      } else {
        const chunks = splitTextIntoChunks(response, 4000);
        for (let i = 0; i < chunks.length; i++) {
          await bot.sendMessage(
            chatId,
            `🤖 AI Response (Part ${i + 1}/${chunks.length}):\n\n${chunks[i]}`
          );
        }
      }
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      bot.sendMessage(
        chatId,
        "❌ Error: The response contains formatting that can't be processed. Try a different prompt."
      );
    }
  }
}

/**
 * Format text with HTML
 * @param {string} text - Original text
 * @returns {string} - HTML formatted text
 */
function formatWithHTML(text) {
  // Escape HTML entities
  let processed = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format code blocks
  processed = processed.replace(
    /```(.*?)\n([\s\S]*?)```/g,
    function (match, language, codeContent) {
      return `<pre><code class="${language || ""}">${codeContent}</code></pre>`;
    }
  );

  // Format inline code
  processed = processed.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Format bold text
  processed = processed.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  // Format italic text
  processed = processed.replace(/\*(.*?)\*/g, "<i>$1</i>");

  // Format links - simple format [text](url)
  processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Format "CODE:" and "END CODE" markers (if they still appear)
  processed = processed.replace(
    /CODE:\n([\s\S]*?)\nEND CODE/g,
    "<pre>$1</pre>"
  );

  return processed;
}

/**
 * Split text into chunks of specified size
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length of each chunk
 * @returns {Array<string>} - Array of text chunks
 */
function splitTextIntoChunks(text, maxLength) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxLength;

    // If we're not at the end, find a good breaking point
    if (end < text.length) {
      // Try to break at paragraph, then sentence, then word
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      const sentenceBreak = text.lastIndexOf(". ", end);
      const wordBreak = text.lastIndexOf(" ", end);

      // Try to break at HTML tag boundaries to avoid breaking tags
      const closingTagBreak = text.lastIndexOf("</", end);
      if (closingTagBreak > start) {
        const closingBracket = text.indexOf(">", closingTagBreak);
        if (closingBracket > closingTagBreak && closingBracket <= end) {
          end = closingBracket + 1;
        }
      }

      // If no HTML boundary found, use regular text breaks
      if (end === start + maxLength) {
        if (paragraphBreak > start && paragraphBreak > end - 200) {
          end = paragraphBreak + 2;
        } else if (sentenceBreak > start && sentenceBreak > end - 100) {
          end = sentenceBreak + 2;
        } else if (wordBreak > start) {
          end = wordBreak + 1;
        }
      }
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

/**
 * Handle image generation with AI (if needed in the future)
 * @param {object} msg - Telegram message object
 * @param {object} match - Regex match result
 * @param {object} bot - Telegram bot instance
 */
async function handleImageGenerationCommand(msg, match, bot) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Image generation is not yet implemented.");
}

module.exports = {
  handleAICommand,
  handleImageGenerationCommand,
};
