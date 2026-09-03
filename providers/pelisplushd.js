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
const BASE_URL = "https://pelisplushd.nz";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/"
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const imdbId = mediaInfo.imdb_id || ((_a = mediaInfo == null ? void 0 : mediaInfo.external_ids) == null ? void 0 : _a.imdb_id);
      if (!imdbId)
        return [];
      const iframePath = season && episode ? `${BASE_URL}/f/${imdbId}-${season}x0${episode}` : `${BASE_URL}/f/${imdbId}`;
      const pageHtml = yield (yield fetch(iframePath, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const scriptContent = $("script:not([src])").toArray().map((el) => $(el).html() || "").find((s) => s.includes("dataLink"));
      if (!scriptContent)
        return [];
      const jsonStr = (_b = scriptContent.split("dataLink = ")[1]) == null ? void 0 : _b.split(";")[0];
      if (!jsonStr)
        return [];
      let dataLink;
      try {
        dataLink = JSON.parse(jsonStr);
      } catch (_) {
        return [];
      }
      const streams = [];
      for (const langEntry of dataLink) {
        const language = langEntry.video_language || "Unknown";
        const embeds = langEntry.sortedEmbeds || [];
        const serverLinks = embeds.map((e) => `"${e.link}"`).filter((l) => l !== '""');
        if (serverLinks.length === 0)
          continue;
        try {
          const body = JSON.stringify({ links: serverLinks });
          const decryptResp = yield (yield fetch(`${BASE_URL}/api/decrypt`, {
            method: "POST",
            headers: __spreadProps(__spreadValues({}, HEADERS), { "Content-Type": "application/json; charset=utf-8" }),
            body,
            skipSizeCheck: true
          })).json();
          if ((decryptResp == null ? void 0 : decryptResp.success) && Array.isArray(decryptResp.links)) {
            for (const linkObj of decryptResp.links) {
              const url = linkObj.link;
              if (url && url.startsWith("http")) {
                streams.push({
                  url,
                  quality: extractQuality(url),
                  title: `Pelisplushd [${language}]`,
                  subtitles: []
                });
              }
            }
          }
        } catch (_) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Pelisplushd]", e);
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
