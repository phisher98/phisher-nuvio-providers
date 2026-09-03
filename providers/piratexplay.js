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
const BASE_URL = "https://piratexplay.cc";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $s = cheerio.load(searchHtml);
      let pageUrl = null;
      $s("#movies-a ul li").each((_, el) => {
        if (!pageUrl) {
          const href = $s(el).find("a").attr("href");
          if (href && href.startsWith("http"))
            pageUrl = href;
        }
      });
      if (!pageUrl)
        return [];
      if (mediaType === "tv" && season && episode) {
        const showHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $show = cheerio.load(showHtml);
        const seasonLinks = [];
        $show("div.season-swiper a.season-btn").each((_, el) => {
          seasonLinks.push($show(el).attr("href"));
        });
        let targetSeasonUrl = seasonLinks[parseInt(season) - 1] || seasonLinks[0];
        if (targetSeasonUrl) {
          const fullSeasonUrl = targetSeasonUrl.startsWith("http") ? targetSeasonUrl : BASE_URL + targetSeasonUrl;
          const seasonHtml = yield (yield fetch(fullSeasonUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $season = cheerio.load(seasonHtml);
          let epUrl = null;
          $season("#episode_by_temp li").each((_, epEl) => {
            const $ep = $season(epEl);
            const headerSpan = $ep.find("header.entry-header span").text().trim();
            const parts = headerSpan.split("x");
            const epNum = parts[1] ? parseInt(parts[1]) : null;
            if (epNum === parseInt(episode)) {
              epUrl = $ep.find("a").attr("href");
            }
          });
          if (epUrl)
            pageUrl = epUrl.startsWith("http") ? epUrl : BASE_URL + epUrl;
        }
      }
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const streams = [];
      for (const el of $("iframe").toArray()) {
        let src = $(el).attr("src") || $(el).attr("data-src") || "";
        if (src.includes("url=")) {
          src = src.split("url=").pop() || "";
        }
        src = src.trim();
        if (!src || !src.startsWith("http"))
          continue;
        try {
          if (src.includes("piratexplay.cc")) {
            const innerHtml = yield (yield fetch(src, { headers: HEADERS, skipSizeCheck: true })).text();
            const $inner = cheerio.load(innerHtml);
            const innerSrc = $inner("#playerFrame").attr("src");
            if (innerSrc && innerSrc.startsWith("http")) {
              streams.push({
                url: innerSrc,
                quality: extractQuality(innerSrc),
                title: "Piratexplay",
                subtitles: []
              });
              continue;
            }
          }
        } catch (_) {
        }
        streams.push({
          url: src,
          quality: extractQuality(src),
          title: "Piratexplay",
          subtitles: []
        });
      }
      return streams;
    } catch (e) {
      console.error("[Piratexplay]", e);
      return [];
    }
  });
}
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
  if (u.includes("360p"))
    return "360p";
  return "Unknown";
}
module.exports = { getStreams };
