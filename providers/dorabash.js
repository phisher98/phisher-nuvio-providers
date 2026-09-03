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
const BASE_URL = "https://dorabash.in";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function extractQuality(url) {
  const u = (url || "").toLowerCase();
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
      const results = [];
      $("article").each((i, el) => {
        const a = $("h3 > a", el);
        const href = a.attr("href");
        const t = a.attr("title") || a.text().trim();
        if (href)
          results.push({ title: t, url: href });
      });
      if (!results.length)
        return [];
      const lcTitle = title.toLowerCase();
      let match = results.find((r) => r.title.toLowerCase().includes(lcTitle));
      if (!match)
        match = results[0];
      const resultHtml = yield (yield fetch(match.url, { headers: HEADERS, skipSizeCheck: true })).text();
      const $result = cheerio.load(resultHtml);
      const showUrl = $result("div.anime-data h4 a").attr("href") || match.url;
      const showHtml = yield (yield fetch(showUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $show = cheerio.load(showHtml);
      const typeText = $show("div.flex.flex-wrap.justify-center span:nth-child(2)").text() || "";
      const isMovie = typeText.toLowerCase().includes("movie");
      let targetUrl = showUrl;
      if (!isMovie) {
        const seasonId = $show("#seasonContent").attr("data-season");
        if (!seasonId)
          return [];
        const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${seasonId}&page=1&order=desc`;
        const epData = yield (yield fetch(ajaxUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const episodes = epData.data && epData.data.episodes || [];
        let ep = episodes.find((e) => parseInt(e.metaNumber) === episode);
        if (!ep)
          ep = episodes[0];
        if (!ep || !ep.url)
          return [];
        targetUrl = ep.url.startsWith("http") ? ep.url : `${BASE_URL}${ep.url}`;
      } else {
        targetUrl = showUrl.replace("series", "watch");
      }
      const playerHtml = yield (yield fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $player = cheerio.load(playerHtml);
      const streams = [];
      $player("div.player-selection span[data-embed-id]").each((i, span) => {
        const raw = $player(span).attr("data-embed-id") || "";
        const parts = raw.split(":", 2);
        if (parts.length !== 2)
          return;
        try {
          const name = atob(parts[0]).replace(/dub|sub/gi, "").trim();
          const url = atob(parts[1]);
          if (url.startsWith("http")) {
            const container = $player(span).closest("div.player-selection");
            const type = container.hasClass("player-dub") ? "DUB" : container.hasClass("player-sub") ? "SUB" : "";
            streams.push({
              url,
              quality: extractQuality(url),
              title: `DoraBash [${name}${type ? " " + type : ""}]`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      });
      return streams;
    } catch (e) {
      console.error("[DoraBash]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
