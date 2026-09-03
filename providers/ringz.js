var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// src/utils/extractors.js
var require_extractors = __commonJS({
  "src/utils/extractors.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    function unpack(packed) {
      const regex = new RegExp('eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\"(.*?)\\"\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\"(.*?)\\"\\.split\\(\\"\\|\\"\\)', "s");
      let match = packed.match(regex);
      if (!match) {
        const regexSq = new RegExp("eval\\s*\\(\\s*function\\s*\\(\\s*p\\s*,\\s*a\\s*,\\s*c\\s*,\\s*k\\s*,\\s*e\\s*,\\s*d\\s*\\).*?return\\s+p\\s*}\\s*\\(\\s*\\'(.*?)\\'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*\\'(.*?)\\'\\.split\\(\\'\\|\\'\\)", "s");
        match = packed.match(regexSq);
      }
      if (!match)
        return null;
      let p = match[1];
      const a = parseInt(match[2], 10);
      let c = parseInt(match[3], 10);
      const k = match[4].split("|");
      function e(c2) {
        return (c2 < a ? "" : e(Math.floor(c2 / a))) + (c2 % a > 35 ? String.fromCharCode(c2 % a + 29) : (c2 % a).toString(36));
      }
      while (c--) {
        if (k[c]) {
          const pattern = new RegExp("\\b" + e(c) + "\\b", "g");
          p = p.replace(pattern, k[c]);
        }
      }
      return p;
    }
    function extractVidmoly(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const m = html.match(/file:\s*["'](.*?m3u8.*?)["']/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Vidmoly" };
        } catch (e) {
        }
        return null;
      });
    }
    function extractFilemoon(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Filemoon" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractStreamhide(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url, { headers: { "Referer": url } });
          const html = yield res.text();
          const unpacked = unpack(html);
          if (unpacked) {
            const m = unpacked.match(/sources:\s*\[\s*{\s*file:\s*["'](.*?m3u8.*?)["']/);
            if (m)
              return { url: m[1], quality: "Unknown", source: "Streamhide" };
          }
        } catch (e) {
        }
        return null;
      });
    }
    function extractVoe(url) {
      return __async(this, null, function* () {
        try {
          const res = yield fetch(url);
          const html = yield res.text();
          const m = html.match(/hls':\s*'(.*?)'/);
          if (m)
            return { url: m[1], quality: "Unknown", source: "Voe" };
        } catch (e) {
        }
        return null;
      });
    }
    function extract2(url) {
      return __async(this, null, function* () {
        if (!url)
          return null;
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("vidmoly")) {
          return yield extractVidmoly(url);
        } else if (lowerUrl.includes("filemoon") || lowerUrl.includes("abyssplayer") || lowerUrl.includes("rubystm")) {
          return yield extractFilemoon(url);
        } else if (lowerUrl.includes("streamhide") || lowerUrl.includes("cloudy.upns") || lowerUrl.includes("gdmirrorbot") || lowerUrl.includes("emturbovid")) {
          return yield extractStreamhide(url);
        } else if (lowerUrl.includes("voe.sx") || lowerUrl.includes("voe.network")) {
          return yield extractVoe(url);
        }
        return null;
      });
    }
    module2.exports = { extract: extract2 };
  }
});

// src/providers/ringz.js
var BASE_URL = atob("aHR0cHM6Ly9kYXRhYXBpLnlvbW92aWVzYXBrLmNvbS8=");
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var CF_HEADERS = {
  "cf-access-client-id": atob("ZTNhMTVhZDk5OWRhYjdmMzU5MmYzZDg1NWUwZWM2ZWQuYWNjZXNz"),
  "cf-access-client-secret": atob("OGEyMjUzNmUyZGFjODYzNjlhMmNhYTkxMWQ1NWE4OWExMDk5MzljYzY5ZTY2NDZlNTFiZjVkODUyN2ExZGNhNQ=="),
  "user-agent": "Dart/3.8 (dart:io)"
};
function searchRingZ(title, mediaType) {
  return __async(this, null, function* () {
    const endpoints = [
      "Nwm.json",
      // Movies
      "Nws.json",
      // Web Series
      "lstanime.json"
      // Anime
    ];
    for (const ep of endpoints) {
      try {
        const url = `${BASE_URL}${ep}`;
        const text = yield (yield fetch(url, { headers: CF_HEADERS, skipSizeCheck: true })).text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          continue;
        }
        const movieList = data?.AllMovieDataList || data?.allData || [];
        const seriesList = data?.webSeriesDataList || [];
        const searchIn = mediaType === "movie" ? movieList : [...seriesList, ...movieList];
        const titleLower = title.toLowerCase();
        const found = searchIn.find((item) => {
          const mn = (item?.mn || "").toLowerCase();
          return mn.includes(titleLower) || titleLower.includes(mn.split(" ")[0]);
        });
        if (found)
          return { item: found, endpoint: ep, isSeries: !!data?.webSeriesDataList && seriesList.includes(found) };
      } catch (_) {
      }
    }
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { headers: CF_HEADERS, skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const result = yield searchRingZ(title, mediaType);
      if (!result)
        return [];
      const { item, isSeries } = result;
      const streams = [];
      if (isSeries && season && episode) {
        const sourceKeys = Object.keys(item).filter((k) => !["id", "mn", "IH", "lng", "gn", "cg", "qlty", "hf"].includes(k));
        for (const key of sourceKeys) {
          const value = item[key];
          if (typeof value === "string" && value.startsWith("http")) {
            const epMatch = key.match(/(\d+)/);
            if (epMatch && parseInt(epMatch[1]) === parseInt(episode)) {
              streams.push({
                url: value,
                quality: inferQuality(value, key),
                title: `RingZ [${key}]`,
                subtitles: []
              });
            }
          }
        }
      } else {
        const keys = Object.keys(item);
        for (const key of keys) {
          if (key === "hf")
            continue;
          const value = item[key];
          if (typeof value === "string" && value.startsWith("http")) {
            streams.push({
              url: value,
              quality: inferQuality(value, key),
              title: `RingZ [${key}]`,
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[RingZ]", e);
      return [];
    }
  });
}
function inferQuality(url, key) {
  const check = (s) => {
    if (!s)
      return null;
    const l = s.toLowerCase();
    if (l.includes("2160") || l.includes("4k"))
      return "4K";
    if (l.includes("1080"))
      return "1080p";
    if (l.includes("720"))
      return "720p";
    if (l.includes("480"))
      return "480p";
    if (l.includes("360"))
      return "360p";
    return null;
  };
  return check(url) || check(key) || "Unknown";
}
var { extract } = require_extractors();
function wrappedGetStreams(...args) {
  return __async(this, null, function* () {
    const streams = yield getStreams(...args);
    const finalStreams = [];
    for (const s of streams) {
      if (!s.url)
        continue;
      const ext = yield extract(s.url);
      if (ext) {
        s.url = ext.url;
        if (ext.quality !== "Unknown")
          s.quality = ext.quality;
        finalStreams.push(s);
      } else if (s.url.includes(".mp4") || s.url.includes(".m3u8") || s.url.includes(".mkv") || s.url.includes(".avi") || s.url.startsWith("magnet:") || s.url.includes("/api/file/") || s.url.includes(".cloudflarestorage.com")) {
        finalStreams.push(s);
      }
    }
    return finalStreams;
  });
}
module.exports = { getStreams: wrappedGetStreams };
