const axios = require("axios");
const cheerio = require("cheerio");

async function handleScrape(msg, match, bot) {
  const chatId = msg.chat.id;
  const url = match[1]; // The captured URL

  // Send a processing message
  const processingMessage = await bot.sendMessage(
    chatId,
    `⏳ Processing request. Scraping content from: ${url}`
  );

  try {
    // Validate URL format
    if (!isValidUrl(url)) {
      bot.editMessageText(
        "⚠️ Invalid URL format. Please provide a valid URL starting with http:// or https://",
        { chat_id: chatId, message_id: processingMessage.message_id }
      );
      return;
    }

    // Fetch the website content
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
      },
      timeout: 15000, // 15 seconds timeout
    });

    // Load content into cheerio
    const $ = cheerio.load(response.data);

    // Extract basic site information
    const title = $("title").text().trim() || "No title found";
    const metaDescription =
      $('meta[name="description"]').attr("content") || "No description found";

    // Extract all links
    const links = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text && !links.some((link) => link.href === href)) {
        links.push({ href, text: text.substring(0, 50) });
      }
      // Limit to first 10 links
      if (links.length >= 10) return false;
    });

    // Extract all headings
    const headings = [];
    $("h1, h2, h3").each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        headings.push({
          type: el.name,
          text: text.substring(0, 100),
        });
      }
      // Limit to first 10 headings
      if (headings.length >= 10) return false;
    });

    // Extract main text content
    let mainContent = "";
    $("p").each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 40) {
        // Only include substantial paragraphs
        mainContent += text + "\n\n";
      }
      // Limit content length
      if (mainContent.length > 800) {
        mainContent = mainContent.substring(0, 800) + "...";
        return false;
      }
    });

    // Prepare response message
    let resultMessage = `📄 *Scraped Content from ${url}*\n\n`;
    resultMessage += `*Title:* ${title}\n\n`;

    if (metaDescription && metaDescription !== "No description found") {
      resultMessage += `*Description:* ${metaDescription}\n\n`;
    }

    // Add headings if found
    if (headings.length > 0) {
      resultMessage += `*Main Headings:*\n`;
      headings.forEach((heading) => {
        resultMessage += `• ${heading.text}\n`;
      });
      resultMessage += "\n";
    }

    // Add content preview if found
    if (mainContent) {
      resultMessage += `*Content Preview:*\n${mainContent.substring(
        0,
        400
      )}...\n\n`;
    }

    // Add links if found
    if (links.length > 0) {
      resultMessage += `*Key Links:*\n`;
      links.slice(0, 5).forEach((link) => {
        const displayHref = link.href.startsWith("http")
          ? link.href
          : `${new URL(url).origin}${link.href}`;
        resultMessage += `• [${link.text || "Link"}](${displayHref})\n`;
      });
    }

    // Send result
    bot.editMessageText(resultMessage, {
      chat_id: chatId,
      message_id: processingMessage.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error in scrape command:", error);
    let errorMessage = "Sorry, there was an error scraping this website.";

    // Provide more specific error messages
    if (error.code === "ENOTFOUND") {
      errorMessage = "Website not found. Please check the URL and try again.";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage =
        "Request timed out. The website may be slow or unavailable.";
    } else if (error.response) {
      // HTTP error responses
      errorMessage = `Error: Server responded with status ${error.response.status}. The website may be blocking scraping attempts.`;
    }

    bot.editMessageText(`⚠️ ${errorMessage}`, {
      chat_id: chatId,
      message_id: processingMessage.message_id,
    });
  }
}

// Helper function to validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// To use with your bot structure
module.exports = {
  handleScrape,
};
