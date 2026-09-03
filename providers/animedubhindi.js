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
const BASE_URL = "https://www.animedubhindi.me";
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
      $("article").each((_, el) => {
        if (!itemUrl) {
          const href = $(el).find("h2 a").attr("href");
          if (href)
            itemUrl = href;
        }
      });
      if (!itemUrl)
        return [];
      const itemHtml = yield (yield fetch(itemUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $2 = cheerio.load(itemHtml);
      const iframeLinkHref = $2("div.wp-block-button a").attr("href");
      if (!iframeLinkHref)
        return [];
      const rawTitle = $2("meta[property='og:title']").attr("content") || "";
      const isMovie = rawTitle.toLowerCase().includes("movie");
      if (isMovie) {
        const iframeHtml = yield (yield fetch(iframeLinkHref, { headers: HEADERS, skipSizeCheck: true })).text();
        const $3 = cheerio.load(iframeHtml);
        const streams = [];
        $3("div.entry-content h4").each((_, h4) => {
          const quality = $3(h4).text().split("[Size")[0].trim();
          $3(h4).find("a").each((__, a) => {
            const href = $3(a).attr("href");
            if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
              streams.push({
                url: href,
                quality: quality.includes("1080") ? "1080p" : quality.includes("720") ? "720p" : quality.includes("480") ? "480p" : "Unknown",
                title: `AnimeDubHindi [${quality}]`,
                subtitles: []
              });
            }
          });
        });
        return streams;
      } else {
        const targetEp = episode || 1;
        const iframeHtml = yield (yield fetch(iframeLinkHref, { headers: HEADERS, skipSizeCheck: true })).text();
        const $3 = cheerio.load(iframeHtml);
        const streams = [];
        $3("div.pro-ep-card").each((_, card) => {
          const epText = $3(card).find(".pro-ep-title").text();
          const epNum = parseInt(epText.replace("Episode:", "").trim());
          if (epNum === targetEp) {
            $3(card).find(".pro-btn-group a").each((__, a) => {
              const href = $3(a).attr("href");
              if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
                streams.push({
                  url: href,
                  quality: "Unknown",
                  title: `AnimeDubHindi [E${targetEp}]`,
                  subtitles: []
                });
              }
            });
          }
        });
        if (!streams.length) {
          $3("div.wp-block-group").each((_, block) => {
            const h2 = $3(block).find("h2:contains(Episode)");
            if (!h2.length)
              return;
            const epText = h2.text();
            const epNum = parseInt(epText.replace("Episode:", "").trim());
            if (epNum === targetEp) {
              $3(block).find("a").each((__, a) => {
                const href = $3(a).attr("href");
                if (href && (href.includes("hubcloud") || href.includes("gdflix"))) {
                  streams.push({
                    url: href,
                    quality: "Unknown",
                    title: `AnimeDubHindi [E${targetEp}]`,
                    subtitles: []
                  });
                }
              });
            }
          });
        }
        return streams;
      }
    } catch (e) {
      console.error("[AnimeDubHindi]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
