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

// src/providers/latanime.js
var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://latanime.org";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
      const searchUrl = `${BASE_URL}/buscar?q=${encodeURIComponent(title)}`;
      const searchResp = yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("div.row a").each((i, el) => {
        const href = $(el).attr("href");
        const name = $(el).find("h3").text().trim();
        if (href && name)
          results.push({ href, name });
      });
      if (results.length === 0)
        return [];
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      const animeResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const animeHtml = yield animeResp.text();
      const $a = cheerio.load(animeHtml);
      const epLinks = [];
      $a("div.row a[href*='/ver/']").each((i, el) => {
        epLinks.push($a(el).attr("href"));
      });
      if (epLinks.length === 0)
        return [];
      let targetEpUrl = null;
      if (mediaType === "tv" && episode) {
        const epIndex = parseInt(episode) - 1;
        targetEpUrl = epLinks[epIndex] || epLinks[epLinks.length - 1];
      } else {
        targetEpUrl = epLinks[0];
      }
      if (!targetEpUrl)
        return [];
      const epPageResp = yield fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true });
      const epPageHtml = yield epPageResp.text();
      const $ep = cheerio.load(epPageHtml);
      const streams = [];
      const playerItems = [];
      $ep("#play-video a").each((i, el) => {
        const dataPlayer = $ep(el).attr("data-player");
        if (dataPlayer) {
          try {
            const decoded = atob(dataPlayer);
            const url = decoded.includes("=") ? decoded.substringAfter("=") : decoded;
            const actualUrl = decoded.split("=").slice(1).join("=");
            playerItems.push(actualUrl || decoded);
          } catch (e) {
          }
        }
      });
      for (const playerUrl of playerItems) {
        if (!playerUrl || !playerUrl.startsWith("http"))
          continue;
        if (playerUrl.includes(".m3u8")) {
          streams.push({
            url: playerUrl,
            quality: "1080p",
            title: "Latanime",
            subtitles: []
          });
          continue;
        }
        if (playerUrl.includes("zilla-networks")) {
          try {
            const id = playerUrl.split("/").pop();
            const m3u8 = `https://player.zilla-networks.com/m3u8/${id}`;
            streams.push({
              url: m3u8,
              quality: "1080p",
              title: "Latanime (Zilla)",
              subtitles: []
            });
          } catch (e) {
          }
          continue;
        }
        try {
          const pResp = yield fetch(playerUrl, { headers: HEADERS, skipSizeCheck: true });
          const pText = yield pResp.text();
          const m3u8Match = pText.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
          if (m3u8Match) {
            streams.push({
              url: m3u8Match[0],
              quality: "1080p",
              title: "Latanime",
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Latanime]", e);
      return [];
    }
  });
}
String.prototype.substringAfter = function(delimiter) {
  const idx = this.indexOf(delimiter);
  return idx === -1 ? this : this.slice(idx + delimiter.length);
};
module.exports = { getStreams };
