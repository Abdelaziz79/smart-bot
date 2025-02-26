const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const { JSDOM } = require("jsdom");
const readability = require("@mozilla/readability");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const metascraper = require("metascraper")([
  require("metascraper-author")(),
  require("metascraper-date")(),
  require("metascraper-description")(),
  require("metascraper-image")(),
  require("metascraper-logo")(),
  require("metascraper-publisher")(),
  require("metascraper-title")(),
  require("metascraper-url")(),
]);
const fs = require("fs");
const path = require("path");

// Create a temp directory if it doesn't exist
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Initialize the Gemini AI with API key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function handleScrape(msg, match, bot) {
  const chatId = msg.chat.id;
  const url = match[1].split(" ")[0]; // The captured URL
  // console.log("Scraping URL:", match[1]);
  // console.log("Scraping URL:", match[2]);
  const options = parseOptions(match[1].split(" ").slice(1).join(" ") || ""); // Parse any additional options
  console.log("Scraping URL:", url, "with options:", options);
  // Send a processing message
  const processingMessage = await bot.sendMessage(
    chatId,
    `⏳ Processing request. Scraping content from: ${url}\nOptions: ${
      Object.keys(options).join(", ") || "Default"
    }`
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

    // Choose scraping method based on options and URL
    let content, metadata;

    if (url.endsWith(".pdf")) {
      // Handle PDF files
      content = await scrapePDF(url);
      metadata = { title: content.metadata.title || "PDF Document" };
    } else if (options.dynamic || isLikelyDynamicSite(url)) {
      // Use Puppeteer for JavaScript-heavy sites
      ({ content, metadata } = await scrapeWithPuppeteer(url, options));
    } else {
      // Use regular HTTP request for static sites
      ({ content, metadata } = await scrapeWithAxios(url, options));
    }

    // Process content based on options
    let resultMessage = await formatResults(url, content, metadata, options);

    // Send result
    bot.editMessageText(resultMessage, {
      chat_id: chatId,
      message_id: processingMessage.message_id,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    // Send full extract as a document if requested
    if (
      options.fullextract &&
      content.mainContent &&
      content.mainContent.length > 1000
    ) {
      const fullContent = `# ${metadata.title || "Extracted Content"}\n\n${
        content.mainContent
      }`;

      // Create a temp file instead of directly using a buffer
      const tempFilePath = path.join(tempDir, `extract_${Date.now()}.md`);

      // Write content to file
      fs.writeFileSync(tempFilePath, fullContent);

      try {
        // Send file from disk instead of buffer
        await bot.sendDocument(chatId, tempFilePath, {
          caption: "Full extracted content",
        });
      } catch (docError) {
        console.error("Error sending document:", docError);
        await bot.sendMessage(
          chatId,
          "⚠️ Failed to send full content as a document. The content may be too large."
        );
      } finally {
        // Clean up the temp file (with error handling)
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (err) {
          console.error("Error cleaning up temp file:", err);
        }
      }
    }

    // Send screenshot if it was taken
    if (options.screenshot && content.screenshot) {
      try {
        const screenshotBuffer = Buffer.from(content.screenshot, "base64");
        const screenshotPath = path.join(
          tempDir,
          `screenshot_${Date.now()}.jpg`
        );
        fs.writeFileSync(screenshotPath, screenshotBuffer);

        await bot.sendPhoto(chatId, screenshotPath, {
          caption: `Screenshot of ${url}`,
        });

        // Clean up the screenshot file
        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }
      } catch (screenshotError) {
        console.error("Error sending screenshot:", screenshotError);
      }
    }

    // Send up to 3 images if requested
    if (options.images && content.images && content.images.length > 0) {
      // Send up to 3 actual images
      for (let i = 0; i < Math.min(3, content.images.length); i++) {
        try {
          const img = content.images[i];
          await bot.sendPhoto(chatId, img.src, {
            caption: img.alt || `Image ${i + 1} from ${url}`,
          });
          // Small delay to prevent rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (imgError) {
          console.log(`Could not send image ${i + 1}:`, imgError.message);
          // Continue with next image if one fails
        }
      }
    }
  } catch (error) {
    console.error("Error in scrape command:", error);
    let errorMessage = "Sorry, there was an error scraping this website.";

    // Provide more specific error messages
    if (error.code === "ENOTFOUND") {
      errorMessage = "Website not found. Please check the URL and try again.";
    } else if (error.code === "ETIMEDOUT" || error.name === "TimeoutError") {
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

// Parse command options
function parseOptions(optionsString) {
  console.log("Parsing options:", optionsString);
  const options = {};

  // Look for known flags
  if (optionsString.includes("-full")) options.fullextract = true;
  if (optionsString.includes("-images")) options.images = true;
  if (optionsString.includes("-dynamic")) options.dynamic = true;
  if (optionsString.includes("-summarize")) options.summarize = true;
  if (optionsString.includes("-metadata")) options.metadataOnly = true;
  if (optionsString.includes("-screenshot")) options.screenshot = true;
  if (optionsString.includes("-analyze")) options.analyze = true;
  if (optionsString.includes("-keywords")) options.keywords = true;

  // Extract depth parameter
  const depthMatch = optionsString.match(/--depth=(\d+)/);
  if (depthMatch) options.depth = parseInt(depthMatch[1]);

  return options;
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

// Determine if a site likely needs a browser to render
function isLikelyDynamicSite(url) {
  const dynamicDomains = [
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "reddit.com",
    "gmail.com",
    "youtube.com",
    "tiktok.com",
    "pinterest.com",
    "amazon.com",
    "ebay.com",
  ];

  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace("www.", "");

  return dynamicDomains.some((d) => domain.includes(d));
}

// Scrape static websites with Axios
async function scrapeWithAxios(url, options) {
  // Fetch the website content
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
    },
    timeout: 15000, // 15 seconds timeout
  });

  // Enhanced metadata extraction with metascraper
  const metadata = await metascraper({ html: response.data, url });

  // Load content into cheerio
  const $ = cheerio.load(response.data);

  // Use Readability to extract the main content
  const dom = new JSDOM(response.data, { url });
  const reader = new readability.Readability(dom.window.document);
  const article = reader.parse();

  // Extract all links
  const links = [];
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && text && !links.some((link) => link.href === href)) {
      links.push({
        href,
        text: text.substring(0, 50),
        isExternal:
          href.startsWith("http") && !href.includes(new URL(url).hostname),
      });
    }
    // Limit to first 20 links
    if (links.length >= 20) return false;
  });

  // Extract all headings with hierarchy
  const headings = [];
  $("h1, h2, h3, h4, h5, h6").each((i, el) => {
    const text = $(el).text().trim();
    if (text) {
      headings.push({
        level: parseInt(el.name.substring(1)),
        text: text.substring(0, 100),
      });
    }
    // Limit to first 15 headings
    if (headings.length >= 15) return false;
  });

  // Extract images if requested
  const images = [];
  if (options.images) {
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      const alt = $(el).attr("alt") || "No description";

      if (src && !images.some((img) => img.src === src)) {
        // Convert relative URLs to absolute
        const imgUrl = src.startsWith("http") ? src : new URL(src, url).href;
        images.push({
          src: imgUrl,
          alt: alt.substring(0, 100),
        });
      }
      // Limit to first 10 images
      if (images.length >= 10) return false;
    });
  }

  // Extract tables
  const tables = [];
  $("table").each((i, table) => {
    const tableData = [];
    $(table)
      .find("tr")
      .each((rowIndex, row) => {
        const rowData = [];
        $(row)
          .find("th, td")
          .each((cellIndex, cell) => {
            rowData.push($(cell).text().trim());
          });
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      });
    if (tableData.length > 0) {
      tables.push(tableData);
    }
    // Limit to first 3 tables
    if (tables.length >= 3) return false;
  });

  // Extract keywords if requested
  let keywords = [];
  if (options.keywords) {
    // Try to get keywords from meta tags
    const metaKeywords = $('meta[name="keywords"]').attr("content");
    if (metaKeywords) {
      keywords = metaKeywords.split(",").map((k) => k.trim());
    }

    // If not enough keywords from meta, extract common terms from content
    if (keywords.length < 5 && article) {
      const wordFreq = {};
      const words = article.textContent
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 3 &&
            !["this", "that", "with", "from", "have", "which"].includes(w)
        );

      words.forEach((word) => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });

      const topWords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map((pair) => pair[0]);

      keywords = [...new Set([...keywords, ...topWords])].slice(0, 10);
    }
  }

  return {
    content: {
      links,
      headings,
      images,
      tables,
      keywords,
      mainContent: article ? article.textContent : "",
      html: article ? article.content : "",
    },
    metadata,
  };
}

// Scrape dynamic websites with Puppeteer
async function scrapeWithPuppeteer(url, options) {
  // Launch browser
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
    );

    // Navigate to URL
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit extra for JavaScript-heavy sites (fixed version)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get HTML content
    const html = await page.content();

    // Use metascraper to extract metadata
    const metadata = await metascraper({ html, url });

    // Inject readability script
    await page.addScriptTag({
      url: "https://unpkg.com/mozilla-readability@0.4.2/Readability.js",
    });

    // Extract main content using Readability
    const article = await page.evaluate(() => {
      // Use injected Readability
      if (typeof Readability !== "undefined") {
        const reader = new Readability(document.cloneNode(true));
        return reader.parse();
      }
      return null;
    });

    // Extract links
    const links = await page.evaluate(() => {
      const results = [];
      const links = document.querySelectorAll("a");
      links.forEach((link) => {
        const href = link.href;
        const text = link.textContent.trim();
        if (href && text && !results.some((l) => l.href === href)) {
          results.push({
            href,
            text: text.substring(0, 50),
            isExternal: new URL(href).hostname !== window.location.hostname,
          });
        }
        if (results.length >= 20) return results;
      });
      return results;
    });

    // Extract headings
    const headings = await page.evaluate(() => {
      const results = [];
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      headings.forEach((heading) => {
        const text = heading.textContent.trim();
        if (text) {
          results.push({
            level: parseInt(heading.tagName.substring(1)),
            text: text.substring(0, 100),
          });
        }
        if (results.length >= 15) return results;
      });
      return results;
    });

    // Extract images if requested
    const images = [];
    if (options.images) {
      const extractedImages = await page.evaluate(() => {
        const results = [];
        const imgElements = document.querySelectorAll("img");
        imgElements.forEach((img) => {
          const src = img.src;
          const alt = img.alt || "No description";

          if (
            src &&
            !results.some((i) => i.src === src) &&
            img.width > 100 &&
            img.height > 100
          ) {
            // Filter out tiny images
            results.push({
              src,
              alt: alt.substring(0, 100),
              width: img.width,
              height: img.height,
            });
          }
        });
        return results.slice(0, 10); // Limit to 10 images
      });

      images.push(...extractedImages);
    }

    // Take screenshot if requested
    let screenshot = null;
    if (options.screenshot || options.images) {
      screenshot = await page.screenshot({
        type: "jpeg",
        quality: 80,
        fullPage: false,
      });
      // Convert screenshot to base64
      screenshot = screenshot.toString("base64");
    }

    // Close browser
    await browser.close();

    return {
      content: {
        links,
        headings,
        images,
        mainContent: article ? article.textContent : "",
        html: article ? article.content : "",
        screenshot,
      },
      metadata,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Handle PDF files
async function scrapePDF(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
  });

  const data = await pdfParse(response.data);

  return {
    mainContent: data.text,
    info: data.info,
    metadata: {
      title: data.info.Title || "PDF Document",
      pageCount: data.numpages,
    },
  };
}

// Format results into a readable message
async function formatResults(url, content, metadata, options) {
  let resultMessage = `<b>📄 Scraped Content from ${url}</b>\n\n`;

  // Add metadata
  resultMessage += `<b>Title:</b> ${metadata.title || "No title found"}\n`;

  if (metadata.description) {
    resultMessage += `<b>Description:</b> ${metadata.description}\n`;
  }

  if (metadata.author) {
    resultMessage += `<b>Author:</b> ${metadata.author}\n`;
  }

  if (metadata.date) {
    resultMessage += `<b>Date:</b> ${metadata.date}\n`;
  }

  if (metadata.publisher) {
    resultMessage += `<b>Publisher:</b> ${metadata.publisher}\n`;
  }

  resultMessage += `\n`;

  // Include keywords if available and requested
  if (options.keywords && content.keywords && content.keywords.length > 0) {
    resultMessage += `<b>Keywords:</b> ${content.keywords.join(", ")}\n\n`;
  }

  // Include headings if found and not in metadata-only mode
  if (
    !options.metadataOnly &&
    content.headings &&
    content.headings.length > 0
  ) {
    resultMessage += `<b>Main Headings:</b>\n`;
    content.headings.slice(0, 7).forEach((heading) => {
      // Add indentation based on heading level
      const indent = "  ".repeat(heading.level - 1);
      resultMessage += `${indent}• ${heading.text}\n`;
    });
    resultMessage += "\n";
  }

  // Add content preview if not in metadata-only mode
  if (!options.metadataOnly && content.mainContent) {
    // Generate AI summary if requested
    if (options.summarize && process.env.GEMINI_API_KEY) {
      try {
        const text = content.mainContent.substring(0, 6000); // Limit text for API

        resultMessage += `<b>AI Summary:</b>\n`;

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Summarize this web content in under 200 words. Focus on the key points and main takeaways:\n\n${text}`,
                },
              ],
            },
          ],
        });

        const summary = result.response.text();
        resultMessage += `${summary}\n\n`;
      } catch (error) {
        console.error("Error generating AI summary:", error);
        resultMessage += `<b>Content Preview:</b>\n${content.mainContent.substring(
          0,
          400
        )}...\n\n`;
      }
    } else {
      resultMessage += `<b>Content Preview:</b>\n${content.mainContent.substring(
        0,
        400
      )}...\n\n`;
    }

    // Add content analysis if requested
    if (options.analyze && process.env.GEMINI_API_KEY) {
      try {
        const text = content.mainContent.substring(0, 6000); // Limit text for API

        resultMessage += `<b>Content Analysis:</b>\n`;

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Analyze this web content briefly. Identify: 1) Main topic, 2) Target audience, 3) Content type (informational, promotional, etc.), 4) Any potential biases:\n\n${text}`,
                },
              ],
            },
          ],
        });

        const analysis = result.response.text();
        resultMessage += `${analysis}\n\n`;
      } catch (error) {
        console.error("Error generating content analysis:", error);
      }
    }
  }

  // Add links if found and not in metadata-only mode
  if (!options.metadataOnly && content.links && content.links.length > 0) {
    // Separate internal and external links
    const internalLinks = content.links.filter((link) => !link.isExternal);
    const externalLinks = content.links.filter((link) => link.isExternal);

    if (internalLinks.length > 0) {
      resultMessage += `<b>Internal Links:</b>\n`;
      internalLinks.slice(0, 5).forEach((link) => {
        resultMessage += `• <a href="${link.href}">${
          link.text || "Link"
        }</a>\n`;
      });
      resultMessage += "\n";
    }

    if (externalLinks.length > 0) {
      resultMessage += `<b>External Links:</b>\n`;
      externalLinks.slice(0, 5).forEach((link) => {
        resultMessage += `• <a href="${link.href}">${
          link.text || "Link"
        }</a>\n`;
      });
      resultMessage += "\n";
    }
  }

  // Add image info if found
  if (options.images && content.images && content.images.length > 0) {
    resultMessage += `<b>Images:</b> Found ${content.images.length} images. A selection will be sent separately.\n`;
    if (options.screenshot) {
      resultMessage += `A screenshot will be sent separately.\n\n`;
    }
  }

  return resultMessage;
}

// To use with your bot structure
module.exports = {
  handleScrape,
};
