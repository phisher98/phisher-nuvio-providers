"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
var stdin_exports = {};
__export(stdin_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(stdin_exports);
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
const BASE_URL = "https://dudefilms.sarl";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Referer: `${BASE_URL}/`
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, headers = HEADERS) {
    return yield (yield fetch(url, {
      headers
    })).text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, headers = HEADERS) {
    return yield (yield fetch(url, {
      headers
    })).json();
  });
}
function normalizeQuality(q) {
  const n = parseInt(q);
  if (n >= 2160)
    return "2160p";
  if (n >= 1440)
    return "1440p";
  if (n >= 1080)
    return "1080p";
  if (n >= 720)
    return "720p";
  if (n >= 480)
    return "480p";
  return "Unknown";
}
function extractQuality(str = "") {
  const match = str.match(
    /(\d{3,4})p/i
  );
  return normalizeQuality(
    match == null ? void 0 : match[1]
  );
}
function resolveTmdbId(id, mediaType) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    if (!String(id).startsWith(
      "tt"
    )) {
      return id;
    }
    const url = `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = yield fetchJson(url);
    return mediaType === "movie" ? (_b = (_a = data == null ? void 0 : data.movie_results) == null ? void 0 : _a[0]) == null ? void 0 : _b.id : (_d = (_c = data == null ? void 0 : data.tv_results) == null ? void 0 : _c[0]) == null ? void 0 : _d.id;
  });
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const data = yield fetchJson(url);
    return data.title || data.name;
  });
}
function hubCloudExtractor(url) {
  return __async(this, null, function* () {
    return [
      {
        source: "HubCloud",
        quality: "1080p",
        url
      }
    ];
  });
}
function loadExtractor(url) {
  return __async(this, null, function* () {
    if (!url)
      return [];
    if (url.includes("hubcloud")) {
      return yield hubCloudExtractor(
        url
      );
    }
    return [
      {
        source: "Direct",
        quality: extractQuality(url),
        url
      }
    ];
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      tmdbId = yield resolveTmdbId(
        tmdbId,
        mediaType
      );
      const title = yield getTmdbTitle(
        tmdbId,
        mediaType
      );
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;
      const searchHtml = yield fetchText(
        searchUrl
      );
      const $ = import_cheerio_without_node_native.default.load(searchHtml);
      const results = [];
      $(
        "div.simple-grid-grid-post"
      ).each((i, el) => {
        const href = $(
          "h3 a",
          el
        ).attr("href");
        const t = $(
          "h3",
          el
        ).text().trim();
        if (href) {
          results.push({
            title: t,
            url: href
          });
        }
      });
      if (!results.length)
        return [];
      const match = results[0];
      const pageHtml = yield fetchText(
        match.url
      );
      const $page = import_cheerio_without_node_native.default.load(pageHtml);
      const streams = [];
      const buttons = $page(
        "a.maxbutton"
      ).toArray();
      for (const btn of buttons) {
        const href = $page(btn).attr(
          "href"
        );
        if (!href)
          continue;
        const extracted = yield loadExtractor(
          href
        );
        extracted.forEach(
          (link) => {
            streams.push({
              name: "DudeFilms",
              title,
              url: link.url,
              quality: normalizeQuality(
                link.quality
              ),
              headers: HEADERS
            });
          }
        );
      }
      const seen = /* @__PURE__ */ new Set();
      return streams.filter(
        (s) => {
          if (!s.url || seen.has(s.url)) {
            return false;
          }
          seen.add(s.url);
          return true;
        }
      );
    } catch (e) {
      console.log(
        `[DudeFilms] ${e.message}`
      );
      return [];
    }
  });
}
