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
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const FALLBACK_URL = "https://ww105.pencurimoviesubmalay.guru";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
};
function getBaseUrl() {
  return __async(this, null, function* () {
    try {
      const domains = yield (yield fetch(DOMAINS_URL, { headers: HEADERS, skipSizeCheck: true })).json();
      return domains.pencurimoviesubmalay || FALLBACK_URL;
    } catch (_) {
      return FALLBACK_URL;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const BASE_URL = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $s = cheerio.load(searchHtml);
      let pageUrl = null;
      $s("div.item-box").each((_, el) => {
        if (!pageUrl) {
          const href = $s(el).find("a").attr("href");
          if (href && href.startsWith("http"))
            pageUrl = href;
        }
      });
      if (!pageUrl)
        return [];
      if (mediaType === "tv" && season && episode) {
        const showHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $show = cheerio.load(showHtml);
        let epUrl = null;
        $show("div.content-episodes ul.episodes-list li").each((_, el) => {
          const $ep = $show(el);
          const epNum = $ep.find("span.ep-num").text().trim();
          const classNames = ($ep.attr("class") || "").split(" ");
          const seasonClass = classNames.find((c) => /ep-\d+-\d+/.test(c));
          let epSeason = null;
          if (seasonClass) {
            epSeason = parseInt(seasonClass.split("-")[1]);
          }
          if (epNum && parseInt(epNum) === parseInt(episode) && (!epSeason || epSeason === parseInt(season))) {
            const href = $ep.find("a[href]").attr("href");
            if (href)
              epUrl = href.startsWith("http") ? href : BASE_URL + href;
          }
        });
        if (epUrl)
          pageUrl = epUrl;
      }
      const pageHtml = yield (yield fetch(pageUrl, { headers: HEADERS, skipSizeCheck: true })).text();
      const $ = cheerio.load(pageHtml);
      const streams = [];
      const playerItems = $("#playeroptionsul > li").toArray();
      for (const li of playerItems) {
        const post = $(li).attr("data-post") || "";
        const nume = $(li).attr("data-nume") || "";
        const type = $(li).attr("data-type") || "";
        if (!post || !nume)
          continue;
        try {
          const ajaxResp = yield (yield fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
            method: "POST",
            headers: __spreadProps(__spreadValues({}, HEADERS), {
              "Referer": pageUrl,
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Requested-With": "XMLHttpRequest"
            }),
            body: `action=zeta_player_ajax&post=${post}&nume=${nume}&type=${type}`,
            skipSizeCheck: true
          })).json();
          const embedUrl = ajaxResp == null ? void 0 : ajaxResp.embed_url;
          if (!embedUrl)
            continue;
          const $embed = cheerio.load(embedUrl);
          const iframeSrc = $embed("iframe").attr("src");
          if (iframeSrc && iframeSrc.startsWith("http")) {
            streams.push({
              url: iframeSrc,
              quality: extractQuality(iframeSrc),
              title: "PMSM",
              subtitles: []
            });
          }
        } catch (_) {
        }
      }
      return streams;
    } catch (e) {
      console.error("[PMSM]", e);
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
