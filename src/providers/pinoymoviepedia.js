const cheerio = require("cheerio-without-node-native");
// pinoymoviepedia.js
// Pinoymoviepedia provider — Filipino movies
// Searches by title, finds page, extracts iframes from div.pframe

const BASE_URL = "https://pinoymoviepedia.ru";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search Pinoymoviepedia
    const searchUrl = `${BASE_URL}/search/${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $s = cheerio.load(searchHtml);

    // First result from search
    let pageUrl = null;
    $s("div.result-item").each((_, el) => {
      if (!pageUrl) {
        const href = $s(el).find("div.title > a").attr("href");
        if (href) pageUrl = href;
      }
    });

    if (!pageUrl) return [];

    // 3. Fetch the page and extract iframes from div.pframe
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(pageHtml);

    const streams = [];
    $("div.pframe iframe").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && src.startsWith("http")) {
        streams.push({
          url: src,
          quality: extractQuality(src),
          title: `PinoyMoviePedia [Server ${i + 1}]`,
          subtitles: []
        });
      }
    });

    return streams;
  } catch (e) {
    console.error("[Pinoymoviepedia]", e);
    return [];
  }
}

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  if (u.includes("360p")) return "360p";
  return "Unknown";
}


module.exports = { getStreams };
