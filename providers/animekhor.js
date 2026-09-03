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
const BASE_URL = "https://animekhor.org";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      let itemUrl = null;
      $("div.listupd > article").each((_, el) => {
        if (!itemUrl) {
          const href = $(el).find("div.bsx > a").attr("href");
          if (href)
            itemUrl = href.startsWith("http") ? href : BASE_URL + href;
        }
      });
      if (!itemUrl)
        return [];
      const animePage = yield (yield fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $2 = cheerio.load(animePage);
      const typeText = $2(".spe").text() || "";
      const isMovie = typeText.toLowerCase().includes("movie");
      let episodeUrl = null;
      if (isMovie) {
        episodeUrl = $2(".eplister li > a").attr("href") || itemUrl;
      } else {
        const epPageUrl = $2(".eplister li > a").attr("href") || "";
        if (!epPageUrl)
          return [];
        const epPageHtml = yield (yield fetch(epPageUrl.startsWith("http") ? epPageUrl : BASE_URL + epPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $3 = cheerio.load(epPageHtml);
        const targetEp = episode || 1;
        $3("div.episodelist > ul > li").each((_, el) => {
          const href = $3(el).find("a").attr("href");
          const epText = $3(el).find("a span").text();
          const epNumMatch = epText.match(/(\d+)/);
          const epNum = parseInt((epNumMatch == null ? void 0 : epNumMatch[1]) || "0");
          if (epNum === targetEp || !episodeUrl && epNum > 0) {
            if (!episodeUrl)
              episodeUrl = (href == null ? void 0 : href.startsWith("http")) ? href : BASE_URL + (href || "");
          }
        });
        if (!episodeUrl) {
          const firstEpHref = $3("div.episodelist > ul > li a").last().attr("href");
          if (firstEpHref) {
            episodeUrl = firstEpHref.startsWith("http") ? firstEpHref : BASE_URL + firstEpHref;
          }
        }
      }
      if (!episodeUrl)
        return [];
      const epHtml = yield (yield fetch(episodeUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $4 = cheerio.load(epHtml);
      const streams = [];
      $4(".mobius option").each((_, option) => {
        const base64Val = $4(option).attr("value") || "";
        if (!base64Val)
          return;
        try {
          const decoded = atob(base64Val);
          const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
          let url = srcMatch == null ? void 0 : srcMatch[1];
          if (url) {
            if (url.startsWith("//"))
              url = "https:" + url;
            if (url.startsWith("http")) {
              streams.push({
                url,
                quality: "Unknown",
                title: "Animekhor",
                subtitles: []
              });
            }
          }
        } catch (_2) {
        }
      });
      return streams;
    } catch (e) {
      console.error("[Animekhor]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
