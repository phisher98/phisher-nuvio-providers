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
const BASE_URL = "https://coflix.wales";
const COFLIX_API = `${BASE_URL}/wp-json/apiflix/v1`;
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
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/suggest.php?query=${encodeURIComponent(title)}`;
      const searchResults = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      if (!Array.isArray(searchResults) || !searchResults.length)
        return [];
      const isTV = mediaType === "tv";
      const lcTitle = title.toLowerCase();
      let match = searchResults.find((r) => (r.title || "").toLowerCase().includes(lcTitle));
      if (!match)
        match = searchResults[0];
      if (!match || !match.url)
        return [];
      const pageUrl = match.url.startsWith("http") ? match.url : `${BASE_URL}${match.url}`;
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      let streamPageUrl = pageUrl;
      if (isTV) {
        const postId = $("section.sc-seasons ul li input[post-id]").first().attr("post-id");
        const dataSeason = $(`section.sc-seasons ul li input[data-season="${season}"]`).attr("post-id") || $("section.sc-seasons ul li input").filter((i, el) => $(el).attr("data-season") == season).attr("post-id") || postId;
        if (!dataSeason)
          return [];
        const epResUrl = `${COFLIX_API}/series/${dataSeason}/${season}`;
        const epData = yield (yield fetch(epResUrl, { headers: HEADERS, skipSizeCheck: true })).json();
        const episodes = epData.episodes || [];
        const ep = episodes.find((e) => parseInt(e.number) === episode || parseInt(e.season) === season && parseInt(e.number) === episode);
        if (!ep || !ep.links)
          return [];
        streamPageUrl = ep.links;
      }
      const streamHtml = yield (yield fetch(streamPageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $stream = cheerio.load(streamHtml);
      const iframeSrc = $stream("div.embed iframe").attr("src") || "";
      if (!iframeSrc)
        return [];
      const iframeHtml = yield (yield fetch(iframeSrc, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: BASE_URL }), skipSizeCheck: true })).text();
      const $iframe = cheerio.load(iframeHtml);
      const streams = [];
      $iframe("li[onclick]").each((i, li) => {
        const onclick = $iframe(li).attr("onclick") || "";
        const b64Match = onclick.match(/showVideo\('([^']+)'/);
        if (!b64Match)
          return;
        try {
          const url = atob(b64Match[1]);
          if (url.startsWith("http")) {
            streams.push({
              url,
              quality: extractQuality(url),
              title: `Coflix [${$iframe(li).text().trim() || "Stream"}]`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      });
      return streams;
    } catch (e) {
      console.error("[Coflix]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
