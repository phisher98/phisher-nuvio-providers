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

// src/providers/istreamflare.js
var BASE_URL = "https://istreamflare.com";
var API_KEY = "kC7V1f8QRaZyvYnh";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var HEADERS = {
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; Subsystem for Android(TM) Build/TQ3A.230901.001)",
  "x-api-key": API_KEY
};
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      const mediaInfo = yield (yield fetch(tmdbUrl, { skipSizeCheck: true })).json();
      const title = mediaInfo.title || mediaInfo.name;
      if (!title)
        return [];
      const searchUrl = `${BASE_URL}/android/searchContent/${encodeURIComponent(title)}/1`;
      const searchResp = yield fetch(searchUrl, { headers: HEADERS, skipSizeCheck: true });
      const searchText = yield searchResp.text();
      let searchData;
      try {
        searchData = JSON.parse(searchText);
      } catch (e) {
        return [];
      }
      let items = [];
      if (Array.isArray(searchData)) {
        items = searchData;
      } else if (searchData && searchData.data) {
        try {
          items = JSON.parse(searchData.data);
        } catch (e) {
          items = [];
        }
      }
      if (!items || items.length === 0)
        return [];
      const isMovie = mediaType === "movie";
      const targetType = isMovie ? "1" : "2";
      const match = items.find(
        (i) => (i.name || "").toLowerCase().includes(title.toLowerCase()) && (i.content_type === targetType || !i.content_type)
      ) || items[0];
      if (!match)
        return [];
      const contentId = match.id;
      const contentType = match.content_type;
      const streams = [];
      if (isMovie || contentType === "1") {
        const linksUrl = `${BASE_URL}/android/getMoviePlayLinks/${contentId}/0`;
        const linksResp = yield fetch(linksUrl, { headers: HEADERS, skipSizeCheck: true });
        const linksText = yield linksResp.text();
        let links = [];
        try {
          const parsed = JSON.parse(linksText);
          if (Array.isArray(parsed)) {
            links = parsed;
          } else if (parsed && parsed.data) {
            links = JSON.parse(parsed.data);
          }
        } catch (e) {
        }
        for (const link of links) {
          if (!link.url)
            continue;
          streams.push({
            url: link.url,
            quality: mapQuality(link.quality || ""),
            title: `IStreamFlare ${link.name || ""}`.trim(),
            subtitles: []
          });
        }
      } else {
        const seasonsUrl = `${BASE_URL}/android/getSeasons/${contentId}`;
        const seasonsResp = yield fetch(seasonsUrl, { headers: HEADERS, skipSizeCheck: true });
        const seasonsText = yield seasonsResp.text();
        let seasons = [];
        try {
          const parsed = JSON.parse(seasonsText);
          if (Array.isArray(parsed))
            seasons = parsed;
          else if (parsed && parsed.data)
            seasons = JSON.parse(parsed.data);
        } catch (e) {
        }
        for (const s of seasons) {
          const sNumMatch = (s.Session_Name || s.sessionName || "").match(/(\d+)/);
          const sNum = sNumMatch ? parseInt(sNumMatch[1]) : 1;
          if (season && sNum !== parseInt(season))
            continue;
          const epsUrl = `${BASE_URL}/android/getEpisodes/${s.id}/0`;
          const epsResp = yield fetch(epsUrl, { headers: HEADERS, skipSizeCheck: true });
          const epsText = yield epsResp.text();
          let episodes = [];
          try {
            const parsed = JSON.parse(epsText);
            if (Array.isArray(parsed))
              episodes = parsed;
            else if (parsed && parsed.data)
              episodes = JSON.parse(parsed.data);
          } catch (e) {
          }
          for (const ep of episodes) {
            const epNum = parseInt(ep.episoade_order || ep.episoadeOrder || 0);
            if (episode && epNum !== parseInt(episode))
              continue;
            if (!ep.url)
              continue;
            streams.push({
              url: ep.url,
              quality: "Unknown",
              title: `IStreamFlare ${ep.Episoade_Name || ep.episoadeName || `E${epNum}`}`.trim(),
              subtitles: []
            });
          }
        }
      }
      return streams;
    } catch (e) {
      console.error("[IStreamFlare]", e);
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
  if (u.includes("360"))
    return "360p";
  return "Unknown";
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
