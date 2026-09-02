const cheerio = require("cheerio-without-node-native");
// latanime.js
// Latanime - Spanish-language anime provider via latanime.org

const BASE_URL = "https://latanime.org";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Step 1: Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // Step 2: Search Latanime
    const searchUrl = `${BASE_URL}/buscar?q=${encodeURIComponent(title)}`;
    const searchResp = await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
    const searchHtml = await searchResp.text();
    const $ = cheerio.load(searchHtml);

    // Find search results - "div.row a"
    const results = [];
    $("div.row a").each((i, el) => {
      const href = $(el).attr("href");
      const name = $(el).find("h3").text().trim();
      if (href && name) results.push({ href, name });
    });

    if (results.length === 0) return [];

    // Best match
    const match = results.find(r =>
      r.name.toLowerCase().includes(title.toLowerCase())
    ) || results[0];

    // Step 3: Load the anime page to get episodes
    const animeResp = await fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
    const animeHtml = await animeResp.text();
    const $a = cheerio.load(animeHtml);

    // Find episodes: "div.row a[href*='/ver/']"
    const epLinks = [];
    $a("div.row a[href*='/ver/']").each((i, el) => {
      epLinks.push($a(el).attr("href"));
    });

    if (epLinks.length === 0) return [];

    // Find target episode
    let targetEpUrl = null;
    if (mediaType === "tv" && episode) {
      // Episodes are indexed; try to find by position
      const epIndex = parseInt(episode) - 1;
      targetEpUrl = epLinks[epIndex] || epLinks[epLinks.length - 1];
    } else {
      // Movie or just get first episode
      targetEpUrl = epLinks[0];
    }

    if (!targetEpUrl) return [];

    // Step 4: Load episode page and get player links
    const epPageResp = await fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true });
    const epPageHtml = await epPageResp.text();
    const $ep = cheerio.load(epPageHtml);

    const streams = [];
    const playerItems = [];

    // "#play-video a" - each has data-player attribute (base64 encoded URL)
    $ep("#play-video a").each((i, el) => {
      const dataPlayer = $ep(el).attr("data-player");
      if (dataPlayer) {
        try {
          const decoded = atob(dataPlayer);
          // Format: something=URL
          const url = decoded.includes("=") ? decoded.substringAfter("=") : decoded;
          const actualUrl = decoded.split("=").slice(1).join("=");
          playerItems.push(actualUrl || decoded);
        } catch (e) {}
      }
    });

    // For each player URL, try to get direct stream
    for (const playerUrl of playerItems) {
      if (!playerUrl || !playerUrl.startsWith("http")) continue;

      // Check if it's already a direct stream
      if (playerUrl.includes(".m3u8")) {
        streams.push({
          url: playerUrl,
          quality: "1080p",
          title: "Latanime",
          subtitles: []
        });
        continue;
      }

      // Try zilla-networks player
      if (playerUrl.includes("zilla-networks")) {
        try {
          const id = playerUrl.split("/").pop();
          const m3u8 = `https://player.zilla-networks.com/m3u8/${id}`;
          streams.push({
            url: m3u8,
            quality: "1080p",
            title: "Latanime (Zilla)",
            subtitles: []
          });
        } catch(e) {}
        continue;
      }

      // Try fetching the player page to find stream
      try {
        const pResp = await fetch(playerUrl, { headers: HEADERS, skipSizeCheck: true });
        const pText = await pResp.text();

        const m3u8Match = pText.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
        if (m3u8Match) {
          streams.push({
            url: m3u8Match[0],
            quality: "1080p",
            title: "Latanime",
            subtitles: []
          });
        }
      } catch(e) {}
    }

    return streams;
  } catch (e) {
    console.error("[Latanime]", e);
    return [];
  }
}

// Helper to mimic Kotlin's substringAfter
String.prototype.substringAfter = function(delimiter) {
  const idx = this.indexOf(delimiter);
  return idx === -1 ? this : this.slice(idx + delimiter.length);
};


module.exports = { getStreams };
