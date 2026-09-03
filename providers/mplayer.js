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
const BASE_URL = "https://www.mxplayer.in";
const WEB_API = "https://api.mxplayer.in/v1/web";
const ENDPOINT_URL = "https://d3sgzbosmwirao.cloudfront.net/";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": `${BASE_URL}/`
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var _a;
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      let userId = "";
      try {
        const homeResp = yield fetch(BASE_URL, { headers: HEADERS, skipSizeCheck: true });
        const cookieHeader = ((_a = homeResp.headers) == null ? void 0 : _a.get("set-cookie")) || "";
        const userIdMatch = cookieHeader.match(/UserID=([^;]+)/);
        if (userIdMatch)
          userId = userIdMatch[1];
      } catch (e) {
      }
      const endParam = `&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`;
      const searchResp = yield fetch(`${WEB_API}/search/resultv2?query=${encodeURIComponent(title)}${endParam}`, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Content-Type": "application/json" }),
        body: "{}",
        skipSizeCheck: true
      });
      const searchText = yield searchResp.text();
      let searchRoot;
      try {
        searchRoot = JSON.parse(searchText);
      } catch (e) {
        return [];
      }
      const sections = searchRoot.sections || [];
      let bestMatch = null;
      const isMovie = mediaType === "movie";
      for (const section of sections) {
        for (const item of section.items || []) {
          const itemTitle = item.title || "";
          const itemType = item.type || "";
          if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
            if (isMovie && itemType.includes("movie")) {
              bestMatch = item;
              break;
            } else if (!isMovie && itemType.includes("tvshow")) {
              bestMatch = item;
              break;
            } else if (!bestMatch) {
              bestMatch = item;
            }
          }
        }
        if (bestMatch)
          break;
      }
      if (!bestMatch)
        return [];
      const streams = [];
      const extractStreamUrls = (streamObj) => {
        var _a2, _b;
        const urls = [];
        if (!streamObj)
          return urls;
        const hlsObj = streamObj.hls || ((_a2 = streamObj.mxplay) == null ? void 0 : _a2.hls);
        const dashObj = streamObj.dash || ((_b = streamObj.mxplay) == null ? void 0 : _b.dash);
        const thirdParty = streamObj.thirdParty;
        for (const variant of ["high", "base", "main"]) {
          if (hlsObj == null ? void 0 : hlsObj[variant])
            urls.push(normalizeUrl(hlsObj[variant]));
          if (dashObj == null ? void 0 : dashObj[variant])
            urls.push(normalizeUrl(dashObj[variant]));
        }
        if (thirdParty == null ? void 0 : thirdParty.hlsUrl)
          urls.push(thirdParty.hlsUrl);
        if (thirdParty == null ? void 0 : thirdParty.dashUrl)
          urls.push(thirdParty.dashUrl);
        return [...new Set(urls.filter(Boolean))];
      };
      if (isMovie) {
        const movieStream = bestMatch.stream;
        const urls = extractStreamUrls(movieStream);
        for (const url of urls) {
          streams.push({
            url,
            quality: url.includes(".m3u8") ? "1080p" : "Unknown",
            title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
            subtitles: []
          });
        }
      } else {
        const shareUrl = bestMatch.shareUrl;
        if (!shareUrl)
          return [];
        const fullShareUrl = `${BASE_URL}${shareUrl}`;
        try {
          const seasonPageResp = yield fetch(fullShareUrl, { headers: HEADERS, skipSizeCheck: true });
          const seasonHtml = yield seasonPageResp.text();
          const $ = cheerio.load(seasonHtml);
          const seasonItems = [];
          $("div.hs__items-container > div").each((i, el) => {
            const tab = parseInt($(el).attr("data-tab") || "0");
            const id = $(el).attr("data-id");
            if (id)
              seasonItems.push({ tab, id });
          });
          const targetSeason = season ? seasonItems.find((s) => s.tab === parseInt(season)) : seasonItems[0];
          if (!targetSeason)
            return [];
          const episodesUrl = `${WEB_API}/detail/tab/tvshowepisodes?type=season&id=${targetSeason.id}&sortOrder=0${endParam}`;
          const epsResp = yield fetch(episodesUrl, { headers: HEADERS, skipSizeCheck: true });
          const epsData = yield epsResp.json();
          const epItems = epsData.items || [];
          let targetEp = null;
          if (episode) {
            targetEp = epItems.find((ep) => ep.sequence === parseInt(episode) || ep.sequence === episode);
          }
          if (!targetEp)
            targetEp = epItems[0];
          if (!targetEp)
            return [];
          const epStream = targetEp.stream;
          const epUrls = extractStreamUrls(epStream);
          for (const url of epUrls) {
            streams.push({
              url,
              quality: url.includes(".m3u8") ? "1080p" : "Unknown",
              title: `MXPlayer${url.includes(".m3u8") ? " HLS" : " DASH"}`,
              subtitles: []
            });
          }
        } catch (e) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[MPlayer]", e);
      return [];
    }
  });
}
function normalizeUrl(url) {
  if (!url)
    return null;
  if (url.startsWith("http"))
    return url;
  return ENDPOINT_URL + url;
}
module.exports = { getStreams };
