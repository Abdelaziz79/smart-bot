require("dotenv").config();
const axios = require("axios");
// Movie command handler
async function handleMovie(msg, match, bot) {
  const chatId = msg.chat.id;
  const movieName = match[1]; // The captured movie name

  try {
    // Search for the movie using OMDb API
    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${
        process.env.OMDB_API_KEY
      }&t=${encodeURIComponent(movieName)}`
    );

    const movieData = response.data;

    if (movieData.Response === "False") {
      bot.sendMessage(chatId, `Movie not found: ${movieName}`);
      return;
    }

    // Extract movie information
    const title = movieData.Title || "N/A";
    const year = movieData.Year || "N/A";
    const ratingImdb = movieData.imdbRating || "N/A";
    const posterUrl = movieData.Poster || "N/A";

    // Prepare the response message
    const message = `🎬 *${title}* (${year})\n⭐ IMDb Rating: ${ratingImdb}/10`;

    // Send poster image if available
    if (posterUrl !== "N/A") {
      bot.sendPhoto(chatId, posterUrl, {
        caption: message,
        parse_mode: "Markdown",
      });
    } else {
      bot.sendMessage(
        chatId,
        `${message}\n\nNo poster available for this movie.`,
        {
          parse_mode: "Markdown",
        }
      );
    }
  } catch (error) {
    console.error("Error in movie command:", error);
    bot.sendMessage(
      chatId,
      "Sorry, there was an error processing your request. Please try again later."
    );
  }
}

module.exports = {
  handleMovie,
};
