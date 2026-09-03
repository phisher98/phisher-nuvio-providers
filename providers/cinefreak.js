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

// src/providers/cinefreak.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://cinefreak.nl";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Cookie": "xla=s4t"
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
  if (u.includes("360p"))
    return "360p";
  return "Unknown";
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/search-api.php?q=${encodeURIComponent(title)}&pg=1`;
      const searchData = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const results = searchData.results || [];
      if (!results.length)
        return [];
      const isTV = mediaType === "tv";
      const searchTitle = title.toLowerCase();
      let match = results.find((r) => r.t.toLowerCase().includes(searchTitle));
      if (!match)
        match = results[0];
      if (!match)
        return [];
      const pageUrl = match.l.startsWith("http") ? match.l : `${BASE_URL}/${match.l}/`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const streams = [];
      if (isTV) {
        let found = false;
        $("div.ep-card").each((i, card) => {
          if (found)
            return;
          const seasonMatch = $("span.season-number", card).text().match(/S(\d+)/);
          const cardSeason = seasonMatch ? parseInt(seasonMatch[1]) : 1;
          if (cardSeason !== season)
            return;
          const epMatch = $("span.episode-badge", card).text().match(/Episode\s+([\d\-]+)/i);
          if (!epMatch)
            return;
          const epNums = epMatch[1].split("-").map((n) => parseInt(n.trim())).filter(Boolean);
          if (!epNums.includes(episode))
            return;
          found = true;
          $("div.download-links a", card).each((j, a) => {
            const href = $(a).attr("href") || "";
            const text = $(a).text().trim();
            if (href) {
              streams.push({
                url: href,
                quality: extractQuality(text),
                title: `Cinefreak [${text}]`,
                subtitles: []
              });
            }
          });
        });
      } else {
        $("div.download-links-div").each((i, container) => {
          $("h4.movie-title", container).each((j, titleEl) => {
            const qualityMatch = $(titleEl).text().match(/(480p|720p|1080p|2160p)/);
            const qual = qualityMatch ? qualityMatch[1] : "Unknown";
            $(titleEl).next().find("a.dlbtn-download[href]").each((k, a) => {
              const href = $(a).attr("href") || "";
              if (href) {
                try {
                  const idMatch = href.match(/id=([^&]+)/);
                  if (idMatch) {
                    const decoded = atob(decodeURIComponent(idMatch[1])).replace(/newgo32.*/i, "").trim();
                    if (decoded.startsWith("http")) {
                      streams.push({
                        url: decoded,
                        quality: qual,
                        title: `Cinefreak [${qual}]`,
                        subtitles: []
                      });
                      return;
                    }
                  }
                } catch (e) {
                }
                streams.push({
                  url: href,
                  quality: qual,
                  title: `Cinefreak [${qual}]`,
                  subtitles: []
                });
              }
            });
          });
        });
      }
      return streams;
    } catch (e) {
      console.error("[Cinefreak]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
