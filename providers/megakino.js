var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
const BASE_URL = "https://megakino.team";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
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
      const searchResp = yield fetch(BASE_URL, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Content-Type": "application/x-www-form-urlencoded"
        }),
        body: `do=search&subaction=search&story=${encodeURIComponent(title.replace(/ /g, "+"))}`,
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("a.poster.grid-item").each((i, el) => {
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
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const streams = [];
      const iframes = [];
      $p("div.pmovie__player iframe").each((i, el) => {
        const src = $p(el).attr("src") || $p(el).attr("data-src");
        if (src)
          iframes.push(src);
      });
      if (iframes.length === 0 && mediaType === "tv") {
        $p("select.flex-grow-1.mr-select option").each((i, el) => {
          const epSeason = $p(el).attr("data-season");
          const epValue = $p(el).val();
          if (episode && epSeason) {
            if (parseInt(epSeason) === parseInt(episode)) {
              if (epValue)
                iframes.push(epValue);
            }
          }
        });
        if (iframes.length === 0) {
          const firstOption = $p("select.flex-grow-1.mr-select option").first();
          const val = firstOption.val();
          if (val)
            iframes.push(val);
        }
      }
      for (const iframeUrl of iframes.slice(0, 5)) {
        if (!iframeUrl || !iframeUrl.startsWith("http"))
          continue;
        try {
          if (iframeUrl.includes("gxplayer") || iframeUrl.includes("watch.gxplayer")) {
            const playerResp = yield fetch(iframeUrl, {
              headers: { "Referer": BASE_URL, "User-Agent": HEADERS["User-Agent"] },
              skipSizeCheck: true
            });
            const playerText = yield playerResp.text();
            const videoVarMatch = playerText.match(/var video\s*=\s*(\{[^;]+\});/);
            if (videoVarMatch) {
              const videoData = JSON.parse(videoVarMatch[1]);
              if (videoData.uid && videoData.md5 && videoData.id) {
                const gxBase = "https://watch.gxplayer.xyz";
                const m3u8Url = `${gxBase}/m3u8/${videoData.uid}/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=${videoData.status}`;
                streams.push({
                  url: m3u8Url,
                  quality: mapQuality(videoData.quality || ""),
                  title: "Megakino (Gxplayer)",
                  subtitles: []
                });
              }
            }
          } else {
            const playerResp = yield fetch(iframeUrl, {
              headers: { "Referer": BASE_URL, "User-Agent": HEADERS["User-Agent"] },
              skipSizeCheck: true
            });
            const playerText = yield playerResp.text();
            const m3u8Match = playerText.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/i);
            if (m3u8Match) {
              streams.push({
                url: m3u8Match[1],
                quality: "Unknown",
                title: "Megakino",
                subtitles: []
              });
            }
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Megakino]", e);
      return [];
    }
  });
}
function mapQuality(q) {
  const u = (q || "").toLowerCase();
  if (u.includes("4k") || u.includes("2160"))
    return "4K";
  if (u.includes("1080"))
    return "1080p";
  if (u.includes("720"))
    return "720p";
  if (u.includes("480"))
    return "480p";
  return "Unknown";
}
module.exports = { getStreams };
