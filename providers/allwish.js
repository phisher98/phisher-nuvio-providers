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
const BASE_URL = "https://all-wish.me";
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const XML_HEADER = {
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
};
function btoa(str) {
  return Buffer.from(
    str,
    "binary"
  ).toString("base64");
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, headers = XML_HEADER) {
    const res = yield fetch(url, {
      headers
    });
    return yield res.json();
  });
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, headers = XML_HEADER) {
    const res = yield fetch(url, {
      headers
    });
    return yield res.text();
  });
}
function resolveTmdbId(id, mediaType) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    if (!String(id).startsWith("tt")) {
      return id;
    }
    console.log(
      `[TMDB] Resolving IMDb ID ${id}`
    );
    const url = `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const data = yield fetchJson(url);
    let tmdbId = null;
    if (mediaType === "movie") {
      tmdbId = (_b = (_a = data == null ? void 0 : data.movie_results) == null ? void 0 : _a[0]) == null ? void 0 : _b.id;
    } else {
      tmdbId = (_d = (_c = data == null ? void 0 : data.tv_results) == null ? void 0 : _c[0]) == null ? void 0 : _d.id;
    }
    if (!tmdbId) {
      throw new Error(
        "Failed to resolve TMDB ID"
      );
    }
    console.log(
      `[TMDB] IMDb ${id} -> TMDB ${tmdbId}`
    );
    return tmdbId;
  });
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(
      `[TMDB] Fetching ${tmdbUrl}`
    );
    const mediaInfo = yield fetchJson(tmdbUrl);
    return mediaInfo.title || mediaInfo.name;
  });
}
function generateEpisodeVrf(episodeId) {
  const secretKey = "ysJhV6U27FVIjjuk";
  const encodedId = encodeURIComponent(
    episodeId
  );
  const keyCodes = secretKey.split("").map(
    (c) => c.charCodeAt(0)
  );
  const dataCodes = encodedId.split("").map(
    (c) => c.charCodeAt(0)
  );
  const n = Array.from(
    { length: 256 },
    (_, i) => i
  );
  let a = 0;
  for (let o2 = 0; o2 < 256; o2++) {
    a = (a + n[o2] + keyCodes[o2 % keyCodes.length]) % 256;
    [n[o2], n[a]] = [
      n[a],
      n[o2]
    ];
  }
  const out = [];
  let o = 0;
  a = 0;
  for (let r = 0; r < dataCodes.length; r++) {
    o = (o + 1) % 256;
    a = (a + n[o]) % 256;
    [n[o], n[a]] = [
      n[a],
      n[o]
    ];
    const k = n[(n[o] + n[a]) % 256];
    out.push(
      dataCodes[r] ^ k
    );
  }
  const bytes = new Uint8Array(
    out.map(
      (b) => b & 255
    )
  );
  const base64 = btoa(
    String.fromCharCode(
      ...bytes
    )
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const transformed = [];
  for (let i = 0; i < base64.length; i++) {
    let s = base64.charCodeAt(i);
    const mod = i % 8;
    if (mod === 1)
      s += 3;
    else if (mod === 7)
      s += 5;
    else if (mod === 2)
      s -= 4;
    else if (mod === 4)
      s -= 2;
    else if (mod === 6)
      s += 4;
    else if (mod === 0)
      s -= 3;
    else if (mod === 3)
      s += 2;
    else if (mod === 5)
      s += 5;
    transformed.push(
      s & 255
    );
  }
  const bytes2 = new Uint8Array(
    transformed
  );
  const base2 = btoa(
    String.fromCharCode(
      ...bytes2
    )
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base2.replace(
    /[A-Za-z]/g,
    (c) => {
      const base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(
        (c.charCodeAt(0) - base + 13) % 26 + base
      );
    }
  );
}
function extractMegaPlay(realUrl, sectionType) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const embedHtml = yield fetchText(realUrl, {
        Referer: "https://megaplay.buzz/",
        "User-Agent": "Mozilla/5.0"
      });
      const dataIdMatch = embedHtml.match(
        /data-id="(\d+)"/
      );
      const megaId = dataIdMatch == null ? void 0 : dataIdMatch[1];
      if (!megaId) {
        console.log(
          "[MegaPlay] No data-id"
        );
        return [];
      }
      console.log(
        `[MegaPlay] data-id: ${megaId}`
      );
      const megaApi = `https://megaplay.buzz/stream/getSources?id=${megaId}`;
      const megaRes = yield fetchJson(
        megaApi,
        {
          Referer: realUrl,
          Origin: "https://megaplay.buzz",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0"
        }
      );
      const source = (_a = megaRes == null ? void 0 : megaRes.sources) == null ? void 0 : _a.file;
      if (!source)
        return [];
      return [
        {
          name: `AllWish - MegaPlay ${(sectionType || "SUB").toUpperCase()}`,
          title: `MegaPlay ${(sectionType || "SUB").toUpperCase()}`,
          url: source,
          quality: "1080p",
          subtitles: ((_b = megaRes == null ? void 0 : megaRes.tracks) == null ? void 0 : _b.map(
            (track) => ({
              lang: track.label || "Unknown",
              url: track.file
            })
          )) || [],
          headers: {
            Referer: "https://rapid-cloud.co/",
            Origin: "https://rapid-cloud.co"
          }
        }
      ];
    } catch (e) {
      console.log(
        `[MegaPlay] ${e.message}`
      );
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var _a;
    try {
      console.log(
        `[AllWish] Fetching ${mediaType} ${tmdbId}`
      );
      tmdbId = yield resolveTmdbId(
        tmdbId,
        mediaType
      );
      console.log(
        `[AllWish] Using TMDB ID ${tmdbId}`
      );
      const title = yield getTmdbTitle(
        tmdbId,
        mediaType
      );
      if (!title) {
        console.log(
          "[AllWish] No title found"
        );
        return [];
      }
      console.log(
        `[AllWish] Title: ${title}`
      );
      const searchUrl = `${BASE_URL}/filter?keyword=` + encodeURIComponent(
        title
      );
      const searchHtml = yield fetchText(
        searchUrl
      );
      const $ = import_cheerio_without_node_native.default.load(
        searchHtml
      );
      let animeUrl = null;
      $("div.item").each(
        (_, item) => {
          const href = $(item).find(
            "div.name > a"
          ).attr("href");
          if (href && !animeUrl) {
            animeUrl = href.startsWith(
              "http"
            ) ? href : BASE_URL + href;
            animeUrl = animeUrl.replace(
              /\/+$/,
              ""
            );
          }
        }
      );
      if (!animeUrl) {
        console.log(
          "[AllWish] No anime page found"
        );
        return [];
      }
      console.log(
        `[AllWish] Anime URL: ${animeUrl}`
      );
      const animePage = yield fetchText(
        animeUrl
      );
      const $2 = import_cheerio_without_node_native.default.load(
        animePage
      );
      const dataId = $2(
        "main > div.container"
      ).attr("data-id");
      if (!dataId) {
        console.log(
          "[AllWish] No data-id"
        );
        return [];
      }
      console.log(
        `[AllWish] Data ID: ${dataId}`
      );
      const vrf = generateEpisodeVrf(
        dataId
      );
      const epListUrl = `${BASE_URL}/ajax/episode/list/${dataId}?vrf=${vrf}`;
      const epListRes = yield fetchJson(
        epListUrl
      );
      if (!epListRes || epListRes.status !== 200) {
        console.log(
          "[AllWish] Episode list failed"
        );
        return [];
      }
      const $3 = import_cheerio_without_node_native.default.load(
        epListRes.result || ""
      );
      let episodeIds = null;
      const targetEp = episode || 1;
      $3(
        "div.range > div > a"
      ).each((_, el) => {
        const slug = $3(el).attr(
          "data-slug"
        );
        const epNum = parseInt(
          slug,
          10
        );
        if (epNum === targetEp) {
          episodeIds = $3(el).attr(
            "data-ids"
          );
        }
      });
      if (!episodeIds) {
        const firstEp = $3(
          "div.range > div > a"
        ).first();
        episodeIds = firstEp.attr(
          "data-ids"
        );
      }
      if (!episodeIds) {
        console.log(
          "[AllWish] No episode IDs"
        );
        return [];
      }
      console.log(
        `[AllWish] Episode IDs: ${episodeIds}`
      );
      const serverListUrl = `${BASE_URL}/ajax/server/list?servers=${episodeIds}`;
      const serverListRes = yield fetchJson(
        serverListUrl
      );
      if (!serverListRes || serverListRes.status !== 200) {
        console.log(
          "[AllWish] Server list failed"
        );
        return [];
      }
      const $4 = import_cheerio_without_node_native.default.load(
        serverListRes.result || ""
      );
      const serverEls = [];
      $4(
        "div.server-type"
      ).each(
        (_, section) => {
          $4(section).find(
            "div.server-list > div.server"
          ).each(
            (__, server) => {
              const dataLinkId = $4(server).attr(
                "data-link-id"
              );
              const sectionType = $4(section).attr(
                "data-type"
              );
              if (dataLinkId) {
                serverEls.push(
                  {
                    dataLinkId,
                    sectionType
                  }
                );
              }
            }
          );
        }
      );
      console.log(
        `[AllWish] Servers found: ${serverEls.length}`
      );
      const streams = [];
      for (const {
        dataLinkId,
        sectionType
      } of serverEls.slice(
        0,
        5
      )) {
        try {
          const apiUrl = `${BASE_URL}/ajax/server?get=${dataLinkId}`;
          const apiRes = yield fetchJson(
            apiUrl
          );
          const realUrl = (_a = apiRes == null ? void 0 : apiRes.result) == null ? void 0 : _a.url;
          if (!realUrl)
            continue;
          if (realUrl.includes(
            "megaplay"
          ) || realUrl.includes(
            "rapid-cloud"
          )) {
            const megaStreams = yield extractMegaPlay(
              realUrl,
              sectionType
            );
            streams.push(
              ...megaStreams
            );
            continue;
          }
          streams.push({
            name: `AllWish - ${(sectionType || "SUB").toUpperCase()}`,
            title: `AllWish ${(sectionType || "SUB").toUpperCase()}`,
            url: realUrl,
            quality: "1080p"
          });
        } catch (err) {
          console.log(
            `[AllWish] Server error: ${err.message}`
          );
        }
      }
      console.log(
        `[AllWish] Streams found: ${streams.length}`
      );
      return streams;
    } catch (e) {
      console.log(
        `[AllWish] Error: ${e.message}`
      );
      return [];
    }
  });
}
