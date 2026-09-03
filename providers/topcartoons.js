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
const BASE_URL = "https://www.topcartoons.tv";
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
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      const firstResult = $("article a").first();
      let href = firstResult.attr("href");
      if (!href)
        return [];
      if (!href.startsWith("http"))
        href = BASE_URL + href;
      const showHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const episodes = [];
      $show("article article").each((_, el) => {
        const epHref = $show(el).find("a").attr("href");
        const epName = $show(el).find("h3 a").text().trim();
        if (epHref)
          episodes.push({ href: epHref, name: epName });
      });
      let targetHref = href;
      if (episodes.length > 0 && mediaType === "tv" && episode != null) {
        const targetIdx = parseInt(episode) - 1;
        if (targetIdx >= 0 && targetIdx < episodes.length) {
          targetHref = episodes[targetIdx].href;
        } else {
          targetHref = episodes[0].href;
        }
      } else if (episodes.length > 0) {
        targetHref = episodes[0].href;
      }
      if (!targetHref.startsWith("http"))
        targetHref = BASE_URL + targetHref;
      const epHtml = yield (yield fetch(targetHref, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ep = cheerio.load(epHtml);
      const videoUrl = $ep('meta[property="og:video:url"]').attr("content") || "";
      if (!videoUrl)
        return [];
      return [{
        url: videoUrl,
        quality: extractQuality(videoUrl),
        title: "TopCartoons",
        subtitles: []
      }];
    } catch (e) {
      console.error("[TopCartoons]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
