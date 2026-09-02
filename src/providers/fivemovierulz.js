const cheerio = require("cheerio-without-node-native");
// fivemovierulz.js
// 5movierulz - South Indian/Bollywood movie site (5movierulz.gripe)
// Search: /?s={query}
// Stream links: p a elements containing "watch online" text

const BASE_URL = "https://5movierulz.gripe";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};

function extractQuality(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k")) return "4K";
  if (u.includes("1080p")) return "1080p";
  if (u.includes("720p")) return "720p";
  if (u.includes("480p")) return "480p";
  return "Unknown";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. Get title from TMDB
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const mediaInfo = await (await fetch(tmdbUrl, { skipSizeCheck: true })).json();
    const title = mediaInfo.title || mediaInfo.name;
    if (!title) return [];

    // 2. Search
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $ = cheerio.load(searchHtml);

    const results = [];
    $("#main .cont_display").each((i, el) => {
      const a = $("a", el).first();
      const href = a.attr("href");
      const t = (a.attr("title") || a.text()).trim().replace(/\(.*$/, "").trim();
      if (href) results.push({ title: t, url: href });
    });

    if (!results.length) return [];

    const lcTitle = title.toLowerCase();
    let match = results.find(r => r.title.toLowerCase().includes(lcTitle));
    if (!match) match = results[0];

    const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;

    // 3. Load movie page
    const pageHtml = await (await fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
    const $page = cheerio.load(pageHtml);

    // 4. Find "watch online" links in <p> tags
    const streams = [];
    $page("p a").each((i, a) => {
      const text = $page(a).text().toLowerCase();
      const href = $page(a).attr("href") || "";
      if (text.includes("watch online") && href) {
        streams.push({
          url: href,
          quality: extractQuality(href),
          title: `5movierulz [${$page(a).text().trim()}]`,
          subtitles: []
        });
      }
    });

    return streams;
  } catch (e) {
    console.error("[5movierulz]", e);
    return [];
  }
}


module.exports = { getStreams };
