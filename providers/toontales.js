var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const cheerio = require("cheerio-without-node-native");
const BASE_URL = "https://www.toontales.net";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function extractQuality(str) {
  const u = (str || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p"))
    return "1080p";
  if (u.includes("720p"))
    return "720p";
  if (u.includes("480p"))
    return "480p";
  return "Unknown";
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      let searchHref = null;
      for (let i = 1; i <= 3; i++) {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}&paged=${i}`;
        const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $2 = cheerio.load(searchHtml);
        const firstResult = $2("#movies-a > ul > li a").first();
        if (firstResult.length) {
          searchHref = firstResult.attr("href");
          break;
        }
      }
      if (!searchHref)
        return [];
      if (!searchHref.startsWith("http"))
        searchHref = BASE_URL + searchHref;
      const pageHtml = yield (yield fetch(searchHref, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      let fileUrl = null;
      $("script").each((_, el) => {
        const data = $(el).html() || "";
        if (data.includes("file:")) {
          const match = data.match(/file:\s*"([^"]+)"/);
          if (match) {
            fileUrl = match[1];
          }
        }
      });
      if (!fileUrl)
        return [];
      return [{
        url: fileUrl,
        quality: extractQuality(fileUrl),
        title: "ToonTales",
        subtitles: []
      }];
    } catch (e) {
      console.error("[ToonTales]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
