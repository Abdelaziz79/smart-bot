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

const aiHandleText = async (msg, bot) => {
  const chatId = msg.chat.id;
  // Only respond to text messages that aren't commands
  if (msg.text && !msg.text.startsWith("/")) {
    try {
      // Send typing action to indicate the bot is processing
      bot.sendChatAction(chatId, "typing");

      // Send initial status message
      const statusMsg = await bot.sendMessage(chatId, "🧠 Thinking...");

      // Use the same Gemini model you've already configured
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a helpful assistant telegram bot. The user has sent this message: "${msg.text}".
                  Provide a helpful response. If it looks like they want to perform a task such as creating a task, reminder, note, or using other bot functions,
                  suggest the appropriate command they should use with example formatting.
                  Keep responses concise and friendly.
                  
                  Here is a list of all available commands and their functions:

                  **Task Management:**
                  - \`/task [text]\`: Create a new task.
                    - Example: \`/task Buy groceries\`
                  - \`/tasks\`: List all your tasks.
                  - \`/complete [task number]\`: Mark a task as completed.
                    - Example: \`/complete 3\`
                  - \`/delete_task [task number]\`: Delete a task.
                    - Example: \`/delete_task 3\`
                  
                  **Reminders:**
                  - \`/reminder [time] [message]\`: Set a reminder.
                    - Time format examples: \`30m\` (30 minutes), \`2h\` (2 hours), \`1d\` (1 day), or a specific time like \`18:30\`.
                    - Example: \`/reminder 1h Check the oven\`
                  - \`/reminders\`: List all your active reminders.
                  - \`/delete_reminder [reminder number]\`: Delete a reminder.
                    - Example: \`/delete_reminder 2\`
                  
                  **Notes:**
                  - \`/note [title] [content]\`: Save a note.
                    - Example: \`/note Meeting "Talk about Q3 results"\`
                  - \`/notes\`: List all your notes.
                  - \`/get_note [note number]\`: Retrieve a specific note.
                    - Example: \`/get_note 1\`
                  - \`/delete_note [note number]\`: Delete a note.
                    - Example: \`/delete_note 1\`
                  
                  **File Management:**
                  - To save a file, just send a photo, document, or video to the chat.
                  - \`/files\`: List all your stored files.
                  - \`/photos\`: List all your stored photos.
                  - \`/videos\`: List all your stored videos.
                  - \`/send_file [file number]\`: Sends the specified file to you.
                    - Example: \`/send_file 2\`
                  - \`/delete_file [file number]\`: Deletes a specific file.
                    - Example: \`/delete_file 2\`
                  - \`/download [URL]\`: Download a video from a URL (e.g., YouTube, TikTok).
                    - Example: \`/download https://www.youtube.com/watch?v=dQw4w9WgXcQ\`
                  
                  **Utilities:**
                  - \`/movie [movie name]\`: Get information about a movie.
                    - Example: \`/movie Inception\`
                  - \`/scrape [URL] [options]\`: Scrape content from a web page.
                    - Example: \`/scrape https://example.com -summarize -images\`
                    - **Options:**
                      - \`-full\`: Get full extracted content as a file.
                      - \`-images\`: Extract and send up to 3 images from the page.
                      - \`-dynamic\`: Use a browser for dynamic/JavaScript-heavy sites.
                      - \`-summarize\`: Get an AI-generated summary.
                      - \`-metadata\`: Get only page metadata (title, description, etc.).
                      - \`-screenshot\`: Get a screenshot of the page.
                      - \`-analyze\`: Get an AI-powered analysis of the content.
                      - \`-keywords\`: Extract keywords from the content.
                  
                  **AI:**
                  - \`/ai [prompt]\`: Generate a response from the AI.
                    - Example: \`/ai What is the capital of France?\`
                  
                  **Other:**
                  - \`/start\`: Shows a welcome message.
                  - \`/help\`: Shows a detailed list of commands.
                  `,
              },
            ],
          },
        ],
      });

      const response = result.response.text();

      // Format the response with HTML
      const formattedResponse = formatWithHTML(response);

      // Handle the response with HTML formatting
      if (formattedResponse.length <= 4000) {
        // Update the status message with the response
        await bot.editMessageText(
          `🤖 <b>Response:</b>\n\n${formattedResponse}`,
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
            `🤖 <b>Response (Part ${i + 1}/${chunks.length}):</b>\n\n${
              chunks[i]
            }`,
            { parse_mode: "HTML" }
          );
        }
      }
    } catch (error) {
      console.error("AI processing error:", error);
      bot.sendMessage(
        chatId,
        "I'm having trouble understanding that right now. Try using specific commands like /help to see what I can do."
      );
    }
  }
};

module.exports = {
  handleAICommand,
  handleImageGenerationCommand,
  aiHandleText,
};
