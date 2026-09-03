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
const BASE_URL = "https://animedekho.app";
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
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(searchHtml);
      let itemUrl = null;
      $("ul[data-results] li article").each((_, el) => {
        if (!itemUrl) {
          const href = $(el).find("a.lnk-blk").attr("href");
          if (href)
            itemUrl = href;
        }
      });
      if (!itemUrl) {
        $("article").each((_, el) => {
          if (!itemUrl) {
            const href = $(el).find("a.lnk-blk").attr("href");
            if (href)
              itemUrl = href;
          }
        });
      }
      if (!itemUrl)
        return [];
      const animePage = yield (yield fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $2 = cheerio.load(animePage);
      const bodyClass = $2("body").attr("class") || "";
      const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
      const term = termMatch == null ? void 0 : termMatch[1];
      if (!term)
        return [];
      const seasonItems = $2("ul.seasons-lst li");
      let targetUrl = itemUrl;
      let mediaType2 = 1;
      if (seasonItems.length > 0) {
        mediaType2 = 2;
        seasonItems.each((_, el) => {
          var _a;
          const seasonNum = (_a = $2(el).find("h3.title > span").text().match(/S(\d+)/)) == null ? void 0 : _a[1];
          const href = $2(el).find("a").attr("href");
          if (href && parseInt(seasonNum) === (season || 1)) {
            targetUrl = href;
          }
        });
      }
      const targetPage = yield (yield fetch(targetUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $3 = cheerio.load(targetPage);
      const targetBodyClass = $3("body").attr("class") || "";
      const targetTermMatch = targetBodyClass.match(/(?:term|postid)-(\d+)/);
      const targetTerm = (targetTermMatch == null ? void 0 : targetTermMatch[1]) || term;
      const streams = [];
      const epNum = episode || 1;
      for (let i = 0; i <= 10; i++) {
        try {
          const iframePageUrl = `${BASE_URL}/?trdekho=${i}&trid=${targetTerm}&trtype=${mediaType2}`;
          const iframePageHtml = yield (yield fetch(iframePageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
          const $4 = cheerio.load(iframePageHtml);
          const iframeSrc = $4("iframe").attr("src");
          if (iframeSrc && iframeSrc.startsWith("http")) {
            streams.push({
              url: iframeSrc,
              quality: "Unknown",
              title: `AnimeDekho [S${season || 1}E${epNum}]`,
              subtitles: []
            });
          }
        } catch (_) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[AnimeDekho]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
