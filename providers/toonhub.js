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

// src/providers/toonhub.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://toonhub4u.co";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
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
      const firstResult = $("li.post-item a").first();
      let href = firstResult.attr("href");
      if (!href)
        return [];
      if (!href.startsWith("http"))
        href = BASE_URL + href;
      const pageHtml = yield (yield fetch(href, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const isTvSeries = $page("div.entry-content p strong").text().includes("TV Series");
      const streams = [];
      if (isTvSeries && mediaType === "tv" && season != null && episode != null) {
        const epRegex = /Episode\s*(\d+)/i;
        $page(".entry-content.entry.clearfix").each((_, content) => {
          $page(content).find("p").each((_2, pTag) => {
            const pText = $page(pTag).text();
            const epMatch = pText.match(epRegex);
            if (epMatch && parseInt(epMatch[1]) === parseInt(episode)) {
              let nextEl = $page(pTag).next();
              while (nextEl.length && nextEl.prop("tagName") !== "HR") {
                if (nextEl.prop("tagName") === "P") {
                  nextEl.find("a[href]").each((_3, a) => {
                    const link = $page(a).attr("href");
                    if (link) {
                      streams.push({
                        url: link.replace("/file/", "/embed/"),
                        quality: extractQuality(link),
                        title: "ToonHub4u",
                        subtitles: []
                      });
                    }
                  });
                }
                nextEl = nextEl.next();
              }
            }
          });
        });
      } else {
        $page("div.mks_toggle_content a").each((_, el) => {
          const link = $page(el).attr("href");
          if (link) {
            streams.push({
              url: link.replace("/file/", "/embed/"),
              quality: extractQuality(link),
              title: "ToonHub4u",
              subtitles: []
            });
          }
        });
      }
      return streams.slice(0, 5);
    } catch (e) {
      console.error("[ToonHub4u]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
