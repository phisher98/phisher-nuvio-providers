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
const BASE_URL = "https://netcinez.si";
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
      const searchResp = yield fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
        headers: HEADERS,
        skipSizeCheck: true
      });
      const searchHtml = yield searchResp.text();
      const $ = cheerio.load(searchHtml);
      const results = [];
      $("#box_movies > div.movie").each((i, el) => {
        const a = $(el).find("a").first();
        const href = a.attr("href");
        const name = $(el).find("h2").text().trim();
        if (href && name)
          results.push({ href, name });
      });
      if (results.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const match = results.find(
        (r) => r.name.toLowerCase().includes(title.toLowerCase())
      ) || results[0];
      const pageResp = yield fetch(match.href, { headers: HEADERS, skipSizeCheck: true });
      const pageHtml = yield pageResp.text();
      const $p = cheerio.load(pageHtml);
      const streams = [];
      const isTvUrl = match.href.includes("tvshows");
      if (!isMovie && isTvUrl) {
        let targetEpUrl = null;
        $p("div.post #cssmenu > ul li > ul > li").each((i, el) => {
          const datex = $p(el).find("a > span.datex").text().trim();
          const href = $p(el).find("a").attr("href");
          const parts = datex.split("-");
          const sNum = parseInt(parts[0] || "0");
          const eNum = parseInt(parts[1] || "0");
          if ((!season || sNum === parseInt(season)) && (!episode || eNum === parseInt(episode))) {
            if (!targetEpUrl && href)
              targetEpUrl = href;
          }
        });
        if (!targetEpUrl) {
          const firstLink = $p("div.post #cssmenu > ul li > ul > li a").first().attr("href");
          targetEpUrl = firstLink;
        }
        if (!targetEpUrl)
          return [];
        const epResp = yield fetch(targetEpUrl, { headers: HEADERS, skipSizeCheck: true });
        const epHtml = yield epResp.text();
        const $ep = cheerio.load(epHtml);
        const iframeUrl2 = $ep("#player-container iframe").attr("src") || $ep("#player-container iframe").attr("data-src");
        if (!iframeUrl2)
          return [];
        const fullIframeUrl2 = iframeUrl2.startsWith("http") ? iframeUrl2 : `https:${iframeUrl2}`;
        const iframeResp2 = yield fetch(fullIframeUrl2, {
          headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": BASE_URL }),
          skipSizeCheck: true
        });
        const iframeHtml2 = yield iframeResp2.text();
        const $ifr2 = cheerio.load(iframeHtml2);
        const btnLinks2 = [];
        $ifr2("div.btn-container a").each((i, el) => {
          const href = $ifr2(el).attr("href");
          const label = $ifr2(el).text().trim();
          if (href)
            btnLinks2.push({ href, label });
        });
        for (const btn of btnLinks2.slice(0, 5)) {
          try {
            const intermediateResp = yield fetch(btn.href, {
              headers: HEADERS,
              skipSizeCheck: true
            });
            const intermediateHtml = yield intermediateResp.text();
            const $int = cheerio.load(intermediateHtml);
            const finalA = $int("div.container a").attr("href");
            const finalSrc = $int("source").attr("src");
            const finalUrl = finalA || finalSrc;
            if (finalUrl) {
              const fullFinalUrl = finalUrl.startsWith("http") ? finalUrl : `https:${finalUrl}`;
              streams.push({
                url: fullFinalUrl,
                quality: extractQuality(btn.label + " " + fullFinalUrl),
                title: `Netcinez (${btn.label})`,
                subtitles: []
              });
            }
          } catch (e) {
          }
        }
        return streams;
      }
      const iframeUrl = $p("#player-container iframe").attr("src") || $p("#player-container iframe").attr("data-src");
      if (!iframeUrl)
        return [];
      const fullIframeUrl = iframeUrl.startsWith("http") ? iframeUrl : `https:${iframeUrl}`;
      const iframeResp = yield fetch(fullIframeUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": BASE_URL }),
        skipSizeCheck: true
      });
      const iframeHtml = yield iframeResp.text();
      const $ifr = cheerio.load(iframeHtml);
      const btnLinks = [];
      $ifr("div.btn-container a").each((i, el) => {
        const href = $ifr(el).attr("href");
        const label = $ifr(el).text().trim();
        if (href)
          btnLinks.push({ href, label });
      });
      for (const btn of btnLinks.slice(0, 5)) {
        try {
          const intermediateResp = yield fetch(btn.href, {
            headers: HEADERS,
            skipSizeCheck: true
          });
          const intermediateHtml = yield intermediateResp.text();
          const $int = cheerio.load(intermediateHtml);
          const finalA = $int("div.container a").attr("href");
          const finalSrc = $int("source").attr("src");
          const finalUrl = finalA || finalSrc;
          if (finalUrl) {
            const fullFinalUrl = finalUrl.startsWith("http") ? finalUrl : `https:${finalUrl}`;
            streams.push({
              url: fullFinalUrl,
              quality: extractQuality(btn.label + " " + fullFinalUrl),
              title: `Netcinez (${btn.label})`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[Netcinez]", e);
      return [];
    }
  });
}
function extractQuality(text) {
  const u = (text || "").toLowerCase();
  if (u.includes("2160p") || u.includes("4k"))
    return "4K";
  if (u.includes("1080p") || u.includes("fullhd"))
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
