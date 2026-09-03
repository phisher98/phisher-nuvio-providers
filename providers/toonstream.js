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
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
function getBaseUrl() {
  return __async(this, null, function* () {
    try {
      const domains = yield (yield fetch(DOMAINS_URL, { skipSizeCheck: true })).json();
      return domains.toonstream || "https://toonstream.vip";
    } catch (e) {
      return "https://toonstream.vip";
    }
  });
}
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
      const BASE_URL = yield getBaseUrl();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      let searchHref = null;
      for (let i = 1; i <= 3; i++) {
        const searchUrl = `${BASE_URL}/page/${i}/?s=${encodeURIComponent(title)}`;
        const searchHtml = yield (yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true })).text();
        const $ = cheerio.load(searchHtml);
        const first = $("#movies-a > ul > li article > a").first().attr("href");
        if (first) {
          searchHref = first;
          break;
        }
      }
      if (!searchHref)
        return [];
      if (!searchHref.startsWith("http"))
        searchHref = BASE_URL + searchHref;
      const pageHtml = yield (yield fetch(searchHref, { headers: HEADERS, skipSizeCheck: true })).text();
      const $page = cheerio.load(pageHtml);
      const isSeries = searchHref.includes("series") || mediaType === "tv";
      const streams = [];
      if (isSeries && season != null && episode != null) {
        const seasonElements = [];
        $page("div.aa-drp.choose-season > ul > li > a").each((_, el) => {
          const dataPost = $page(el).attr("data-post");
          const dataSeason = $page(el).attr("data-season");
          if (dataPost && dataSeason) {
            seasonElements.push({ dataPost, dataSeason });
          }
        });
        const targetSeasonNum = String(season);
        let targetSeason = seasonElements.find((s) => s.dataSeason === targetSeasonNum) || seasonElements[parseInt(season) - 1];
        if (targetSeason) {
          const ajaxResponse = yield (yield fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
            method: "POST",
            headers: __spreadProps(__spreadValues({}, HEADERS), {
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Requested-With": "XMLHttpRequest"
            }),
            body: `action=action_select_season&season=${targetSeason.dataSeason}&post=${targetSeason.dataPost}`,
            skipSizeCheck: true
          })).text();
          const $season = cheerio.load(ajaxResponse);
          const episodeLinks = [];
          $season("article").each((_, ep) => {
            const epHref = $season(ep).find("article > a").attr("href") || "";
            const epName = $season(ep).find("article > header.entry-header > h2").text();
            episodeLinks.push({ href: epHref, name: epName });
          });
          const targetEp = episodeLinks[parseInt(episode) - 1] || episodeLinks.find(
            (e) => e.name.includes(`Episode ${episode}`) || e.name.includes(`Ep ${episode}`)
          );
          if (targetEp && targetEp.href) {
            const epPageHtml = yield (yield fetch(targetEp.href, { headers: HEADERS, skipSizeCheck: true })).text();
            const $ep = cheerio.load(epPageHtml);
            const serverLinks = [];
            $ep("#aa-options > div > iframe").each((_, el) => {
              const src = $ep(el).attr("data-src");
              if (src)
                serverLinks.push(src);
            });
            for (const serverLink of serverLinks.slice(0, 3)) {
              try {
                const serverHtml = yield (yield fetch(serverLink, { headers: HEADERS, skipSizeCheck: true })).text();
                const $server = cheerio.load(serverHtml);
                const trueLink = $server("iframe").attr("src") || "";
                if (trueLink) {
                  streams.push({
                    url: trueLink,
                    quality: extractQuality(trueLink),
                    title: "Toonstream",
                    subtitles: []
                  });
                }
              } catch (e) {
              }
            }
          }
        }
      } else {
        $page("#aa-options > div > iframe").each((_, el) => {
          const src = $page(el).attr("data-src");
          if (src) {
            streams.push({
              url: src,
              quality: extractQuality(src),
              title: "Toonstream",
              subtitles: []
            });
          }
        });
      }
      return streams;
    } catch (e) {
      console.error("[Toonstream]", e);
      return [];
    }
  });
}
module.exports = { getStreams };
