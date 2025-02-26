// videoDownloader.js
const ytdl = require("ytdl-core");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getTwitterMedia } = require("twitter-dl");
const { instagramDL } = require("instagram-url-direct");
const { tiktokDL } = require("tiktok-scraper-without-watermark");
const { fbDownloader } = require("fb-downloader");

// We'll use more reliable services and methods
// npm install youtube-dl-exec ffmpeg-static

const youtubedl = require("youtube-dl-exec");
const DOWNLOAD_DIR = "./downloads";

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

/**
 * Extract platform name from URL
 * @param {string} url - Video URL
 * @returns {string} - Platform name
 */
function detectPlatform(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("tiktok.com")) {
    return "tiktok";
  } else if (url.includes("instagram.com")) {
    return "instagram";
  } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return "facebook";
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    return "twitter";
  } else {
    return "unknown";
  }
}

/**
 * Download video using youtube-dl
 * @param {string} url - Video URL
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadWithYoutubeDL(url, platform) {
  try {
    const timestamp = Date.now();
    const filename = `${platform}_${timestamp}.mp4`;
    const outputPath = path.join(DOWNLOAD_DIR, filename);

    const options = {
      output: outputPath,
      format: "best[ext=mp4]/best", // Prefer MP4 format
      noCheckCertificates: true, // Skip HTTPS certificate verification
      noWarnings: true, // Don't print warnings
      preferFreeFormats: true, // Prefer free formats
      addHeader: ["referer:" + url], // Add referer header
      maxFilesize: "100m", // Max file size limit
    };

    // Execute youtube-dl command
    await youtubedl(url, options);

    // Check if file exists and has content
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return outputPath;
    } else {
      throw new Error(
        `Download completed but file is empty or missing: ${outputPath}`
      );
    }
  } catch (error) {
    console.error(`${platform} download error:`, error);
    throw new Error(`Failed to download ${platform} video: ${error.message}`);
  }
}

/**
 * Main function to download videos from various platforms
 * @param {string} url - Video URL
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadVideo(url) {
  const platform = detectPlatform(url);
  console.log(`Detected platform: ${platform}`);

  if (platform === "unknown") {
    throw new Error("Unsupported platform or invalid URL");
  }

  return downloadWithYoutubeDL(url, platform);
}

/**
 * Get video info without downloading
 * @param {string} url - Video URL
 * @returns {Promise<object>} - Video info
 */
async function getVideoInfo(url) {
  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    });

    return {
      title: info.title || "Unknown Title",
      duration: info.duration
        ? `${Math.floor(info.duration / 60)}:${(info.duration % 60)
            .toString()
            .padStart(2, "0")}`
        : "Unknown",
      thumbnail: info.thumbnail || null,
      platform: detectPlatform(url),
      filesize: info.filesize
        ? `${(info.filesize / (1024 * 1024)).toFixed(2)} MB`
        : "Unknown",
    };
  } catch (error) {
    console.error("Video info error:", error);
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

module.exports = {
  downloadVideo,
  DOWNLOAD_DIR,
  detectPlatform,
  getVideoInfo,
};
